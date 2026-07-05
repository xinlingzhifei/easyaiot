"""Verifier CLI for yFeiEye review evidence export manifests."""
import argparse
import hashlib
import hmac
import json
import os
import sys

_HMAC_SECRET_ENV = 'YFEIEYE_RECORD_EXPORT_HMAC_SECRET'
_HMAC_KEYS_ENV = 'YFEIEYE_RECORD_EXPORT_HMAC_KEYS'


def verify_manifest_file(path: str) -> dict:
    with open(path, 'r', encoding='utf-8') as file_obj:
        manifest = json.load(file_obj)
    return verify_manifest(manifest, base_dir=os.path.dirname(os.path.abspath(path)))


def verify_manifest(manifest: dict, base_dir: str = '') -> dict:
    manifest = manifest or {}
    expected_hash = _expected_manifest_hash(manifest)
    actual_hash = str(manifest.get('manifestHash') or '').strip()
    signature = manifest.get('signature') if isinstance(manifest.get('signature'), dict) else {}
    signature_key = _signature_key(signature)
    expected_signature = _expected_manifest_signature(manifest, expected_hash, signature_key.get('secret'))
    actual_signature = str(signature.get('value') or '').strip()
    file_checks = _verify_files(manifest.get('files'), base_dir)
    record_segment_checks = _verify_record_segments(manifest.get('recordSegments'), base_dir)
    violations = []
    if not actual_hash:
        violations.append('missing_manifest_hash')
    elif actual_hash != expected_hash:
        violations.append('manifest_hash_mismatch')
    if not signature:
        violations.append('missing_signature')
    elif actual_signature != expected_signature:
        violations.append('signature_mismatch')
    if signature.get('algorithm') == 'hmac-sha256' and not signature_key.get('available'):
        violations.append('missing_hmac_key')
    if not manifest.get('packageChecksum'):
        violations.append('missing_package_checksum')
    if any(not check['valid'] for check in file_checks):
        violations.append('file_hash_mismatch')
    if any(not check['valid'] for check in record_segment_checks):
        violations.append('record_segment_hash_mismatch')
    return {
        'valid': not violations,
        'manifestVersion': manifest.get('manifestVersion'),
        'manifestSchema': manifest.get('schema'),
        'canonicalHash': expected_hash,
        'actualManifestHash': actual_hash or None,
        'signatureValid': bool(signature) and actual_signature == expected_signature,
        'expectedSignature': expected_signature,
        'actualSignature': actual_signature or None,
        'signer': signature.get('signer'),
        'keyId': signature.get('keyId'),
        'signatureVersion': signature.get('signatureVersion') or signature.get('algorithmVersion'),
        'signatureKeyAvailable': signature_key.get('available'),
        'signatureKeySource': signature_key.get('source'),
        'fileChecks': file_checks,
        'recordSegmentChecks': record_segment_checks,
        'violations': violations,
    }


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description='Verify a yFeiEye review evidence manifest')
    parser.add_argument('--manifest', required=True, help='Path to manifest.json')
    args = parser.parse_args(argv)
    report = verify_manifest_file(args.manifest)
    print(json.dumps(report, ensure_ascii=False, sort_keys=True, indent=2))
    return 0 if report['valid'] else 2


def _expected_manifest_hash(manifest: dict) -> str:
    hashable = dict(manifest or {})
    hashable.pop('manifestHash', None)
    hashable.pop('signature', None)
    return _sha256_text(_canonical_json(hashable))


def _expected_manifest_signature(manifest: dict, manifest_hash: str, secret=None) -> str:
    approval = manifest.get('approval') if isinstance(manifest.get('approval'), dict) else {}
    payload = [
        manifest.get('packageChecksum'),
        manifest_hash,
        manifest.get('generatedBy'),
        approval.get('approvedBy'),
    ]
    signature = manifest.get('signature') if isinstance(manifest.get('signature'), dict) else {}
    if signature.get('algorithm') == 'hmac-sha256':
        signing_secret = _text(secret)
        if not signing_secret:
            return 'hmac-sha256:missing-secret'
        digest = hmac.new(signing_secret.encode('utf-8'), _canonical_json(payload).encode('utf-8'), hashlib.sha256).hexdigest()
        return 'hmac-sha256:' + digest
    return _sha256_text(_canonical_json(payload))


def _signature_key(signature: dict) -> dict:
    if signature.get('algorithm') != 'hmac-sha256':
        return {
            'available': True,
            'secret': '',
            'source': 'sha256',
        }
    key_id = _text(signature.get('keyId'))
    keyring, _configured_active_key_id = _hmac_keyring_config()
    if keyring:
        secret = keyring.get(key_id)
        return {
            'available': bool(secret),
            'secret': secret or '',
            'source': 'keyring',
        }
    legacy_secret = _text(os.environ.get(_HMAC_SECRET_ENV))
    return {
        'available': bool(legacy_secret),
        'secret': legacy_secret,
        'source': 'legacy-env' if legacy_secret else 'none',
    }


def _hmac_keyring_config() -> tuple:
    raw = _text(os.environ.get(_HMAC_KEYS_ENV))
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


def _verify_files(files, base_dir: str) -> list:
    checks = []
    if not isinstance(files, list):
        return checks
    for item in files:
        if not isinstance(item, dict):
            continue
        expected = str(item.get('hash') or '').strip()
        path = _resolve_path(item.get('path'), base_dir)
        actual = _sha256_file(path) if path and os.path.exists(path) else None
        checks.append({
            'name': item.get('name'),
            'path': path,
            'expectedHash': expected or None,
            'actualHash': actual,
            'valid': bool(expected) and actual == expected,
        })
    return checks


def _verify_record_segments(segments, base_dir: str) -> list:
    checks = []
    if not isinstance(segments, list):
        return checks
    for item in segments:
        if not isinstance(item, dict):
            continue
        expected = str(item.get('sourceHash') or '').strip()
        path = _resolve_path(item.get('recordUri'), base_dir)
        actual = _sha256_file(path) if path and os.path.exists(path) else None
        verifiable = bool(expected) or actual is not None
        checks.append({
            'recordUri': item.get('recordUri'),
            'expectedHash': expected or None,
            'actualHash': actual,
            'clipStartTime': item.get('clipStartTime'),
            'clipEndTime': item.get('clipEndTime'),
            'ffmpegCommandHash': item.get('ffmpegCommandHash'),
            'verifiable': verifiable,
            'valid': (actual == expected) if verifiable else True,
        })
    return checks


def _resolve_path(value, base_dir: str) -> str:
    text = str(value or '').strip()
    if not text:
        return ''
    if text.startswith('file://'):
        text = text[7:]
    if os.path.isabs(text):
        return text
    return os.path.abspath(os.path.join(base_dir or os.getcwd(), text))


def _canonical_json(value) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':'))


def _sha256_text(value: str) -> str:
    return 'sha256:' + hashlib.sha256(value.encode('utf-8')).hexdigest()


def _sha256_file(path: str) -> str:
    digest = hashlib.sha256()
    with open(path, 'rb') as file_obj:
        for chunk in iter(lambda: file_obj.read(1024 * 1024), b''):
            digest.update(chunk)
    return 'sha256:' + digest.hexdigest()


def _text(value) -> str:
    if value is None:
        return ''
    return str(value).strip()


if __name__ == '__main__':
    sys.exit(main())
