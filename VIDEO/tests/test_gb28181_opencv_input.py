import os
import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.utils.gb28181_source import prefer_h264_http_flv_for_opencv
from app.utils.rtsp_stream_utils import use_ffmpeg_raw_capture_for_url


class Gb28181OpenCvInputTest(unittest.TestCase):
    def tearDown(self):
        os.environ.pop("AI_HTTP_FLV_FFMPEG_CAPTURE", None)

    def test_gb28181_http_flv_prefers_h264_for_opencv(self):
        url = (
            "http://127.0.0.1:80/rtp/"
            "44010200493432381460_34020000001320000001.live.flv"
            "?originTypeStr=rtp_push&videoCodec=H265"
        )

        self.assertEqual(
            prefer_h264_http_flv_for_opencv(url),
            (
                "http://127.0.0.1:80/rtp/"
                "44010200493432381460_34020000001320000001.live.flv"
                "?originTypeStr=rtp_push&videoCodec=H264"
            ),
        )

    def test_http_flv_uses_ffmpeg_raw_capture_by_default(self):
        self.assertTrue(use_ffmpeg_raw_capture_for_url("http://127.0.0.1/live/test.flv"))
        self.assertFalse(use_ffmpeg_raw_capture_for_url("rtsp://127.0.0.1/live/test"))

        os.environ["AI_HTTP_FLV_FFMPEG_CAPTURE"] = "false"
        self.assertFalse(use_ffmpeg_raw_capture_for_url("http://127.0.0.1/live/test.flv"))


if __name__ == "__main__":
    unittest.main()
