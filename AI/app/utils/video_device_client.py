"""
VIDEO 服务设备流地址客户端：供模型推理拉流时解析摄像头输入。
"""
from __future__ import annotations

import logging
import os
from typing import Any, Dict, Optional

import requests

from app.utils.node_client import resolve_java_backend_url

logger = logging.getLogger(__name__)

_REQUEST_TIMEOUT = 30


def _candidate_bases() -> list[str]:
    bases: list[str] = []
    seen: set[str] = set()

    def add(base: str) -> None:
        base = (base or '').strip().rstrip('/')
        if base and base not in seen:
            seen.add(base)
            bases.append(base)

    video_url = (os.getenv('VIDEO_SERVICE_URL') or '').strip().rstrip('/')
    if video_url:
        add(video_url)

    port = (os.getenv('VIDEO_SERVICE_PORT') or os.getenv('FLASK_VIDEO_PORT') or '6000').strip()
    add(f'http://127.0.0.1:{port}/video/camera')
    add(f'http://localhost:{port}/video/camera')

    gateway = resolve_java_backend_url()
    add(f'{gateway}/admin-api/video/camera')
    add(f'{gateway}/video/camera')

    return bases


def _headers() -> Dict[str, str]:
    headers: Dict[str, str] = {}
    token = (os.getenv('JWT_TOKEN') or '').strip()
    if not token:
        try:
            from flask import has_request_context, request as flask_request
            if has_request_context():
                token = flask_request.headers.get('X-Authorization', '').replace('Bearer ', '').strip()
        except Exception:
            pass
    if token:
        headers['X-Authorization'] = f'Bearer {token}'
    return headers


def fetch_device_inference_input(device_id: str) -> Optional[Dict[str, Any]]:
    """向 VIDEO 查询设备推理可取流地址（含国标 WVP 点播解析）。"""
    device_id = (device_id or '').strip()
    if not device_id:
        return None

    errors: list[str] = []
    for base in _candidate_bases():
        url = f'{base}/device/{device_id}/inference-input'
        try:
            resp = requests.get(url, headers=_headers(), timeout=_REQUEST_TIMEOUT)
            if resp.status_code == 404:
                errors.append(f'{url}: 404')
                continue
            resp.raise_for_status()
            payload = resp.json()
            if payload.get('code') != 0:
                errors.append(f'{url}: {payload.get("msg") or "非 0 响应"}')
                continue
            data = payload.get('data')
            if isinstance(data, dict):
                logger.info(
                    '已解析设备推理输入流 device_id=%s via %s resolved=%s',
                    device_id,
                    base,
                    (data.get('resolved_source') or data.get('rtmp_stream') or '')[:120],
                )
                return data
        except Exception as exc:
            errors.append(f'{url}: {exc}')

    logger.warning(
        '获取设备推理输入流失败 device_id=%s, errors=%s',
        device_id,
        '; '.join(errors[:4]),
    )
    return None
