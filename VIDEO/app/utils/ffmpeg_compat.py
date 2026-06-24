"""FFmpeg 版本兼容：RTSP 超时参数等在 FFmpeg 8+ 有变更。"""
from __future__ import annotations

import subprocess
from typing import List, Optional

# FFmpeg 8+：-stimeout/-rw_timeout 已移除，统一为 -timeout（单位仍为微秒）
_FFMPEG_RTSP_OPEN_TIMEOUT_FLAG: Optional[str] = None
_FFMPEG_SUPPORTS_RW_TIMEOUT: Optional[bool] = None


def ffmpeg_option_missing(stderr: bytes, option: str = "") -> bool:
    err = (stderr or b"").decode(errors="replace")
    if "Unrecognized option" in err or "Option not found" in err:
        return True
    if option and f"Option {option} not found" in err:
        return True
    return False


def ffmpeg_rtsp_open_timeout_flag() -> str:
    """返回当前 ffmpeg 支持的 RTSP 连接超时参数名。"""
    global _FFMPEG_RTSP_OPEN_TIMEOUT_FLAG
    if _FFMPEG_RTSP_OPEN_TIMEOUT_FLAG is not None:
        return _FFMPEG_RTSP_OPEN_TIMEOUT_FLAG
    try:
        probe = subprocess.run(
            ["ffmpeg", "-hide_banner", "-stimeout", "1"],
            capture_output=True,
            timeout=5,
        )
        if ffmpeg_option_missing(probe.stderr, "stimeout"):
            _FFMPEG_RTSP_OPEN_TIMEOUT_FLAG = "-timeout"
        else:
            _FFMPEG_RTSP_OPEN_TIMEOUT_FLAG = "-stimeout"
    except Exception:
        _FFMPEG_RTSP_OPEN_TIMEOUT_FLAG = "-timeout"
    return _FFMPEG_RTSP_OPEN_TIMEOUT_FLAG


def ffmpeg_supports_rw_timeout() -> bool:
    """FFmpeg 8+ 已移除 -rw_timeout，仅保留 -timeout 覆盖 socket I/O。"""
    global _FFMPEG_SUPPORTS_RW_TIMEOUT
    if _FFMPEG_SUPPORTS_RW_TIMEOUT is not None:
        return _FFMPEG_SUPPORTS_RW_TIMEOUT
    try:
        # 必须带 -i，否则部分版本会把未知选项当作 trailing option 静默忽略，导致误判为支持
        probe = subprocess.run(
            [
                "ffmpeg",
                "-hide_banner",
                "-rw_timeout",
                "1",
                "-f",
                "lavfi",
                "-i",
                "testsrc=duration=0.01:size=16x16:rate=1",
                "-frames:v",
                "1",
                "-f",
                "null",
                "-",
            ],
            capture_output=True,
            timeout=10,
        )
        _FFMPEG_SUPPORTS_RW_TIMEOUT = not ffmpeg_option_missing(probe.stderr, "rw_timeout")
    except Exception:
        _FFMPEG_SUPPORTS_RW_TIMEOUT = False
    return _FFMPEG_SUPPORTS_RW_TIMEOUT


def ffmpeg_rtsp_timeout_args(open_us: int, io_us: int) -> List[str]:
    """按当前 ffmpeg 版本组装 RTSP 超时参数。"""
    open_flag = ffmpeg_rtsp_open_timeout_flag()
    if ffmpeg_supports_rw_timeout():
        return [open_flag, str(open_us), "-rw_timeout", str(io_us)]
    # FFmpeg 8：-timeout 同时覆盖连接与读写，取较大值
    return [open_flag, str(max(open_us, io_us))]
