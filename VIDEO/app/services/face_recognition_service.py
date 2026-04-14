"""
人脸识别服务（Milvus + InsightFace）
"""
import os
import threading
from typing import Any, Dict, List, Optional

import cv2
import numpy as np

try:
    from insightface.app import FaceAnalysis
    from pymilvus import MilvusClient
    _FACE_IMPORT_ERROR: Optional[Exception] = None
except Exception as exc:  # pragma: no cover - 依赖缺失时兜底
    FaceAnalysis = None
    MilvusClient = None
    _FACE_IMPORT_ERROR = exc


def _to_bool(value: Optional[str], default: bool = False) -> bool:
    if value is None:
        return default
    return str(value).strip().lower() in {"1", "true", "yes", "on"}


def _escape_filter_value(value: str) -> str:
    return value.replace("\\", "\\\\").replace('"', '\\"')


class FaceRecognitionService:
    def __init__(self):
        if _FACE_IMPORT_ERROR is not None or FaceAnalysis is None or MilvusClient is None:
            raise RuntimeError(f"人脸依赖未安装或加载失败: {_FACE_IMPORT_ERROR}")

        self.embedding_size = int(os.getenv("FACE_EMBEDDING_SIZE", "512"))
        self.similarity_threshold = float(os.getenv("FACE_SIMILARITY_THRESHOLD", "0.55"))
        self.collection_name = os.getenv("FACE_MILVUS_COLLECTION", "face_embeddings")
        self.face_model_name = os.getenv("FACE_ANALYSIS_MODEL", "buffalo_l")

        milvus_uri = os.getenv("MILVUS_URI", "").strip()
        if not milvus_uri:
            os.makedirs("./data/face_db", exist_ok=True)
            milvus_uri = "./data/face_db/milvus_lite.db"
        self.milvus_uri = milvus_uri

        use_gpu = _to_bool(os.getenv("USE_GPU"), default=False)
        providers = ["CUDAExecutionProvider"] if use_gpu else ["CPUExecutionProvider"]
        self.face_app = FaceAnalysis(name=self.face_model_name, providers=providers)
        self.face_app.prepare(ctx_id=0 if use_gpu else -1, det_size=(640, 640))

        self.client = MilvusClient(uri=self.milvus_uri)
        if not self.client.has_collection(self.collection_name):
            self.client.create_collection(
                collection_name=self.collection_name,
                dimension=self.embedding_size,
                metric_type="COSINE",
                auto_id=True,
                enable_dynamic_field=True,
            )

    def _extract_faces(self, image: np.ndarray) -> List[Any]:
        return self.face_app.get(image)

    def _search_embedding(self, embedding: np.ndarray, top_k: int = 3) -> List[Dict[str, Any]]:
        search_result = self.client.search(
            collection_name=self.collection_name,
            data=[embedding.astype(np.float32).tolist()],
            limit=max(1, top_k),
            output_fields=["label"],
        )
        if not search_result:
            return []
        hits = search_result[0] if isinstance(search_result[0], list) else search_result
        parsed: List[Dict[str, Any]] = []
        for hit in hits or []:
            entity = hit.get("entity", {})
            label = entity.get("label") or hit.get("label")
            similarity = float(hit.get("distance", hit.get("score", 0.0)))
            parsed.append({
                "label": label,
                "similarity": similarity,
                "matched": similarity >= self.similarity_threshold,
            })
        return parsed

    def add_face(self, label: str, image: np.ndarray) -> Dict[str, Any]:
        faces = self._extract_faces(image)
        if not faces:
            raise ValueError("图片中未检测到人脸")

        face = max(faces, key=lambda x: (x.bbox[2] - x.bbox[0]) * (x.bbox[3] - x.bbox[1]))
        embedding = face.normed_embedding.astype(np.float32)
        result = self.client.insert(
            collection_name=self.collection_name,
            data=[{"vector": embedding.tolist(), "label": label}],
        )
        return {"insert_result": result, "face_count": len(faces)}

    def update_face(self, label: str, image: np.ndarray) -> Dict[str, Any]:
        deleted = self.delete_face(label)
        added = self.add_face(label, image)
        return {"deleted": deleted, "added": added}

    def delete_face(self, label: str) -> int:
        escaped = _escape_filter_value(label)
        records = self.client.query(
            collection_name=self.collection_name,
            filter=f'label == "{escaped}"',
            output_fields=["id"],
            limit=16384,
        )
        if not records:
            return 0
        ids = [item["id"] for item in records if "id" in item]
        if ids:
            self.client.delete(collection_name=self.collection_name, ids=ids)
        return len(ids)

    def list_faces(self, label: Optional[str] = None, limit: int = 1000) -> List[Dict[str, Any]]:
        filter_expr = "id >= 0"
        if label:
            escaped = _escape_filter_value(label)
            filter_expr = f'label == "{escaped}"'
        return self.client.query(
            collection_name=self.collection_name,
            filter=filter_expr,
            output_fields=["id", "label"],
            limit=limit,
        )

    def recognize(self, image: np.ndarray, top_k: int = 3) -> Dict[str, Any]:
        faces = self._extract_faces(image)
        if not faces:
            return {"face_count": 0, "results": []}

        result_list: List[Dict[str, Any]] = []
        for face in faces:
            embedding = face.normed_embedding.astype(np.float32)
            candidates = self._search_embedding(embedding, top_k=top_k)
            best = candidates[0] if candidates else None
            x1, y1, x2, y2 = [int(v) for v in face.bbox.tolist()]
            result_list.append(
                {
                    "bbox": [x1, y1, x2, y2],
                    "matched": bool(best and best.get("matched")),
                    "best_match": best,
                    "candidates": candidates,
                }
            )
        return {"face_count": len(faces), "results": result_list}

    def ping(self) -> Dict[str, Any]:
        count = len(self.list_faces(limit=1))
        return {
            "status": "ok",
            "milvus_uri": self.milvus_uri,
            "collection": self.collection_name,
            "sample_count": count,
        }


_FACE_SERVICE_LOCK = threading.Lock()
_FACE_SERVICE_INSTANCE: Optional[FaceRecognitionService] = None


def get_face_recognition_service() -> FaceRecognitionService:
    global _FACE_SERVICE_INSTANCE
    if _FACE_SERVICE_INSTANCE is not None:
        return _FACE_SERVICE_INSTANCE

    with _FACE_SERVICE_LOCK:
        if _FACE_SERVICE_INSTANCE is None:
            _FACE_SERVICE_INSTANCE = FaceRecognitionService()
    return _FACE_SERVICE_INSTANCE


def decode_image_bytes(image_bytes: bytes) -> np.ndarray:
    if not image_bytes:
        raise ValueError("图片数据为空")
    frame = cv2.imdecode(np.frombuffer(image_bytes, np.uint8), cv2.IMREAD_COLOR)
    if frame is None:
        raise ValueError("图片解码失败，请检查图片格式")
    return frame
