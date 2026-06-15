"""
SAM 推理引擎
封装 segment_anything 的点/框/自动分割能力
"""
import base64
import io
import logging
import threading
import time
from typing import Any

import cv2
import numpy as np
from PIL import Image

from app.config.sam_config import SUPPORTED_MODEL_TYPES, get_sam_config

logger = logging.getLogger(__name__)

_SAM_IMPORT_ERROR: str | None = None
try:
    from segment_anything import SamAutomaticMaskGenerator, SamPredictor, sam_model_registry
except ImportError as e:
    SamAutomaticMaskGenerator = None
    SamPredictor = None
    sam_model_registry = None
    _SAM_IMPORT_ERROR = str(e)


class SAMInferenceEngine:
    """SAM 推理引擎单例，线程安全懒加载"""

    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self.config = get_sam_config()
        self._sam_model = None
        self._predictor = None
        self._mask_generator = None
        self._current_model_type: str | None = None
        self._image_embedding_cache: dict[str, Any] = {}
        self._model_lock = threading.Lock()
        self._initialized = True

    @property
    def is_available(self) -> bool:
        return sam_model_registry is not None

    @property
    def import_error(self) -> str | None:
        return _SAM_IMPORT_ERROR

    def get_status(self) -> dict:
        return {
            'enabled': self.config['enabled'],
            'package_installed': self.is_available,
            'import_error': self.import_error,
            'model_loaded': self._sam_model is not None,
            'model_type': self._current_model_type,
            'checkpoint_path': self.config['checkpoint_path'],
            'checkpoint_exists': bool(self.config['checkpoint_path'])
            and __import__('os').path.isfile(self.config['checkpoint_path']),
            'device': self.config['device'],
        }

    def _resolve_model_type(self, model_type: str | None) -> str:
        model_type = (model_type or self.config['model_type']).strip()
        if model_type == 'default':
            model_type = 'vit_h'
        if model_type not in SUPPORTED_MODEL_TYPES:
            raise ValueError(f'不支持的模型类型: {model_type}，可选: {SUPPORTED_MODEL_TYPES}')
        return model_type

    def _ensure_model(self, model_type: str | None = None):
        if not self.config['enabled']:
            raise RuntimeError('SAM 未启用，请设置 SAM_ENABLED=true')
        if not self.is_available:
            raise RuntimeError(
                f'segment_anything 未安装: {_SAM_IMPORT_ERROR}。'
                '请执行: pip install -r requirements-sam.txt'
            )

        model_type = self._resolve_model_type(model_type)
        checkpoint = self.config['checkpoint_path']
        if not __import__('os').path.isfile(checkpoint):
            raise FileNotFoundError(f'SAM 权重不存在: {checkpoint}')

        with self._model_lock:
            if self._sam_model is not None and self._current_model_type == model_type:
                return

            logger.info('加载 SAM 模型: type=%s, checkpoint=%s', model_type, checkpoint)
            sam = sam_model_registry[model_type](checkpoint=checkpoint)
            device = self.config['device']
            try:
                import torch
                if device == 'cuda' and not torch.cuda.is_available():
                    logger.warning('CUDA 不可用，回退到 CPU')
                    device = 'cpu'
            except ImportError:
                device = 'cpu'

            sam.to(device=device)
            self._sam_model = sam
            self._predictor = SamPredictor(sam)
            self._mask_generator = SamAutomaticMaskGenerator(
                sam,
                points_per_side=self.config['auto_mask_points_per_side'],
                min_mask_region_area=self.config['min_mask_region_area'],
            )
            self._current_model_type = model_type
            self._image_embedding_cache.clear()
            logger.info('SAM 模型加载完成: %s on %s', model_type, device)

    def reload(self, model_type: str | None = None):
        with self._model_lock:
            self._sam_model = None
            self._predictor = None
            self._mask_generator = None
            self._current_model_type = None
            self._image_embedding_cache.clear()
        self._ensure_model(model_type)

    @staticmethod
    def load_image_from_bytes(image_bytes: bytes) -> np.ndarray:
        image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        return np.array(image)

    @staticmethod
    def load_image_from_base64(image_base64: str) -> np.ndarray:
        if ',' in image_base64:
            image_base64 = image_base64.split(',', 1)[1]
        return SAMInferenceEngine.load_image_from_bytes(base64.b64decode(image_base64))

    @staticmethod
    def load_image_from_path(image_path: str) -> np.ndarray:
        image = cv2.imread(image_path)
        if image is None:
            raise FileNotFoundError(f'无法读取图片: {image_path}')
        return cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

    def _mask_to_polygon(self, mask: np.ndarray) -> list:
        contours, _ = cv2.findContours(
            mask.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )
        if not contours:
            return []
        contour = max(contours, key=cv2.contourArea)
        epsilon = self.config['polygon_epsilon_ratio'] * cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, epsilon, True)
        h, w = mask.shape[:2]
        return [[round(p[0][0] / w, 4), round(p[0][1] / h, 4)] for p in approx]

    def _format_mask_results(
        self, masks: np.ndarray, scores: np.ndarray, image: np.ndarray
    ) -> list[dict]:
        h, w = image.shape[:2]
        results = []
        for mask, score in zip(masks, scores):
            mask_bool = mask.astype(bool)
            ys, xs = np.where(mask_bool)
            if len(xs) == 0:
                continue
            bbox = [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())]
            results.append({
                'score': round(float(score), 4),
                'bbox': bbox,
                'bbox_normalized': [
                    round(bbox[0] / w, 4), round(bbox[1] / h, 4),
                    round(bbox[2] / w, 4), round(bbox[3] / h, 4),
                ],
                'polygon': self._mask_to_polygon(mask_bool),
                'area': int(mask_bool.sum()),
            })
        results.sort(key=lambda x: x['score'], reverse=True)
        return results

    def _set_image(self, image: np.ndarray, cache_key: str | None = None):
        self._ensure_model()
        if cache_key and cache_key in self._image_embedding_cache:
            self._predictor.set_image(image)
            return
        self._predictor.set_image(image)
        if cache_key:
            self._image_embedding_cache[cache_key] = True
            if len(self._image_embedding_cache) > 10:
                self._image_embedding_cache.pop(next(iter(self._image_embedding_cache)))

    def predict_point(
        self,
        image: np.ndarray,
        points: list,
        point_labels: list,
        model_type: str | None = None,
        multimask_output: bool = True,
    ) -> dict:
        start = time.time()
        self._ensure_model(model_type)
        self._set_image(image)

        point_coords = np.array(points, dtype=np.float32)
        point_labels_arr = np.array(point_labels, dtype=np.int32)
        masks, scores, _ = self._predictor.predict(
            point_coords=point_coords,
            point_labels=point_labels_arr,
            multimask_output=multimask_output,
        )

        return {
            'masks': self._format_mask_results(masks, scores, image),
            'inference_ms': int((time.time() - start) * 1000),
            'image_size': [image.shape[1], image.shape[0]],
        }

    def predict_box(
        self,
        image: np.ndarray,
        boxes: list,
        model_type: str | None = None,
        multimask_output: bool = False,
    ) -> dict:
        start = time.time()
        self._ensure_model(model_type)
        self._set_image(image)

        all_masks = []
        all_scores = []
        for box in boxes:
            box_arr = np.array(box, dtype=np.float32)
            masks, scores, _ = self._predictor.predict(
                box=box_arr,
                multimask_output=multimask_output,
            )
            if multimask_output:
                all_masks.extend(masks)
                all_scores.extend(scores)
            else:
                all_masks.append(masks[0])
                all_scores.append(scores[0])

        masks_arr = np.array(all_masks)
        scores_arr = np.array(all_scores)

        return {
            'masks': self._format_mask_results(masks_arr, scores_arr, image),
            'inference_ms': int((time.time() - start) * 1000),
            'image_size': [image.shape[1], image.shape[0]],
        }

    def predict_auto(self, image: np.ndarray, model_type: str | None = None) -> dict:
        start = time.time()
        self._ensure_model(model_type)
        segments = self._mask_generator.generate(image)

        h, w = image.shape[:2]
        formatted = []
        for seg in segments:
            mask = seg['segmentation']
            formatted.append({
                'score': round(float(seg.get('predicted_iou', 0)), 4),
                'stability_score': round(float(seg.get('stability_score', 0)), 4),
                'bbox': seg.get('bbox'),
                'bbox_normalized': [
                    round(seg['bbox'][0] / w, 4),
                    round(seg['bbox'][1] / h, 4),
                    round((seg['bbox'][0] + seg['bbox'][2]) / w, 4),
                    round((seg['bbox'][1] + seg['bbox'][3]) / h, 4),
                ] if seg.get('bbox') else None,
                'polygon': self._mask_to_polygon(mask),
                'area': int(seg.get('area', 0)),
            })
        formatted.sort(key=lambda x: x['score'], reverse=True)

        return {
            'segments': formatted,
            'segment_count': len(formatted),
            'inference_ms': int((time.time() - start) * 1000),
            'image_size': [image.shape[1], image.shape[0]],
        }
