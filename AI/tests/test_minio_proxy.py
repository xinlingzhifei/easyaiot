import sys
from pathlib import Path

from flask import Flask


AI_ROOT = Path(__file__).resolve().parents[1]
if str(AI_ROOT) not in sys.path:
    sys.path.insert(0, str(AI_ROOT))


def test_minio_proxy_streams_object_download(monkeypatch):
    from app.blueprints import minio_proxy

    calls = []

    def fake_download_from_minio(bucket_name, object_name, destination_path):
        calls.append((bucket_name, object_name))
        Path(destination_path).write_bytes(b'png-bytes')
        return True, None

    monkeypatch.setattr(minio_proxy, '_download_from_minio', fake_download_from_minio)

    app = Flask(__name__)
    app.register_blueprint(minio_proxy.minio_proxy_bp)

    response = app.test_client().get(
        '/api/v1/buckets/models/objects/download?prefix=images/demo.png'
    )

    assert response.status_code == 200
    assert response.data == b'png-bytes'
    assert response.mimetype == 'image/png'
    assert calls == [('models', 'images/demo.png')]
