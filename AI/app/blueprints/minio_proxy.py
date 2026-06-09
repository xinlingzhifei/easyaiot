import mimetypes
import os
import posixpath
import tempfile

from flask import Blueprint, after_this_request, jsonify, request, send_file

minio_proxy_bp = Blueprint('minio_proxy', __name__)


def _download_from_minio(bucket_name, object_name, destination_path):
    from app.services.minio_service import ModelService

    return ModelService.download_from_minio(bucket_name, object_name, destination_path)


@minio_proxy_bp.route('/api/v1/buckets/<bucket_name>/objects/download', methods=['GET', 'HEAD'])
def download_bucket_object(bucket_name):
    object_name = request.args.get('prefix', '').strip()
    if not object_name:
        return jsonify({'code': 400, 'msg': 'missing MinIO object path'}), 400

    suffix = os.path.splitext(object_name)[1]
    fd, temp_path = tempfile.mkstemp(suffix=suffix)
    os.close(fd)

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
