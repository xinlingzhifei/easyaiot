import os
from unittest import TestCase
from unittest.mock import patch

from app.utils.rtsp_stream_utils import ffmpeg_raw_capture_dimensions


class FfmpegRawCaptureDimensionsTest(TestCase):
    @patch.dict(
        os.environ,
        {
            "AI_TARGET_WIDTH": "640",
            "AI_TARGET_HEIGHT": "360",
        },
        clear=True,
    )
    def test_uses_ai_output_dimensions_by_default(self):
        self.assertEqual(ffmpeg_raw_capture_dimensions(), (640, 360))

    @patch.dict(
        os.environ,
        {
            "AI_FFMPEG_INPUT_WIDTH": "960",
            "AI_FFMPEG_INPUT_HEIGHT": "540",
            "AI_TARGET_WIDTH": "640",
            "AI_TARGET_HEIGHT": "360",
        },
        clear=True,
    )
    def test_explicit_input_dimensions_take_precedence(self):
        self.assertEqual(ffmpeg_raw_capture_dimensions(), (960, 540))
