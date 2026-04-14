"""
人脸管理与识别路由
"""
import logging
import subprocess
from datetime import datetime

import cv2
import numpy as np
from flask import Blueprint, jsonify, request

from app.services.face_recognition_service import decode_image_bytes, get_face_recognition_service
from models import Device

face_bp = Blueprint("face", __name__)
logger = logging.getLogger(__name__)


def _read_upload_image() -> np.ndarray:
    if "file" not in request.files:
        raise ValueError("请上传文件字段 file")
    file_obj = request.files["file"]
    if file_obj is None or file_obj.filename is None or not file_obj.filename.strip():
        raise ValueError("上传文件不能为空")
    return decode_image_bytes(file_obj.read())


def _capture_frame_from_source(source: str) -> np.ndarray:
    source = (source or "").strip()
    if not source:
        raise ValueError("设备视频源为空")

    if source.lower().startswith("rtmp://"):
        ffmpeg_cmd = [
            "ffmpeg",
            "-i",
            source,
            "-vframes",
            "1",
            "-f",
            "image2",
            "-vcodec",
            "mjpeg",
            "-q:v",
            "2",
            "pipe:1",
        ]
        try:
            process = subprocess.Popen(ffmpeg_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            stdout, stderr = process.communicate(timeout=10)
            if process.returncode != 0 or not stdout:
                error_msg = stderr.decode("utf-8", errors="ignore") if stderr else "未知错误"
                raise RuntimeError(f"RTMP 抓帧失败: {error_msg}")
            frame = cv2.imdecode(np.frombuffer(stdout, np.uint8), cv2.IMREAD_COLOR)
            if frame is None:
                raise RuntimeError("RTMP 图像解码失败")
            return frame
        except subprocess.TimeoutExpired as exc:
            raise RuntimeError("RTMP 抓帧超时") from exc

    cap = cv2.VideoCapture(source)
    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
    ok, frame = cap.read()
    cap.release()
    if not ok or frame is None:
        raise RuntimeError("RTSP 抓帧失败")
    return frame


@face_bp.route("/health", methods=["GET"])
def face_health():
    try:
        service = get_face_recognition_service()
        return jsonify({"code": 0, "msg": "success", "data": service.ping()})
    except Exception as e:
        logger.error(f"人脸服务健康检查失败: {str(e)}", exc_info=True)
        return jsonify({"code": 500, "msg": f"人脸服务初始化失败: {str(e)}"}), 500


@face_bp.route("/library", methods=["GET"])
def list_library():
    try:
        service = get_face_recognition_service()
        label = request.args.get("label", "").strip() or None
        limit = int(request.args.get("limit", 1000))
        data = service.list_faces(label=label, limit=limit)
        return jsonify({"code": 0, "msg": "success", "data": data})
    except Exception as e:
        logger.error(f"查询人脸库失败: {str(e)}", exc_info=True)
        return jsonify({"code": 500, "msg": f"查询失败: {str(e)}"}), 500


@face_bp.route("/library", methods=["POST"])
def add_library():
    try:
        label = (request.form.get("label") or "").strip()
        if not label:
            return jsonify({"code": 400, "msg": "label 不能为空"}), 400
        image = _read_upload_image()
        service = get_face_recognition_service()
        result = service.add_face(label=label, image=image)
        return jsonify({"code": 0, "msg": "录入成功", "data": {"label": label, **result}})
    except ValueError as e:
        return jsonify({"code": 400, "msg": str(e)}), 400
    except Exception as e:
        logger.error(f"录入人脸失败: {str(e)}", exc_info=True)
        return jsonify({"code": 500, "msg": f"录入失败: {str(e)}"}), 500


@face_bp.route("/library/<string:label>", methods=["PUT"])
def update_library(label: str):
    try:
        label = label.strip()
        if not label:
            return jsonify({"code": 400, "msg": "label 不能为空"}), 400
        image = _read_upload_image()
        service = get_face_recognition_service()
        result = service.update_face(label=label, image=image)
        return jsonify({"code": 0, "msg": "更新成功", "data": {"label": label, **result}})
    except ValueError as e:
        return jsonify({"code": 400, "msg": str(e)}), 400
    except Exception as e:
        logger.error(f"更新人脸失败: {str(e)}", exc_info=True)
        return jsonify({"code": 500, "msg": f"更新失败: {str(e)}"}), 500


@face_bp.route("/library/<string:label>", methods=["DELETE"])
def delete_library(label: str):
    try:
        label = label.strip()
        if not label:
            return jsonify({"code": 400, "msg": "label 不能为空"}), 400
        service = get_face_recognition_service()
        deleted = service.delete_face(label=label)
        return jsonify({"code": 0, "msg": "删除成功", "data": {"label": label, "deleted": deleted}})
    except Exception as e:
        logger.error(f"删除人脸失败: {str(e)}", exc_info=True)
        return jsonify({"code": 500, "msg": f"删除失败: {str(e)}"}), 500


@face_bp.route("/recognize/image", methods=["POST"])
def recognize_image():
    try:
        top_k = int(request.form.get("top_k", 3))
        image = _read_upload_image()
        service = get_face_recognition_service()
        result = service.recognize(image=image, top_k=top_k)
        return jsonify({"code": 0, "msg": "识别完成", "data": result})
    except ValueError as e:
        return jsonify({"code": 400, "msg": str(e)}), 400
    except Exception as e:
        logger.error(f"图片识别失败: {str(e)}", exc_info=True)
        return jsonify({"code": 500, "msg": f"识别失败: {str(e)}"}), 500


@face_bp.route("/recognize/device/<string:device_id>/snapshot", methods=["POST"])
def recognize_device_snapshot(device_id: str):
    try:
        top_k = int((request.get_json(silent=True) or {}).get("top_k", 3))
        device = Device.query.get(device_id)
        if not device:
            return jsonify({"code": 400, "msg": f"设备不存在: ID={device_id}"}), 400

        frame = _capture_frame_from_source(device.source)
        service = get_face_recognition_service()
        result = service.recognize(image=frame, top_k=top_k)
        return jsonify(
            {
                "code": 0,
                "msg": "识别完成",
                "data": {
                    "device_id": device_id,
                    "captured_at": datetime.utcnow().isoformat(),
                    **result,
                },
            }
        )
    except ValueError as e:
        return jsonify({"code": 400, "msg": str(e)}), 400
    except Exception as e:
        logger.error(f"设备抓帧识别失败: {str(e)}", exc_info=True)
        return jsonify({"code": 500, "msg": f"识别失败: {str(e)}"}), 500
