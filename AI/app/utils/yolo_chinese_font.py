"""
为 Ultralytics 结果图与本地 PIL 绘制提供字体支持。

训练前离线准备 Arial.ttf，避免多卡 DDP rank 并发下载同一个字体文件；非 ASCII
类别名继续使用 Arial.Unicode.ttf，并优先映射本机 CJK 字体。
"""
from __future__ import annotations

import logging
import os
import shutil
import tempfile
from functools import lru_cache
from pathlib import Path
from typing import List, Optional

logger = logging.getLogger(__name__)

_ARIAL_NAME = "Arial.ttf"
_ARIAL_UNICODE_NAME = "Arial.Unicode.ttf"


def _ultralytics_user_config_dir() -> Optional[Path]:
    try:
        from ultralytics.utils import USER_CONFIG_DIR

        return Path(USER_CONFIG_DIR)
    except Exception as e:
        logger.debug("无法导入 ultralytics USER_CONFIG_DIR: %s", e)
        return None


def _ultralytics_config_dirs() -> List[Path]:
    candidates: List[Path] = []
    runtime_dir = _ultralytics_user_config_dir()
    if runtime_dir:
        candidates.append(runtime_dir)

    configured_dir = (os.environ.get("YOLO_CONFIG_DIR") or "").strip()
    if configured_dir:
        configured_path = Path(configured_dir).expanduser()
        if configured_path.name.lower() == "ultralytics":
            candidates.append(configured_path)
        candidates.append(configured_path / "Ultralytics")

    result: List[Path] = []
    seen = set()
    for candidate in candidates:
        key = str(candidate)
        if key in seen:
            continue
        seen.add(key)
        result.append(candidate)
    return result


def _collect_font_candidates() -> List[Path]:
    env = os.environ.get("YOLO_RESULT_FONT_PATH") or os.environ.get("ULTRALYTICS_PLOT_FONT")
    candidates: List[Path] = []
    if env:
        path = Path(env).expanduser()
        if path.is_file():
            candidates.append(path)
    windows_dir = os.environ.get("WINDIR", r"C:\Windows")
    candidates.extend(
        [
            Path(windows_dir) / "Fonts" / "msyh.ttc",
            Path(windows_dir) / "Fonts" / "msyhbd.ttc",
            Path(windows_dir) / "Fonts" / "simhei.ttf",
            Path(windows_dir) / "Fonts" / "simsun.ttc",
            Path(windows_dir) / "Fonts" / "msjh.ttc",
            Path(windows_dir) / "Fonts" / "arialuni.ttf",
            Path(windows_dir) / "Fonts" / "Arial Unicode.ttf",
            Path("/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc"),
            Path("/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"),
            Path("/usr/share/fonts/truetype/wqy/wqy-microhei.ttc"),
            Path("/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc"),
            Path("/usr/share/fonts/truetype/droid/DroidSansFallbackFull.ttf"),
            Path("/System/Library/Fonts/PingFang.ttc"),
            Path("/System/Library/Fonts/STHeiti Light.ttc"),
            Path("/System/Library/Fonts/Supplemental/Arial Unicode.ttf"),
        ]
    )
    return candidates


def _collect_training_font_candidates() -> List[Path]:
    candidates: List[Path] = []
    for env_name in (
        "ULTRALYTICS_FONT_PATH",
        "YOLO_RESULT_FONT_PATH",
        "ULTRALYTICS_PLOT_FONT",
    ):
        value = (os.environ.get(env_name) or "").strip()
        if value:
            candidates.append(Path(value).expanduser())

    candidates.extend(
        [
            Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
            Path("/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf"),
            Path("/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"),
        ]
    )
    try:
        from matplotlib import get_data_path

        candidates.append(Path(get_data_path()) / "fonts" / "ttf" / "DejaVuSans.ttf")
    except Exception as e:
        logger.debug("无法定位 Matplotlib 内置字体: %s", e)
    candidates.extend(_collect_font_candidates())
    return candidates


def _font_is_valid(path: Path, min_bytes: int) -> bool:
    try:
        return path.is_file() and path.stat().st_size >= min_bytes
    except OSError:
        return False


def _copy_font_atomically(source: Path, destination: Path, min_bytes: int) -> bool:
    if _font_is_valid(destination, min_bytes):
        return True
    try:
        destination.parent.mkdir(parents=True, exist_ok=True)
        file_descriptor, temp_name = tempfile.mkstemp(
            prefix=f".{destination.name}.",
            suffix=".tmp",
            dir=destination.parent,
        )
        os.close(file_descriptor)
        temp_path = Path(temp_name)
        try:
            shutil.copy2(source, temp_path)
            if not _font_is_valid(temp_path, min_bytes):
                return False
            os.replace(temp_path, destination)
        finally:
            temp_path.unlink(missing_ok=True)
        return True
    except OSError as e:
        logger.warning("复制字体失败 %s -> %s: %s", source, destination, e)
        return False


def _ensure_font(filename: str, sources: List[Path], min_bytes: int) -> bool:
    config_dirs = _ultralytics_config_dirs()
    if not config_dirs:
        return False

    destinations = [config_dir / filename for config_dir in config_dirs]
    if all(_font_is_valid(destination, min_bytes) for destination in destinations):
        return True

    source = next(
        (candidate for candidate in sources if _font_is_valid(candidate, min_bytes)),
        None,
    )
    if source is None:
        return False

    primary_destination = destinations[0]
    if not _copy_font_atomically(source, primary_destination, min_bytes):
        return False
    for destination in destinations[1:]:
        _copy_font_atomically(source, destination, min_bytes)
    if _font_is_valid(primary_destination, min_bytes):
        logger.info("已离线准备 Ultralytics 字体 %s: %s", filename, source)
        return True
    return False


def ensure_ultralytics_training_fonts(min_bytes: int = 50_000) -> bool:
    """离线准备 Arial.ttf，避免 DDP rank 并发联网下载字体。"""
    prepared = _ensure_font(
        _ARIAL_NAME,
        _collect_training_font_candidates(),
        min_bytes,
    )
    if not prepared:
        logger.warning(
            "未找到可用的训练字体；请设置 ULTRALYTICS_FONT_PATH 指向本地 .ttf/.ttc 文件"
        )
    return prepared


def ensure_ultralytics_chinese_plot_font(min_bytes: int = 50_000) -> bool:
    """
    将本机或环境变量指定的 CJK 字体复制为 Arial.Unicode.ttf。

    可通过环境变量 YOLO_RESULT_FONT_PATH（或 ULTRALYTICS_PLOT_FONT）指定字体。
    """
    prepared = _ensure_font(
        _ARIAL_UNICODE_NAME,
        _collect_font_candidates(),
        min_bytes,
    )
    if prepared:
        return True

    logger.warning(
        "未找到可用的中文字体；结果图中文可能无法显示。请设置环境变量 YOLO_RESULT_FONT_PATH "
        "指向 .ttf/.ttc，或将 Arial.Unicode.ttf 放入 Ultralytics 用户配置目录。"
    )
    return False


def _pil_text_size(font, text: str) -> tuple[int, int]:
    bbox = font.getbbox(text)
    return bbox[2] - bbox[0], bbox[3] - bbox[1]


@lru_cache(maxsize=8)
def get_pil_annotation_font(size: int = 14):
    """加载与 Ultralytics 相同路径下的中文字体，供 ONNX 等 PIL 绘制使用。"""
    from PIL import ImageFont

    ensure_ultralytics_chinese_plot_font()
    config_dir = _ultralytics_user_config_dir()
    if not config_dir:
        return None
    destination = config_dir / _ARIAL_UNICODE_NAME
    if not destination.is_file():
        return None
    try:
        return ImageFont.truetype(str(destination), size)
    except OSError as e:
        logger.warning("PIL 无法加载字体 %s: %s", destination, e)
        return None


def draw_utf8_label_on_bgr(
    img,
    text: str,
    org_xy: tuple[int, int],
    font_size: int = 14,
    text_color_rgb: tuple[int, int, int] = (0, 0, 0),
) -> bool:
    """
    在 BGR 图像上绘制 UTF-8 文本（使用 PIL）。成功返回 True，失败返回 False。
    """
    import cv2
    import numpy as np
    from PIL import Image, ImageDraw

    font = get_pil_annotation_font(font_size)
    if font is None:
        return False

    height, width = img.shape[:2]
    text_width, text_height = _pil_text_size(font, text)
    left, top = int(org_xy[0]), int(org_xy[1])
    if left + text_width > width or top + text_height > height or left < 0 or top < 0:
        left = max(0, min(left, width - text_width - 1))
        top = max(0, min(top, height - text_height - 1))

    canvas_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    pil_image = Image.fromarray(canvas_rgb)
    draw = ImageDraw.Draw(pil_image)
    draw.text((left, top), text, font=font, fill=text_color_rgb)
    img[:] = cv2.cvtColor(np.asarray(pil_image), cv2.COLOR_RGB2BGR)
    return True