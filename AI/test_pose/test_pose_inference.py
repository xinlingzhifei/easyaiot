#!/usr/bin/env python3
"""
YOLO26 姿态分析测试（图片 + 视频）

用法:
    cd AI
    python test_pose/test_pose_inference.py
    python test_pose/test_pose_inference.py --image test_pose/fixtures/pose_sample.jpg
    python test_pose/test_pose_inference.py --api http://127.0.0.1:5000

测试素材目录: test_pose/fixtures/
输出目录:     test_pose/output/
"""
from __future__ import annotations

import argparse
import base64
import json
import os
import sys
import time
from pathlib import Path

AI_ROOT = Path(__file__).resolve().parents[1]
FIXTURES = Path(__file__).resolve().parent / 'fixtures'
OUTPUT = Path(__file__).resolve().parent / 'output'
DEFAULT_MODEL = AI_ROOT / 'yolo26n-pose.pt'
DEFAULT_IMAGE = FIXTURES / 'pose_sample.jpg'
DEFAULT_VIDEO = FIXTURES / 'pose_sample.mp4'


def _ensure_paths(image: Path, video: Path, model: Path) -> None:
    missing = [p for p in (image, video, model) if not p.is_file()]
    if missing:
        for p in missing:
            print(f'❌ 文件不存在: {p}')
        sys.exit(1)


def test_image_pose(model_path: Path, image_path: Path, conf: float = 0.25) -> dict:
    sys.path.insert(0, str(AI_ROOT))
    from app.utils.pose_inference import estimate_pose

    print('\n' + '=' * 60)
    print('📷 图片姿态测试')
    print('=' * 60)
    print(f'  模型: {model_path}')
    print(f'  图片: {image_path}')

    with open(image_path, 'rb') as f:
        image_bytes = f.read()

    t0 = time.perf_counter()
    result = estimate_pose(str(model_path), image_bytes, conf=conf, draw=True)
    elapsed = time.perf_counter() - t0

    out_img = OUTPUT / 'pose_image_result.jpg'
    OUTPUT.mkdir(parents=True, exist_ok=True)
    if result.get('imageBase64'):
        with open(out_img, 'wb') as f:
            f.write(base64.b64decode(result['imageBase64']))

    out_json = OUTPUT / 'pose_image_result.json'
    payload = {k: v for k, v in result.items() if k != 'imageBase64'}
    with open(out_json, 'w', encoding='utf-8') as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    print(f'  耗时: {elapsed:.2f}s')
    print(f'  人体数: {result.get("count", 0)}')
    print(f'  分辨率: {result.get("width")}x{result.get("height")}')
    print(f'  关键点类型: {result.get("poseType", "body17")}')
    print(f'  结果图: {out_img}')
    print(f'  结果JSON: {out_json}')

    if result.get('count', 0) <= 0:
        print('⚠️  未检测到人体（请换含人物的测试图）')
        return result

    print('✅ 图片姿态测试通过')
    return result


def test_video_pose(model_path: Path, video_path: Path, conf: float = 0.25) -> dict:
    sys.path.insert(0, str(AI_ROOT))
    from app.utils.pose_inference import pose_video

    print('\n' + '=' * 60)
    print('🎬 视频姿态测试')
    print('=' * 60)
    print(f'  模型: {model_path}')
    print(f'  视频: {video_path}')

    out_video = OUTPUT / 'pose_video_result.mp4'
    OUTPUT.mkdir(parents=True, exist_ok=True)

    processed = {'n': 0, 'total': 0}

    def progress_cb(p, t):
        processed['n'] = p
        processed['total'] = t
        if p == 1 or p % 30 == 0 or (t and p >= t):
            print(f'  进度: {p}/{t or "?"} 帧', flush=True)

    t0 = time.perf_counter()
    stats = pose_video(
        str(model_path),
        str(video_path),
        str(out_video),
        conf=conf,
        progress_cb=progress_cb,
    )
    elapsed = time.perf_counter() - t0

    out_json = OUTPUT / 'pose_video_result.json'
    with open(out_json, 'w', encoding='utf-8') as f:
        json.dump(stats, f, ensure_ascii=False, indent=2)

    print(f'  耗时: {elapsed:.2f}s')
    print(f'  处理帧数: {stats.get("frames", 0)}')
    print(f'  累计人体数: {stats.get("totalPersons", 0)}')
    print(f'  输出视频: {out_video} ({out_video.stat().st_size // 1024} KB)')
    print(f'  结果JSON: {out_json}')

    if not out_video.is_file() or out_video.stat().st_size < 1024:
        print('❌ 视频输出无效')
        sys.exit(1)

    print('✅ 视频姿态测试通过')
    return stats


def test_api(base_url: str, model_id: int, image_path: Path, video_path: Path, conf: float) -> None:
    try:
        import requests
    except ImportError:
        print('⚠️  跳过 API 测试（未安装 requests）')
        return

    base = base_url.rstrip('/')
    print('\n' + '=' * 60)
    print(f'🌐 HTTP API 测试 ({base})')
    print('=' * 60)

    with open(image_path, 'rb') as f:
        files = {'file': (image_path.name, f, 'image/jpeg')}
        data = {'conf': str(conf), 'model_file_path': 'yolo26n-pose.pt'}
        r = requests.post(f'{base}/model/pose/{model_id}/predict', files=files, data=data, timeout=120)
    r.raise_for_status()
    body = r.json()
    assert body.get('code') == 0, body
    print(f'  图片 API: count={body["data"].get("count")} ✅')

    with open(video_path, 'rb') as f:
        files = {'file': (video_path.name, f, 'video/mp4')}
        data = {'conf': str(conf), 'model_file_path': 'yolo26n-pose.pt'}
        r = requests.post(f'{base}/model/pose/{model_id}/predict-video', files=files, data=data, timeout=120)
    r.raise_for_status()
    body = r.json()
    assert body.get('code') == 0, body
    job_id = body['data']['jobId']
    print(f'  视频任务已启动: jobId={job_id}')

    for _ in range(120):
        time.sleep(1)
        pr = requests.get(f'{base}/model/pose/progress/{job_id}', timeout=60)
        pr.raise_for_status()
        prog = pr.json().get('data', {})
        status = prog.get('status')
        if status == 'done':
            print(f'  视频 API 完成: totalPersons={prog.get("stats", {}).get("totalPersons")} ✅')
            return
        if status == 'error':
            raise RuntimeError(prog.get('error') or '视频处理失败')
    raise TimeoutError('视频 API 轮询超时')


def main():
    parser = argparse.ArgumentParser(description='YOLO26 姿态分析测试')
    parser.add_argument('--model', type=Path, default=DEFAULT_MODEL, help='姿态模型路径')
    parser.add_argument('--image', type=Path, default=DEFAULT_IMAGE, help='测试图片')
    parser.add_argument('--video', type=Path, default=DEFAULT_VIDEO, help='测试视频')
    parser.add_argument('--conf', type=float, default=0.25, help='置信度阈值')
    parser.add_argument('--api', type=str, default='', help='可选：AI 服务地址，如 http://127.0.0.1:5000')
    parser.add_argument('--skip-video', action='store_true', help='仅测图片')
    args = parser.parse_args()

    os.chdir(AI_ROOT)
    _ensure_paths(args.image, args.video, args.model)

    print('=' * 60)
    print('🚀 YOLO26 姿态分析测试')
    print('=' * 60)
    print(f'工作目录: {AI_ROOT}')
    print(f'模型大小: {args.model.stat().st_size / 1024 / 1024:.2f} MB')

    img_result = test_image_pose(args.model, args.image, conf=args.conf)
    if not args.skip_video:
        test_video_pose(args.model, args.video, conf=args.conf)

    if args.api:
        test_api(args.api, 0, args.image, args.video, args.conf)

    print('\n' + '=' * 60)
    print('🎉 全部测试完成')
    print('=' * 60)
    print(f'测试文件: {FIXTURES}/')
    print(f'输出结果: {OUTPUT}/')
    if img_result.get('count', 0) > 0:
        print('建议用浏览器打开 output/pose_image_result.jpg 查看骨架标注')


if __name__ == '__main__':
    main()
