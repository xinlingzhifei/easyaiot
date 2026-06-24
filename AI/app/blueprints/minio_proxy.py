import logging
import mimetypes
import os
import posixpath
import tempfile
from urllib.parse import unquote

from flask import Blueprint, Response, after_this_request, jsonify, request, send_file
from minio.error import S3Error

from app.services.minio_service import ModelService, parse_minio_download_url

minio_proxy_bp = Blueprint('minio_proxy', __name__)
logger = logging.getLogger(__name__)


def _download_from_minio(bucket_name, object_name, destination_path):
    return ModelService.download_from_minio(bucket_name, object_name, destination_path)


@minio_proxy_bp.route('/api/v1/buckets/<bucket_name>/objects/download', methods=['GET', 'HEAD'])
def download_bucket_object(bucket_name):
    prefix = request.args.get('prefix', '').strip()
    if not prefix:
        return jsonify({'code': 400, 'msg': 'missing MinIO object path'}), 400

    object_name = unquote(prefix)
    _, parsed_object_name = parse_minio_download_url(
        f'/api/v1/buckets/{bucket_name}/objects/download?prefix={prefix}'
    )
    if parsed_object_name:
        object_name = parsed_object_name

    suffix = os.path.splitext(object_name)[1]
    fd, temp_path = tempfile.mkstemp(suffix=suffix)
    os.close(fd)

    from app.utils.service_urls import minio_storage_enabled
    from app.services.local_storage_service import read_local_object

    if not minio_storage_enabled():
        content, content_type, err = read_local_object(bucket_name, object_key)
        if err or content is None:
            logger.warning('本地对象不存在: %s/%s', bucket_name, object_key)
            return Response(err or '对象不存在', status=404, mimetype='text/plain')
        filename = os.path.basename(object_key) or 'download'
        response = Response(content, mimetype=content_type or 'application/octet-stream')
        response.headers['Content-Disposition'] = f'inline; filename="{filename}"'
        response.headers['Content-Length'] = str(len(content))
        return response

    try:
        success, error_message = _download_from_minio(bucket_name, object_name, temp_path)
        if not success:
            try:
                os.remove(temp_path)
            except OSError:
                pass
            return jsonify({'code': 404, 'msg': error_message or 'MinIO object not found'}), 404

        @after_this_request
        def cleanup_temp_file(response):
            try:
                os.remove(temp_path)
            except OSError:
                pass
            return response

        mimetype = mimetypes.guess_type(object_name)[0] or 'application/octet-stream'
        return send_file(
            temp_path,
            mimetype=mimetype,
            download_name=posixpath.basename(object_name) or 'download',
            as_attachment=False,
            conditional=True,
        )
    except S3Error as e:
        logger.error('MinIO download failed: %s/%s, %s', bucket_name, object_name, e)
        try:
            os.remove(temp_path)
        except OSError:
            pass
        return Response(f'MinIO download failed: {e}', status=500, mimetype='text/plain')
    except Exception as e:
        logger.error('Proxy download failed: %s/%s, %s', bucket_name, object_name, e, exc_info=True)
        try:
            os.remove(temp_path)
        except OSError:
            pass
        return Response(f'Download failed: {e}', status=500, mimetype='text/plain')
