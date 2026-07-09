"""Evidence export helpers for record review workflows."""
import hashlib
import hmac
import json
import os
import re
import shutil
import subprocess
import tempfile
from datetime import datetime, timedelta, timezone
from urllib.parse import quote, unquote, urlparse


_EXPORT_JOBS = {}
_EXPORT_CONTENT = {}
_EXPORT_AUDIT = {}
_STORE_ENV = 'YFEIEYE_RECORD_EXPORT_STORE_DIR'
_SIGNING_SECRET_ENV = 'YFEIEYE_RECORD_EXPORT_HMAC_SECRET'
_SIGNING_KEY_ID_ENV = 'YFEIEYE_RECORD_EXPORT_KEY_ID'
_SIGNING_KEYS_ENV = 'YFEIEYE_RECORD_EXPORT_HMAC_KEYS'
_SIGNING_ACTIVE_KEY_ID_ENV = 'YFEIEYE_RECORD_EXPORT_ACTIVE_KEY_ID'
_STORE_TYPE_ENV = 'YFEIEYE_RECORD_EXPORT_STORAGE_TYPE'
_STORE_URI_ENV = 'YFEIEYE_RECORD_EXPORT_STORAGE_URI'


def create_record_export(payload: dict, record_resolver=None, async_worker=False, worker_runner=None) -> dict:
    """Create a lightweight export task from an existing record URI.

    The review workbench already resolves the evidence window before calling
    VIDEO. This function makes that evidence addressable through a stable export
    task contract and leaves room for a later ffmpeg clipping worker.
    """
    payload = payload or {}
    async_worker = async_worker or _as_bool(payload.get('async_worker') or payload.get('asyncWorker'))
    result = _build_record_export(payload, record_resolver)
    export_id = result['export_id']
    if not async_worker:
        now = datetime.now(timezone.utc).isoformat()
        job = dict(result)
        job.setdefault('status_url', f'/video/record/export/{export_id}')
        job.setdefault('created_at', now)
        job.setdefault('finished_at', now)
        _EXPORT_JOBS[export_id] = job
        _persist_job(job)
        _append_export_audit(export_id, 'ready', None, None, {
            'source': job.get('source'),
            'download_url': job.get('download_url'),
        })
        _persist_manifest(export_id)
        return _public_job(job)

    job = dict(result)
    job.update({
        'status': 'pending',
        'status_url': f'/video/record/export/{export_id}',
        'download_url': None,
        'file_hash': None,
        'retry_count': 0,
        'last_error': None,
        'created_at': datetime.now(timezone.utc).isoformat(),
        '_worker_runner': worker_runner,
    })
    _EXPORT_JOBS[export_id] = job
    _persist_job(job)
    _append_export_audit(export_id, 'created', None, None, {'status': 'pending'})
    _persist_manifest(export_id)
    return _public_job(job)


def poll_record_export(export_id: str) -> dict:
    """Run or inspect an async record export job."""
    export_id = _text(export_id)
    job = _get_export_job(export_id)
    if not job:
        raise ValueError(f'export job not found: {export_id}')
    if job.get('status') in ('ready', 'failed'):
        return _public_job(job)

    job['status'] = 'running'
    job['started_at'] = datetime.now(timezone.utc).isoformat()
    job['retry_count'] = int(job.get('retry_count') or 0) + 1
    job['last_error'] = None
    _persist_job(job)
    _append_export_audit(export_id, 'running', None, None, {'attempt': job['retry_count']})
    runner = job.get('_worker_runner') or _default_export_worker
    try:
        result = runner(_public_job(job)) or {}
        content = _content_bytes(result.get('content'))
        if content is None:
            content = _default_export_content(job, result)
        _EXPORT_CONTENT[export_id] = content
        _persist_content(export_id, content)
        job['status'] = 'ready'
        job['download_url'] = _text(result.get('download_url')) or f'/video/record/export/{export_id}/download'
        job['file_hash'] = _text(result.get('file_hash')) or 'sha256:' + hashlib.sha256(content).hexdigest()
        job['message'] = _text(result.get('message')) or 'record evidence export ready'
        job['finished_at'] = datetime.now(timezone.utc).isoformat()
        if isinstance(result.get('record_segments'), list):
            job['record_segments'] = result['record_segments']
        job['record_segments'] = _manifest_record_segments(job)
        _persist_job(job)
        _append_export_audit(export_id, 'ready', None, None, {
            'attempt': job['retry_count'],
            'file_hash': job['file_hash'],
        })
    except Exception as exc:
        job['status'] = 'failed'
        job['message'] = str(exc)
        job['last_error'] = str(exc)
        job['finished_at'] = datetime.now(timezone.utc).isoformat()
        _persist_job(job)
        _append_export_audit(export_id, 'failed', None, None, {
            'attempt': job['retry_count'],
            'last_error': job['last_error'],
        })
    return _public_job(job)


def retry_record_export(export_id: str) -> dict:
    """Re-queue a failed async export job with the original worker."""
    export_id = _text(export_id)
    job = _get_export_job(export_id)
    if not job:
        raise ValueError(f'export job not found: {export_id}')
    if job.get('status') != 'failed':
        return _public_job(job)
    job['status'] = 'pending'
    job['message'] = 'retry queued'
    job['download_url'] = None
    job['file_hash'] = None
    job['finished_at'] = None
    _EXPORT_CONTENT.pop(export_id, None)
    _delete_content(export_id)
    _persist_job(job)
    _append_export_audit(export_id, 'retry_queued', None, None, {'retry_count': job.get('retry_count')})
    return _public_job(job)


def get_record_export_audit(export_id: str) -> list:
    """Return the local audit trail for an export job."""
    export_id = _text(export_id)
    if not _get_export_job(export_id):
        raise ValueError(f'export job not found: {export_id}')
    return list(_get_export_audit(export_id))


def get_record_export_manifest(export_id: str) -> dict:
    """Return the persistent evidence manifest for an export job."""
    export_id = _text(export_id)
    if not _get_export_job(export_id):
        raise ValueError(f'export job not found: {export_id}')
    manifest = _read_json(_manifest_path(export_id), None)
    if isinstance(manifest, dict):
        return manifest
    return _persist_manifest(export_id)


def download_record_export(export_id: str, operator_user_id=None, reason=None) -> dict:
    """Return generated export bytes for the download route."""
    export_id = _text(export_id)
    job = _get_export_job(export_id)
    if not job:
        raise ValueError(f'export job not found: {export_id}')
    if job.get('status') != 'ready':
        job = poll_record_export(export_id)
    content = _get_export_content(export_id)
    if content is None:
        raise ValueError(f'export content not found: {export_id}')
    file_format = _text(job.get('format')) or 'mp4'
    _append_export_audit(export_id, 'downloaded', operator_user_id, reason, {
        'file_hash': job.get('file_hash'),
    })
    _persist_manifest(export_id)
    return {
        'export_id': export_id,
        'filename': f'{export_id}.{file_format}',
        'content': content,
        'mimetype': 'video/mp4' if file_format == 'mp4' else 'application/octet-stream',
        'file_hash': job.get('file_hash'),
    }


def _build_record_export(payload: dict, record_resolver=None) -> dict:
    payload = payload or {}
    record_uri = _text(payload.get('record_uri') or payload.get('recordUri'))
    source = 'existing_record_uri'
    resolved = {}
    if not record_uri:
        resolver = record_resolver or resolve_record_uri_from_window
        resolved = resolver(payload) or {}
        record_uri = _text(
            resolved.get('record_uri')
            or resolved.get('recordUri')
            or resolved.get('download_url')
            or resolved.get('downloadUrl')
            or resolved.get('url')
        )
        source = _text(resolved.get('source')) or 'record_window'
    if not record_uri:
        raise ValueError('record_uri must not be blank or resolvable from device time window')

    review_case_id = _text(payload.get('review_case_id') or payload.get('reviewCaseId'))
    review_item_id = _text(payload.get('review_item_id') or payload.get('reviewItemId'))
    review_item_ids = _text_list(payload.get('review_item_ids') or payload.get('reviewItemIds'))
    if not review_item_ids and review_item_id:
        review_item_ids = [review_item_id]
    event_ids = _text_list(payload.get('event_ids') or payload.get('eventIds') or payload.get('bound_event_ids') or payload.get('boundEventIds'))
    snapshot_uris = _text_list(payload.get('snapshot_uris') or payload.get('snapshotUris') or payload.get('snapshots'))
    export_id = _build_export_id(review_case_id, review_item_id or (review_item_ids[0] if review_item_ids else ''), record_uri)
    result = {
        'export_id': export_id,
        'download_url': _download_url(record_uri),
        'status': 'ready',
        'message': 'using existing record evidence' if source == 'existing_record_uri' else 'resolved record evidence from time window',
        'record_uri': record_uri,
        'source': source,
        'review_case_id': review_case_id,
        'review_item_id': review_item_id,
        'review_item_ids': review_item_ids,
        'event_ids': event_ids,
        'snapshot_uris': snapshot_uris,
        'device_id': _text(payload.get('device_id') or payload.get('deviceId')),
        'camera_id': _text(payload.get('camera_id') or payload.get('cameraId')),
        'source_alert_id': _text(payload.get('source_alert_id') or payload.get('sourceAlertId')),
        'start_time': _text(payload.get('start_time') or payload.get('startTime')),
        'end_time': _text(payload.get('end_time') or payload.get('endTime')),
        'format': _text(payload.get('format')) or 'mp4',
        'operator_user_id': _text(payload.get('operator_user_id') or payload.get('operatorUserId') or payload.get('generated_by') or payload.get('generatedBy')),
        'approved_by': _text(payload.get('approved_by') or payload.get('approvedBy') or payload.get('approver_user_id') or payload.get('approverUserId')),
        'approved_at': _text(payload.get('approved_at') or payload.get('approvedAt')),
        'approval_note': _text(payload.get('approval_note') or payload.get('approvalNote')),
        'expires_at': _text(payload.get('expires_at') or payload.get('expiresAt')),
        'retention_days': _text(payload.get('retention_days') or payload.get('retentionDays')),
        'storage_type': _text(payload.get('storage_type') or payload.get('storageType')),
        'storage_root': _text(payload.get('storage_root') or payload.get('storageRoot') or payload.get('storage_uri') or payload.get('storageUri')),
    }
    record_uris = payload.get('record_uris') or payload.get('recordUris')
    if isinstance(record_uris, (list, tuple)) and record_uris:
        result['record_uris'] = [_text(uri) for uri in record_uris if _text(uri)]
    record_segments = payload.get('record_segments') or payload.get('recordSegments')
    if isinstance(record_segments, (list, tuple)) and record_segments:
        result['record_segments'] = [dict(segment) for segment in record_segments if isinstance(segment, dict)]
    for key in ('space_id', 'object_name', 'segment_start_time', 'segment_end_time', 'duration'):
        value = resolved.get(key)
        if value is not None and value != '':
            result[key] = value
    return result


def _default_export_worker(job: dict) -> dict:
    ffmpeg_result = _run_ffmpeg_export(job)
    if ffmpeg_result:
        return ffmpeg_result
    return {
        'content': _default_export_content(job, {}),
        'download_url': f'/video/record/export/{job["export_id"]}/download',
        'message': 'record evidence export worker prepared clip package',
    }


def _run_ffmpeg_export(job: dict):
    ffmpeg = shutil.which('ffmpeg')
    if not ffmpeg:
        return None

    file_format = _text(job.get('format')) or 'mp4'
    with tempfile.TemporaryDirectory(prefix='yfeieye-record-export-') as workdir:
        sources = _materialize_record_sources(job, workdir)
        source_paths = [source['path'] for source in sources]
        if not source_paths:
            return None
        output_path = os.path.join(workdir, f'{job["export_id"]}.{file_format}')
        if len(source_paths) == 1:
            command = _single_clip_command(ffmpeg, source_paths[0], output_path, job)
        else:
            concat_path = os.path.join(workdir, 'concat.txt')
            with open(concat_path, 'w', encoding='utf-8') as concat_file:
                for source_path in source_paths:
                    concat_file.write(f"file '{_ffmpeg_concat_path(source_path)}'\n")
            command = [ffmpeg, '-y', '-f', 'concat', '-safe', '0', '-i', concat_path, '-c', 'copy', output_path]
        completed = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=120)
        if completed.returncode != 0 or not os.path.exists(output_path):
            return None
        command_hash = _sha256_text(_canonical_json(command))
        record_segments = _materialized_manifest_segments(job, sources, command_hash)
        with open(output_path, 'rb') as output_file:
            content = output_file.read()
    return {
        'content': content,
        'download_url': f'/video/record/export/{job["export_id"]}/download',
        'message': 'ffmpeg clipped and stitched evidence',
        'record_segments': record_segments,
    }


def _single_clip_command(ffmpeg: str, source_path: str, output_path: str, job: dict) -> list:
    command = [ffmpeg, '-y']
    offset = _clip_offset_seconds(job)
    duration = _clip_duration_seconds(job)
    if offset is not None and offset > 0:
        command.extend(['-ss', f'{offset:.3f}'])
    if duration is not None and duration > 0:
        command.extend(['-t', f'{duration:.3f}'])
    command.extend(['-i', source_path, '-c', 'copy', output_path])
    return command


def _record_uris(job: dict) -> list:
    values = job.get('record_uris') or job.get('recordUris')
    if isinstance(values, (list, tuple)):
        return [_text(value) for value in values if _text(value)]
    record_uri = _text(job.get('record_uri') or job.get('recordUri'))
    return [record_uri] if record_uri else []


def _materialize_record_sources(job: dict, workdir: str) -> list:
    sources = []
    for index, spec in enumerate(_record_source_specs(job)):
        uri = _text(spec.get('record_uri'))
        local_path = _local_file_path(uri)
        if local_path and os.path.exists(local_path):
            sources.append({
                **spec,
                'path': local_path,
                'source_hash': _sha256_file(local_path),
            })
            continue

        space_id, object_name = _record_object_identity(spec, uri)
        if not space_id or not object_name:
            continue
        from app.services.record_video_service import get_record_video
        content, _content_type, filename = get_record_video(int(space_id), object_name)
        extension = os.path.splitext(_text(filename) or object_name)[1] or '.bin'
        materialized_path = os.path.join(workdir, f'source-{index:03d}{extension}')
        with open(materialized_path, 'wb') as source_file:
            source_file.write(_content_bytes(content) or b'')
        sources.append({
            **spec,
            'space_id': int(space_id),
            'object_name': object_name,
            'path': materialized_path,
            'source_hash': _sha256_file(materialized_path),
        })
    return sources


def _record_source_specs(job: dict) -> list:
    explicit = job.get('record_segments') or job.get('recordSegments')
    if isinstance(explicit, (list, tuple)) and explicit:
        specs = []
        for index, raw in enumerate(explicit):
            if not isinstance(raw, dict):
                continue
            specs.append({
                'index': raw.get('index', index),
                'record_uri': _text(raw.get('record_uri') or raw.get('recordUri') or raw.get('uri')),
                'space_id': raw.get('space_id') or raw.get('spaceId') or job.get('space_id'),
                'object_name': _text(raw.get('object_name') or raw.get('objectName') or job.get('object_name')),
                'segment_start_time': _text(raw.get('segment_start_time') or raw.get('segmentStartTime') or job.get('segment_start_time')),
                'segment_end_time': _text(raw.get('segment_end_time') or raw.get('segmentEndTime') or job.get('segment_end_time')),
                'clip_start_time': _text(raw.get('clip_start_time') or raw.get('clipStartTime') or job.get('start_time')),
                'clip_end_time': _text(raw.get('clip_end_time') or raw.get('clipEndTime') or job.get('end_time')),
            })
        return [spec for spec in specs if spec.get('record_uri')]
    return [{
        'index': index,
        'record_uri': uri,
        'space_id': job.get('space_id'),
        'object_name': _text(job.get('object_name')),
        'segment_start_time': _text(job.get('segment_start_time')),
        'segment_end_time': _text(job.get('segment_end_time')),
        'clip_start_time': _text(job.get('start_time')),
        'clip_end_time': _text(job.get('end_time')),
    } for index, uri in enumerate(_record_uris(job))]


def _record_object_identity(spec: dict, uri: str):
    space_id = spec.get('space_id')
    object_name = _text(spec.get('object_name'))
    if space_id and object_name:
        return space_id, object_name
    path = unquote(urlparse(uri).path)
    matched = re.search(r'/video/record/space/(\d+)/video/(.+)$', path)
    if not matched:
        return space_id, object_name
    return space_id or int(matched.group(1)), object_name or matched.group(2)


def _materialized_manifest_segments(job: dict, sources: list, command_hash: str) -> list:
    return [{
        'index': source.get('index', index),
        'recordUri': source.get('record_uri'),
        'sourceHash': source.get('source_hash'),
        'segmentStartTime': source.get('segment_start_time') or _text(job.get('segment_start_time')),
        'segmentEndTime': source.get('segment_end_time') or _text(job.get('segment_end_time')),
        'clipStartTime': source.get('clip_start_time') or _text(job.get('start_time')),
        'clipEndTime': source.get('clip_end_time') or _text(job.get('end_time')),
        'ffmpegCommandHash': command_hash,
        'objectName': source.get('object_name') or _text(job.get('object_name')),
        'spaceId': _text(source.get('space_id') or job.get('space_id')),
    } for index, source in enumerate(sources)]


def _local_file_path(uri: str) -> str:
    uri = _text(uri)
    if uri.startswith('file://'):
        return uri[7:]
    if os.path.isabs(uri):
        return uri
    return ''


def _ffmpeg_concat_path(path: str) -> str:
    return path.replace('\\', '/').replace("'", "'\\''")


def _clip_offset_seconds(job: dict):
    start_time = _parse_time(job.get('start_time') or job.get('startTime'))
    segment_start = _parse_time(job.get('segment_start_time') or job.get('segmentStartTime'))
    if not start_time or not segment_start:
        return None
    return max(0, (start_time - segment_start).total_seconds())


def _clip_duration_seconds(job: dict):
    start_time = _parse_time(job.get('start_time') or job.get('startTime'))
    end_time = _parse_time(job.get('end_time') or job.get('endTime'))
    if not start_time or not end_time or end_time <= start_time:
        return None
    return (end_time - start_time).total_seconds()


def _default_export_content(job: dict, result: dict) -> bytes:
    payload = {
        'export_id': job.get('export_id'),
        'record_uri': job.get('record_uri') or job.get('download_url'),
        'review_case_id': job.get('review_case_id'),
        'review_item_id': job.get('review_item_id'),
        'device_id': job.get('device_id'),
        'camera_id': job.get('camera_id'),
        'source_alert_id': job.get('source_alert_id'),
        'start_time': job.get('start_time'),
        'end_time': job.get('end_time'),
        'format': job.get('format') or 'mp4',
        'worker_message': result.get('message') if result else None,
    }
    lines = [f'{key}={value}' for key, value in payload.items() if value not in (None, '')]
    return ('\n'.join(lines) + '\n').encode('utf-8')


def _content_bytes(content):
    if content is None:
        return None
    if isinstance(content, bytes):
        return content
    if isinstance(content, bytearray):
        return bytes(content)
    return str(content).encode('utf-8')


def _public_job(job: dict) -> dict:
    public = {key: value for key, value in job.items() if not str(key).startswith('_')}
    export_id = _text(public.get('export_id'))
    if export_id:
        public.setdefault('manifest_url', f'/video/record/export/{export_id}/manifest')
    return public


def _append_export_audit(export_id: str, action: str, operator_user_id=None, reason=None, extra=None):
    existing = _get_export_audit(export_id)
    previous_hash = existing[-1].get('entryHash') if existing else 'GENESIS'
    entry = {
        'export_id': export_id,
        'action': action,
        'operator_user_id': _text(operator_user_id) or None,
        'reason': _text(reason) or None,
        'happened_at': datetime.now(timezone.utc).isoformat(),
        'previousHash': previous_hash,
    }
    if extra:
        entry.update({key: value for key, value in extra.items() if value is not None})
    entry['entryHash'] = _audit_entry_hash(entry)
    existing.append(entry)
    _EXPORT_AUDIT[export_id] = existing
    _write_json(_audit_path(export_id), existing)
    _persist_manifest(export_id)
    return entry


def _get_export_job(export_id: str):
    job = _EXPORT_JOBS.get(export_id)
    if job:
        return job
    stored = _read_json(_job_path(export_id), None)
    if not isinstance(stored, dict):
        return None
    _EXPORT_JOBS[export_id] = stored
    return stored


def _persist_job(job: dict):
    if not job:
        return
    export_id = _text(job.get('export_id'))
    if not export_id:
        return
    _write_json(_job_path(export_id), _public_job(job))


def _get_export_content(export_id: str):
    content = _EXPORT_CONTENT.get(export_id)
    if content is not None:
        return content
    path = _content_path(export_id)
    if not os.path.exists(path):
        return None
    with open(path, 'rb') as content_file:
        content = content_file.read()
    _EXPORT_CONTENT[export_id] = content
    return content


def _persist_content(export_id: str, content: bytes):
    path = _content_path(export_id)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'wb') as content_file:
        content_file.write(content)


def _delete_content(export_id: str):
    path = _content_path(export_id)
    if os.path.exists(path):
        os.remove(path)


def _get_export_audit(export_id: str) -> list:
    if export_id in _EXPORT_AUDIT:
        stored = _ensure_audit_hash_chain(_EXPORT_AUDIT[export_id])
        _EXPORT_AUDIT[export_id] = list(stored)
        return list(stored)
    stored = _read_json(_audit_path(export_id), [])
    if not isinstance(stored, list):
        stored = []
    stored = _ensure_audit_hash_chain(stored)
    _EXPORT_AUDIT[export_id] = list(stored)
    return list(stored)


def _persist_manifest(export_id: str) -> dict:
    job = _EXPORT_JOBS.get(export_id) or _read_json(_job_path(export_id), {})
    if not isinstance(job, dict) or not job:
        return {}
    audit = _get_export_audit(export_id)
    manifest = _build_manifest(job, audit)
    _write_json(_manifest_path(export_id), manifest)
    return manifest


def _build_manifest(job: dict, audit: list) -> dict:
    export_id = _text(job.get('export_id'))
    audit = _ensure_audit_hash_chain(audit)
    download_records = []
    for entry in audit:
        if entry.get('action') != 'downloaded':
            continue
        download_records.append({
            'operatorUserId': _text(entry.get('operator_user_id')) or None,
            'reason': _text(entry.get('reason')) or None,
            'downloadedAt': entry.get('happened_at'),
            'fileHash': entry.get('file_hash') or job.get('file_hash'),
        })
    expires_at = _manifest_expires_at(job)
    manifest = {
        'manifestVersion': 2,
        'schema': 'yfeieye.record-export.manifest.v2',
        'exportId': export_id,
        'reviewCaseId': _text(job.get('review_case_id')),
        'reviewItemIds': _text_list(job.get('review_item_ids') or job.get('review_item_id')),
        'eventIds': _text_list(job.get('event_ids')),
        'eventReferences': _manifest_event_references(job),
        'deviceId': _text(job.get('device_id')),
        'cameraId': _text(job.get('camera_id')),
        'sourceAlertId': _text(job.get('source_alert_id')),
        'timeWindow': {
            'startTime': _text(job.get('start_time')),
            'endTime': _text(job.get('end_time')),
        },
        'recordSegments': _manifest_record_segments(job),
        'snapshots': _text_list(job.get('snapshot_uris')),
        'fileHash': _text(job.get('file_hash')),
        'packageChecksum': _text(job.get('file_hash')),
        'files': _manifest_files(export_id, job),
        'status': _text(job.get('status')),
        'generatedBy': _text(job.get('operator_user_id')) or None,
        'generatedAt': job.get('created_at') or job.get('finished_at'),
        'approval': _manifest_approval(job),
        'expiresAt': expires_at,
        'retentionPolicy': {
            'retentionDays': _text(job.get('retention_days')) or None,
            'expiresAt': expires_at,
        },
        'storageLifecycle': _manifest_storage_lifecycle(export_id, job, expires_at),
        'finishedAt': job.get('finished_at'),
        'downloadRecords': download_records,
        'immutableAudit': {
            'algorithm': 'sha256(previousHash + canonicalEntry)',
            'entryCount': len(audit),
            'headHash': audit[-1].get('entryHash') if audit else None,
        },
        'audit': audit,
    }
    manifest_hash = _expected_manifest_hash(manifest)
    manifest['manifestHash'] = manifest_hash
    manifest['signature'] = _manifest_signature(manifest, manifest_hash)
    return manifest


def _expected_manifest_hash(manifest: dict) -> str:
    hashable = dict(manifest or {})
    hashable.pop('manifestHash', None)
    hashable.pop('signature', None)
    return _sha256_text(_canonical_json(hashable))


def _manifest_signature(manifest: dict, manifest_hash: str) -> dict:
    signing_key = _select_manifest_signing_key()
    secret = signing_key.get('secret') or ''
    algorithm = 'hmac-sha256' if secret else 'sha256'
    signature = {
        'algorithm': algorithm,
        'algorithmVersion': 'v2' if signing_key.get('keyring') else 'v1',
        'signatureVersion': 'v2' if signing_key.get('keyring') else 'v1',
        'keyId': signing_key.get('keyId') or ('local-hmac' if secret else 'local-sha256'),
        'signer': 'yFeiEye-video-evidence',
        'signedAt': manifest.get('generatedAt') or manifest.get('finishedAt'),
        'value': _expected_manifest_signature(manifest, manifest_hash, secret),
    }
    if signing_key.get('keyring'):
        signature['keyRotation'] = {
            'activeKeyId': signing_key.get('keyId'),
            'acceptedPreviousKeyIds': signing_key.get('previousKeyIds') or [],
        }
    return signature


def _expected_manifest_signature(manifest: dict, manifest_hash: str, secret=None) -> str:
    approval = manifest.get('approval') if isinstance(manifest.get('approval'), dict) else {}
    payload = [
        manifest.get('packageChecksum'),
        manifest_hash,
        manifest.get('generatedBy'),
        approval.get('approvedBy'),
    ]
    signing_secret = _text(os.environ.get(_SIGNING_SECRET_ENV)) if secret is None else _text(secret)
    if signing_secret:
        digest = hmac.new(signing_secret.encode('utf-8'), _canonical_json(payload).encode('utf-8'), hashlib.sha256).hexdigest()
        return 'hmac-sha256:' + digest
    return _sha256_text(_canonical_json(payload))


def _select_manifest_signing_key() -> dict:
    keyring, configured_active_key_id = _hmac_keyring_config()
    if keyring:
        active_key_id = (
            _text(os.environ.get(_SIGNING_ACTIVE_KEY_ID_ENV))
            or _text(os.environ.get(_SIGNING_KEY_ID_ENV))
            or configured_active_key_id
        )
        if active_key_id not in keyring:
            active_key_id = sorted(keyring.keys())[0]
        return {
            'keyId': active_key_id,
            'secret': keyring[active_key_id],
            'keyring': True,
            'previousKeyIds': sorted(key_id for key_id in keyring.keys() if key_id != active_key_id),
        }
    secret = _text(os.environ.get(_SIGNING_SECRET_ENV))
    return {
        'keyId': _text(os.environ.get(_SIGNING_KEY_ID_ENV)) or ('local-hmac' if secret else 'local-sha256'),
        'secret': secret,
        'keyring': False,
        'previousKeyIds': [],
    }


def _hmac_keyring_config() -> tuple:
    raw = _text(os.environ.get(_SIGNING_KEYS_ENV))
    if not raw:
        return {}, ''
    try:
        parsed = json.loads(raw)
    except (TypeError, ValueError):
        return {}, ''
    if not isinstance(parsed, dict):
        return {}, ''
    configured_active_key_id = _text(parsed.get('activeKeyId') or parsed.get('active_key_id'))
    raw_keys = parsed.get('keys') if isinstance(parsed.get('keys'), dict) else parsed
    reserved = {'activeKeyId', 'active_key_id', 'keys'}
    keyring = {}
    for raw_key_id, raw_secret in raw_keys.items():
        key_id = _text(raw_key_id)
        secret = _text(raw_secret)
        if key_id and key_id not in reserved and secret:
            keyring[key_id] = secret
    return keyring, configured_active_key_id


def _manifest_event_references(job: dict) -> list:
    return [{
        'eventId': event_id,
        'relation': 'evidence_for_event',
    } for event_id in _text_list(job.get('event_ids'))]


def _manifest_approval(job: dict) -> dict:
    return {
        'approvedBy': _text(job.get('approved_by')) or None,
        'approvedAt': _text(job.get('approved_at')) or None,
        'approvalNote': _text(job.get('approval_note')) or None,
    }


def _manifest_expires_at(job: dict):
    explicit = _text(job.get('expires_at'))
    if explicit:
        return explicit
    retention_days = _positive_int(job.get('retention_days'))
    if not retention_days:
        return None
    basis = _parse_time(job.get('created_at') or job.get('finished_at')) or datetime.now()
    return (basis + timedelta(days=retention_days)).isoformat()


def _manifest_files(export_id: str, job: dict) -> list:
    files = []
    expires_at = _manifest_expires_at(job)
    content = _get_export_content(export_id)
    if content is not None:
        path = _content_path(export_id)
        files.append({
            'name': 'content.bin',
            'role': 'export_package',
            'hash': _sha256_bytes(content),
            'sizeBytes': len(content),
            'format': _text(job.get('format')) or 'mp4',
            'path': path,
            'storage': _artifact_storage_reference(job, export_id, 'content.bin', 'export_package', path, expires_at),
        })
    for name, path, role in (
            ('job.json', _job_path(export_id), 'export_job'),
            ('audit.json', _audit_path(export_id), 'audit_log')):
        if not os.path.exists(path):
            continue
        files.append({
            'name': name,
            'role': role,
            'hash': _sha256_file(path),
            'sizeBytes': os.path.getsize(path),
            'path': path,
            'storage': _artifact_storage_reference(job, export_id, name, role, path, expires_at),
        })
    return files


def _manifest_storage_lifecycle(export_id: str, job: dict, expires_at: str) -> dict:
    return {
        'storageType': _storage_type(job),
        'storeRoot': _storage_root(job),
        'status': _storage_lifecycle_status(expires_at),
        'expiresAt': expires_at,
        'retentionDays': _text(job.get('retention_days')) or None,
        'cleanupPolicy': {
            'scope': 'record_export_artifacts',
            'deleteAfter': expires_at,
        },
        'artifactKeys': {
            'exportPackage': _storage_object_key(export_id, 'content.bin'),
            'job': _storage_object_key(export_id, 'job.json'),
            'audit': _storage_object_key(export_id, 'audit.json'),
            'manifest': _storage_object_key(export_id, 'manifest.json'),
        },
    }


def _artifact_storage_reference(job: dict, export_id: str, name: str, role: str, path: str, expires_at: str) -> dict:
    object_key = _storage_object_key(export_id, name)
    reference = {
        'storageType': _storage_type(job),
        'artifactRole': role,
        'objectKey': object_key,
        'expiresAt': expires_at,
        'lifecycleStatus': _storage_lifecycle_status(expires_at),
    }
    root = _storage_root(job)
    if root:
        reference['uri'] = _join_storage_uri(root, object_key)
    if path:
        reference['path'] = path
    return reference


def _storage_type(job: dict) -> str:
    return _text(job.get('storage_type') or job.get('storageType') or os.environ.get(_STORE_TYPE_ENV)) or 'local_filesystem'


def _storage_root(job: dict) -> str:
    return _text(job.get('storage_root') or job.get('storageRoot') or os.environ.get(_STORE_URI_ENV)) or _store_root()


def _storage_object_key(export_id: str, name: str) -> str:
    return f'{export_id}/{name}'


def _storage_lifecycle_status(expires_at: str) -> str:
    expires = _parse_time(expires_at)
    if expires and expires <= datetime.now():
        return 'expired'
    return 'retained'


def _join_storage_uri(root: str, object_key: str) -> str:
    root = _text(root).rstrip('/\\')
    if not root:
        return object_key
    return root.replace('\\', '/') + '/' + object_key


def _ensure_audit_hash_chain(entries: list) -> list:
    chained = []
    previous_hash = 'GENESIS'
    for entry in entries or []:
        if not isinstance(entry, dict):
            continue
        current = dict(entry)
        current['previousHash'] = _text(current.get('previousHash')) or previous_hash
        current['entryHash'] = _text(current.get('entryHash')) or _audit_entry_hash(current)
        previous_hash = current['entryHash']
        chained.append(current)
    return chained


def _audit_entry_hash(entry: dict) -> str:
    payload = {key: value for key, value in entry.items() if key != 'entryHash'}
    return _sha256_text(_canonical_json(payload))


def _canonical_json(value) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':'))


def _sha256_text(value: str) -> str:
    return 'sha256:' + hashlib.sha256(value.encode('utf-8')).hexdigest()


def _sha256_bytes(content: bytes) -> str:
    return 'sha256:' + hashlib.sha256(content).hexdigest()


def _sha256_file(path: str) -> str:
    digest = hashlib.sha256()
    with open(path, 'rb') as file_obj:
        for chunk in iter(lambda: file_obj.read(1024 * 1024), b''):
            digest.update(chunk)
    return 'sha256:' + digest.hexdigest()


def _manifest_record_segments(job: dict) -> list:
    explicit_segments = job.get('record_segments') or job.get('recordSegments')
    if isinstance(explicit_segments, (list, tuple)) and explicit_segments:
        segments = []
        for index, raw_segment in enumerate(explicit_segments):
            if not isinstance(raw_segment, dict):
                continue
            uri = _text(raw_segment.get('recordUri') or raw_segment.get('record_uri') or raw_segment.get('uri'))
            segments.append({
                'index': index,
                'recordUri': uri,
                'sourceHash': _text(raw_segment.get('sourceHash') or raw_segment.get('source_hash')) or _source_file_hash(uri),
                'segmentStartTime': _text(raw_segment.get('segmentStartTime') or raw_segment.get('segment_start_time') or job.get('segment_start_time')),
                'segmentEndTime': _text(raw_segment.get('segmentEndTime') or raw_segment.get('segment_end_time') or job.get('segment_end_time')),
                'clipStartTime': _text(raw_segment.get('clipStartTime') or raw_segment.get('clip_start_time') or job.get('start_time')),
                'clipEndTime': _text(raw_segment.get('clipEndTime') or raw_segment.get('clip_end_time') or job.get('end_time')),
                'ffmpegCommandHash': _text(raw_segment.get('ffmpegCommandHash') or raw_segment.get('ffmpeg_command_hash')),
                'objectName': _text(raw_segment.get('objectName') or raw_segment.get('object_name') or job.get('object_name')),
                'spaceId': _text(raw_segment.get('spaceId') or raw_segment.get('space_id') or job.get('space_id')),
            })
        return [segment for segment in segments if segment.get('recordUri')]
    segments = []
    record_uris = _record_uris(job)
    for index, uri in enumerate(record_uris):
        segments.append({
            'index': index,
            'recordUri': uri,
            'sourceHash': _source_file_hash(uri),
            'segmentStartTime': _text(job.get('segment_start_time')),
            'segmentEndTime': _text(job.get('segment_end_time')),
            'clipStartTime': _text(job.get('start_time')),
            'clipEndTime': _text(job.get('end_time')),
            'ffmpegCommandHash': _ffmpeg_command_hash(job),
            'objectName': _text(job.get('object_name')),
            'spaceId': _text(job.get('space_id')),
        })
    return segments


def _source_file_hash(uri: str) -> str:
    path = _local_file_path(uri)
    if path and os.path.exists(path):
        return _sha256_file(path)
    return ''


def _ffmpeg_command_hash(job: dict) -> str:
    payload = {
        'recordUris': _record_uris(job),
        'startTime': _text(job.get('start_time')),
        'endTime': _text(job.get('end_time')),
        'format': _text(job.get('format')) or 'mp4',
    }
    return _sha256_text(_canonical_json(payload))


def _store_root() -> str:
    configured = _text(os.environ.get(_STORE_ENV))
    return configured or os.path.join(tempfile.gettempdir(), 'yfeieye-record-exports')


def _export_dir(export_id: str) -> str:
    safe_id = ''.join(ch if ch.isalnum() or ch in ('-', '_') else '_' for ch in _text(export_id))
    return os.path.join(_store_root(), safe_id)


def _job_path(export_id: str) -> str:
    return os.path.join(_export_dir(export_id), 'job.json')


def _audit_path(export_id: str) -> str:
    return os.path.join(_export_dir(export_id), 'audit.json')


def _manifest_path(export_id: str) -> str:
    return os.path.join(_export_dir(export_id), 'manifest.json')


def _content_path(export_id: str) -> str:
    return os.path.join(_export_dir(export_id), 'content.bin')


def _write_json(path: str, value):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as json_file:
        json.dump(value, json_file, ensure_ascii=False, indent=2, sort_keys=True)


def _read_json(path: str, default):
    if not os.path.exists(path):
        return default
    try:
        with open(path, 'r', encoding='utf-8') as json_file:
            return json.load(json_file)
    except (OSError, ValueError, TypeError):
        return default


def resolve_record_uri_from_window(payload: dict) -> dict:
    """Resolve a record URI from VIDEO metadata when DEVICE has only a time window."""
    payload = payload or {}
    resolved = _resolve_from_alert_segment(payload)
    if resolved:
        return resolved

    device_id = _text(payload.get('device_id') or payload.get('deviceId') or payload.get('camera_id') or payload.get('cameraId'))
    window_start, window_end = _payload_window(payload)
    if not device_id or not window_start:
        return {}

    try:
        from models import RecordFile, RecordSpace

        space = RecordSpace.query.filter_by(device_id=device_id).first()
        if not space:
            return {}
        window_end = window_end or window_start
        lookback_seconds = max(3600, int(abs((window_end - window_start).total_seconds())) + 300)
        records = (
            RecordFile.query.filter(
                RecordFile.space_id == space.id,
                RecordFile.device_id == device_id,
                RecordFile.event_time >= window_start - timedelta(seconds=lookback_seconds),
                RecordFile.event_time <= window_end + timedelta(seconds=300),
            )
            .order_by(RecordFile.event_time.asc())
            .all()
        )
        record = _select_record_for_window(records, window_start, window_end)
        return _resolved_from_record(record, 'record_window', getattr(space, 'id', None))
    except Exception:
        return {}


def _resolve_from_alert_segment(payload: dict) -> dict:
    device_id = _text(payload.get('device_id') or payload.get('deviceId') or payload.get('camera_id') or payload.get('cameraId'))
    source_alert_id = _text(payload.get('source_alert_id') or payload.get('sourceAlertId') or payload.get('alert_id') or payload.get('alertId'))
    if not device_id or not source_alert_id.isdigit():
        return {}
    try:
        from app.services.record_video_service import find_segment_for_alert

        result = find_segment_for_alert(device_id, int(source_alert_id)) or {}
        segment = result.get('segment') or {}
        uri = _text(segment.get('url') or segment.get('record_uri') or segment.get('download_url'))
        if not uri:
            return {}
        return {
            'record_uri': uri,
            'source': 'alert_segment',
            'space_id': result.get('space_id'),
            'object_name': segment.get('object_name'),
            'segment_start_time': segment.get('start_time'),
            'segment_end_time': segment.get('end_time'),
            'duration': segment.get('duration'),
        }
    except Exception:
        return {}


def _payload_window(payload: dict):
    start_time = _parse_time(payload.get('start_time') or payload.get('startTime'))
    end_time = _parse_time(payload.get('end_time') or payload.get('endTime'))
    if start_time and end_time and end_time < start_time:
        return end_time, start_time
    return start_time, end_time


def _select_record_for_window(records, window_start: datetime, window_end: datetime):
    if not records or not window_start:
        return None
    window_end = window_end or window_start
    center = window_start + (window_end - window_start) / 2
    best = None
    for record in records:
        segment_start = _normalize_datetime(getattr(record, 'event_time', None))
        if not segment_start:
            continue
        duration = max(1, int(getattr(record, 'duration', None) or 30))
        segment_end = segment_start + timedelta(seconds=duration)
        if segment_start > window_end or segment_end < window_start:
            continue
        distance = _distance_to_segment(center, segment_start, segment_end)
        if best is None or distance < best[0]:
            best = (distance, record)
    return best[1] if best else None


def _resolved_from_record(record, source: str, space_id=None) -> dict:
    if not record:
        return {}
    record_uri = _record_uri(record, space_id)
    if not record_uri:
        return {}
    segment_start = _normalize_datetime(getattr(record, 'event_time', None))
    duration = max(1, int(getattr(record, 'duration', None) or 30))
    segment_end = segment_start + timedelta(seconds=duration) if segment_start else None
    return {
        'record_uri': record_uri,
        'source': source,
        'space_id': space_id or getattr(record, 'space_id', None),
        'object_name': _text(getattr(record, 'object_name', None)),
        'segment_start_time': segment_start.isoformat() if segment_start else None,
        'segment_end_time': segment_end.isoformat() if segment_end else None,
        'duration': duration,
    }


def _record_uri(record, space_id=None) -> str:
    uri = _text(getattr(record, 'url', None))
    if uri:
        return uri
    object_name = _text(getattr(record, 'object_name', None))
    if not object_name:
        return ''
    resolved_space_id = space_id or getattr(record, 'space_id', None)
    if resolved_space_id:
        try:
            from app.utils.service_urls import build_record_video_api_url

            return build_record_video_api_url(int(resolved_space_id), object_name)
        except Exception:
            return object_name
    return object_name


def _distance_to_segment(moment: datetime, segment_start: datetime, segment_end: datetime) -> float:
    if segment_start <= moment <= segment_end:
        return 0
    return min(abs((moment - segment_start).total_seconds()), abs((moment - segment_end).total_seconds()))


def _parse_time(value):
    text = _text(value)
    if not text:
        return None
    normalized = text[:-1] + '+00:00' if text.endswith('Z') else text
    for parser in (
        lambda raw: datetime.fromisoformat(raw),
        lambda raw: datetime.strptime(raw, '%Y-%m-%d %H:%M:%S'),
        lambda raw: datetime.strptime(raw, '%Y-%m-%d %H:%M:%S.%f'),
    ):
        try:
            return _normalize_datetime(parser(normalized))
        except ValueError:
            continue
    return None


def _normalize_datetime(value):
    if not value:
        return None
    if value.tzinfo is None:
        return value
    try:
        from app.utils.service_urls import SHANGHAI_TZ
    except Exception:
        SHANGHAI_TZ = timezone(timedelta(hours=8))
    return value.astimezone(SHANGHAI_TZ).replace(tzinfo=None)


def _build_export_id(review_case_id: str, review_item_id: str, record_uri: str) -> str:
    digest = hashlib.sha1(record_uri.encode('utf-8')).hexdigest()[:12]
    case_part = review_case_id or 'case'
    item_part = review_item_id or 'item'
    return f'review-{case_part}-{item_part}-{digest}'


def _download_url(record_uri: str) -> str:
    if record_uri.startswith(('http://', 'https://', '/video/', '/api/')):
        return record_uri
    if record_uri.startswith('/'):
        return f'/video/alert/record?path={quote(record_uri, safe="")}'
    return record_uri


def _as_bool(value) -> bool:
    if isinstance(value, bool):
        return value
    text = _text(value).lower()
    return text in ('1', 'true', 'yes', 'y', 'on')


def _positive_int(value):
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return None
    return parsed if parsed > 0 else None


def _text(value) -> str:
    if value is None:
        return ''
    return str(value).strip()


def _text_list(value) -> list:
    if value is None:
        return []
    if isinstance(value, (list, tuple, set)):
        return [_text(item) for item in value if _text(item)]
    text = _text(value)
    return [text] if text else []
