import importlib
import os
import sys
import types
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

sys.modules.setdefault(
    "models",
    types.SimpleNamespace(Device=object, StreamForwardTask=object, db=object()),
)

stream_url_sync_service = importlib.import_module("app.services.stream_url_sync_service")


class StreamUrlSyncServiceTest(unittest.TestCase):
    def tearDown(self):
        os.environ.pop("MEDIA_HTTP_PLAY_HOST", None)

    def test_build_stream_urls_uses_public_origin_without_srs_port(self):
        _, http_stream, _, ai_http_stream = stream_url_sync_service.build_stream_urls_for_host(
            "192.168.0.88",
            "gb28181_demo",
            http_play_host="https://eye.yfeiai.com",
        )

        self.assertEqual(http_stream, "https://eye.yfeiai.com/live/gb28181_demo.flv")
        self.assertEqual(ai_http_stream, "https://eye.yfeiai.com/ai/gb28181_demo.flv")

    def test_build_stream_urls_keeps_host_only_play_host_compatible(self):
        _, http_stream, _, ai_http_stream = stream_url_sync_service.build_stream_urls_for_host(
            "192.168.0.88",
            "gb28181_demo",
            tags={"srs_http_port": 18080},
            http_play_host="media.example.com",
        )

        self.assertEqual(http_stream, "http://media.example.com:18080/live/gb28181_demo.flv")
        self.assertEqual(ai_http_stream, "http://media.example.com:18080/ai/gb28181_demo.flv")

    def test_build_stream_urls_reads_public_origin_from_environment(self):
        os.environ["MEDIA_HTTP_PLAY_HOST"] = "https://eye.yfeiai.com/"

        _, http_stream, _, ai_http_stream = stream_url_sync_service.build_stream_urls_for_host(
            "192.168.0.88",
            "gb28181_demo",
        )

        self.assertEqual(http_stream, "https://eye.yfeiai.com/live/gb28181_demo.flv")
        self.assertEqual(ai_http_stream, "https://eye.yfeiai.com/ai/gb28181_demo.flv")

    def test_build_gb28181_zlm_http_flv_url_uses_public_rtp_route(self):
        os.environ["MEDIA_HTTP_PLAY_HOST"] = "https://eye.yfeiai.com/"

        url = stream_url_sync_service.build_gb28181_zlm_http_flv_url(
            "gb28181_44010200493432381460_34020000001320000001",
        )

        self.assertEqual(
            url,
            "https://eye.yfeiai.com/rtp/"
            "44010200493432381460_34020000001320000001.live.flv"
            "?originTypeStr=rtp_push&videoCodec=H265",
        )


if __name__ == "__main__":
    unittest.main()
