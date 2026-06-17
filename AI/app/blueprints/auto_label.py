"""
@author reese
@email reese
自动化标注功能蓝图
"""
import os
import json
import logging
import tempfile
import threading
import random
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
import requests
from flask import Blueprint, request, jsonify, Response
from sqlalchemy import text

from db_models import db, AutoLabelTask, AutoLabelResult, AIService, Model
from app.services.inference_service import InferenceService
from app.services.minio_service import ModelService
from app.services.sam_service import get_sam_service
from app.utils.sam_result_parser import to_annotations

auto_label_bp = Blueprint('auto_label', __name__)
logger = logging.getLogger(__name__)

# 与 Java PageParam.PAGE_SIZE_MAX 保持一致
_DATASET_IMAGE_PAGE_SIZE = 1000
# 批量标注进度落库间隔（减少 DB 写入）
_AUTO_LABEL_PROGRESS_COMMIT_INTERVAL = int(os.getenv('AUTO_LABEL_PROGRESS_COMMIT_INTERVAL', '10'))


def _fetch_all_dataset_images(java_backend_url: str, dataset_id: int, extra_params: dict | None = None) -> list:
    """分页拉取数据集全部图片（单页最多 1000 条）"""
    import requests

    all_images: list = []
    page_no = 1
    extra_params = extra_params or {}

    while True:
        params = {
            'datasetId': dataset_id,
            'pageNo': page_no,
            'pageSize': _DATASET_IMAGE_PAGE_SIZE,
            **extra_params,
        }
        response = requests.get(
            f"{java_backend_url}/admin-api/dataset/image/page",
            params=params,
            timeout=60,
        )
        if response.status_code != 200:
            raise RuntimeError(f'获取图片列表失败: HTTP {response.status_code}, {response.text}')

        body = response.json()
        if body.get('code') != 0:
            raise RuntimeError(f'获取图片列表失败: {body.get("msg")}')

        data = body.get('data') or {}
        batch = data.get('list') or []
        total = data.get('total') or 0
        all_images.extend(batch)

        if not batch or len(all_images) >= total or len(batch) < _DATASET_IMAGE_PAGE_SIZE:
            break
        page_no += 1

    return all_images


def _dataset_java_base() -> str:
    return os.getenv('JAVA_BACKEND_URL', 'http://localhost:8080').rstrip('/')


def _dataset_annotation_url(dataset_id: int, suffix: str) -> str:
    return f"{_dataset_java_base()}/admin-api/dataset/{dataset_id}/annotation/{suffix}"


def _forward_request_headers() -> dict:
    headers = {}
    for key in ('Authorization', 'X-Authorization', 'tenant-id'):
        val = request.headers.get(key)
        if val:
            headers[key] = val
    return headers


def _model_has_weights(model: Model) -> bool:
    return bool(
        model.model_path or model.onnx_model_path or model.torchscript_model_path
        or model.tensorrt_model_path or model.openvino_model_path
    )


def _resolve_model_id(data: dict) -> tuple[int | None, str | None]:
    """解析标注所用模型：优先 model_id，兼容旧版 model_service_id。"""
    raw_model_id = data.get('model_id')
    if raw_model_id is not None and raw_model_id != '':
        try:
            model_id = int(raw_model_id)
        except (TypeError, ValueError):
            return None, 'model_id 无效'
        if model_id <= 0:
            return None, '请选择有效模型'
        model = Model.query.get(model_id)
        if not model:
            return None, '模型不存在'
        if not _model_has_weights(model):
            return None, '模型无可用的权重文件，请先上传或导出模型'
        return model_id, None

    model_service_id = data.get('model_service_id')
    if model_service_id:
        ai_service = AIService.query.get(model_service_id)
        if not ai_service:
            return None, 'AI服务不存在'
        if ai_service.status != 'running':
            return None, 'AI服务未运行，请改用 model_id 直连模型推理'
        if not ai_service.model_id:
            return None, 'AI服务未关联模型'
        return ai_service.model_id, None

    return None, '请选择模型（model_id）'


def _attach_model_info(task_dict: dict, task: AutoLabelTask) -> None:
    if task.model_id and task.model:
        task_dict['model'] = {
            'id': task.model.id,
            'name': task.model.name,
            'version': task.model.version,
        }
    elif task.model_service:
        task_dict['model_service'] = task.model_service.to_dict()


def _proxy_dataset_json_response(resp: requests.Response):
    try:
        body = resp.json()
    except ValueError:
        return jsonify({'code': 500, 'msg': resp.text or '数据集服务响应异常'}), 500
    if resp.ok:
        return jsonify(body), resp.status_code
    msg = body.get('msg') if isinstance(body, dict) else str(body)
    return jsonify({'code': body.get('code', resp.status_code) if isinstance(body, dict) else resp.status_code, 'msg': msg}), resp.status_code


@auto_label_bp.route('/dataset/<int:dataset_id>/auto-label/start', methods=['POST'])
def start_auto_label(dataset_id):
    """启动自动化标注任务（YOLO 直连 / SAM 开放词汇）"""
    try:
        data = request.json or {}
        label_mode = (data.get('label_mode') or 'yolo').lower()
        confidence_threshold = float(data.get('confidence_threshold', 0.5 if label_mode == 'yolo' else 0.45))

        model_id = None
        legacy_service_id = data.get('model_service_id')
        text_prompts = data.get('text_prompts') or []
        annotation_type = data.get('annotation_type') or 'rectangle'
        return_masks = bool(data.get('return_masks', annotation_type == 'polygon'))
        sample_selection = data.get('sample_selection')

        if label_mode == 'sam':
            if not text_prompts:
                return jsonify({'code': 400, 'msg': 'SAM 模式需提供 text_prompts'}), 400
            sam_svc = get_sam_service()
            if not sam_svc.enabled:
                return jsonify({'code': 503, 'msg': 'SAM 未启用，请设置 SAM_ENABLED=true'}), 503
        else:
            model_id, err = _resolve_model_id(data)
            if err:
                return jsonify({'code': 400, 'msg': err}), 400

        task = AutoLabelTask(
            dataset_id=dataset_id,
            model_id=model_id,
            model_service_id=legacy_service_id if legacy_service_id else None,
            confidence_threshold=confidence_threshold,
            label_mode=label_mode,
            text_prompts=json.dumps(text_prompts, ensure_ascii=False) if text_prompts else None,
            annotation_type=annotation_type,
            phase='PRODUCTION',
            return_masks=return_masks,
            bootstrap_selection=sample_selection or 'all',
            status='PENDING',
        )
        db.session.add(task)
        db.session.commit()

        from flask import current_app
        app = current_app._get_current_object()
        thread = threading.Thread(target=execute_auto_label_task, args=(app, task.id))
        thread.daemon = True
        thread.start()

        return jsonify({
            'code': 0,
            'msg': '自动化标注任务已启动',
            'data': {
                'task_id': task.id,
                'model_id': model_id,
                'label_mode': label_mode,
            }
        })

    except Exception as e:
        logger.error(f"启动自动化标注任务失败: {str(e)}", exc_info=True)
        db.session.rollback()
        return jsonify({'code': 500, 'msg': f'启动任务失败: {str(e)}'}), 500


@auto_label_bp.route('/dataset/<int:dataset_id>/auto-label/bootstrap/start', methods=['POST'])
def start_bootstrap_auto_label(dataset_id):
    """SAM 冷启动批量标注（首批 N 张）"""
    try:
        data = request.json or {}
        text_prompts = data.get('text_prompts') or []
        if not text_prompts:
            return jsonify({'code': 400, 'msg': '请提供 text_prompts'}), 400

        sam_svc = get_sam_service()
        if not sam_svc.enabled:
            return jsonify({'code': 503, 'msg': 'SAM 未启用，请设置 SAM_ENABLED=true'}), 503

        bootstrap_limit = int(data.get('bootstrap_limit', 200))
        bootstrap_selection = data.get('bootstrap_selection', 'unlabeled_first')
        annotation_type = data.get('annotation_type', 'rectangle')
        confidence_threshold = float(data.get('confidence_threshold', 0.45))
        return_masks = bool(data.get('return_masks', annotation_type == 'polygon'))

        task = AutoLabelTask(
            dataset_id=dataset_id,
            confidence_threshold=confidence_threshold,
            label_mode='sam',
            text_prompts=json.dumps(text_prompts, ensure_ascii=False),
            annotation_type=annotation_type,
            phase='BOOTSTRAP',
            bootstrap_limit=bootstrap_limit,
            bootstrap_selection=bootstrap_selection,
            return_masks=return_masks,
            status='PENDING',
        )
        db.session.add(task)
        db.session.commit()

        from flask import current_app
        app = current_app._get_current_object()
        thread = threading.Thread(target=execute_auto_label_task, args=(app, task.id))
        thread.daemon = True
        thread.start()

        return jsonify({
            'code': 0,
            'msg': 'SAM 冷启动标注任务已启动',
            'data': {'task_id': task.id, 'bootstrap_limit': bootstrap_limit},
        })
    except Exception as e:
        logger.error(f"启动 SAM 冷启动任务失败: {str(e)}", exc_info=True)
        db.session.rollback()
        return jsonify({'code': 500, 'msg': f'启动失败: {str(e)}'}), 500


@auto_label_bp.route('/dataset/<int:dataset_id>/auto-label/bootstrap/status', methods=['GET'])
def bootstrap_status(dataset_id):
    """冷启动进度与训练就绪状态"""
    try:
        task = AutoLabelTask.query.filter_by(
            dataset_id=dataset_id, phase='BOOTSTRAP'
        ).order_by(AutoLabelTask.created_at.desc()).first()
        if not task:
            return jsonify({'code': 0, 'msg': '暂无冷启动任务', 'data': {'has_task': False}})

        labeled = task.success_count or 0
        limit = task.bootstrap_limit or 200
        ready_for_train = (
            task.status == 'COMPLETED'
            and labeled >= min(limit, task.total_images or 0)
            and bool(task.review_passed)
        )
        return jsonify({
            'code': 0,
            'msg': '获取成功',
            'data': {
                'has_task': True,
                'task_id': task.id,
                'status': task.status,
                'processed_images': task.processed_images,
                'total_images': task.total_images,
                'success_count': labeled,
                'bootstrap_limit': limit,
                'review_passed': bool(task.review_passed),
                'ready_for_train': ready_for_train,
            },
        })
    except Exception as e:
        logger.error(f"获取冷启动状态失败: {str(e)}", exc_info=True)
        return jsonify({'code': 500, 'msg': str(e)}), 500


@auto_label_bp.route('/dataset/<int:dataset_id>/auto-label/bootstrap/complete-review', methods=['POST'])
def bootstrap_complete_review(dataset_id):
    """标记冷启动抽检通过"""
    try:
        data = request.json or {}
        review_passed = bool(data.get('review_passed', True))
        task = AutoLabelTask.query.filter_by(
            dataset_id=dataset_id, phase='BOOTSTRAP', status='COMPLETED'
        ).order_by(AutoLabelTask.created_at.desc()).first()
        if not task:
            return jsonify({'code': 404, 'msg': '未找到已完成的冷启动任务'}), 404
        task.review_passed = review_passed
        db.session.commit()
        return jsonify({
            'code': 0,
            'msg': '抽检状态已更新',
            'data': {'task_id': task.id, 'review_passed': review_passed},
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'code': 500, 'msg': str(e)}), 500


@auto_label_bp.route('/dataset/<int:dataset_id>/auto-label/task/<int:task_id>', methods=['GET'])
def get_auto_label_task(dataset_id, task_id):
    """获取自动化标注任务状态"""
    try:
        task = AutoLabelTask.query.filter_by(id=task_id, dataset_id=dataset_id).first()
        if not task:
            return jsonify({'code': 404, 'msg': '任务不存在'}), 404

        task_dict = task.to_dict()
        _attach_model_info(task_dict, task)

        return jsonify({
            'code': 0,
            'msg': '获取成功',
            'data': task_dict
        })

    except Exception as e:
        logger.error(f"获取任务状态失败: {str(e)}", exc_info=True)
        return jsonify({'code': 500, 'msg': f'获取失败: {str(e)}'}), 500


@auto_label_bp.route('/dataset/<int:dataset_id>/auto-label/tasks', methods=['GET'])
def list_auto_label_tasks(dataset_id):
    """获取数据集的所有自动化标注任务列表"""
    try:
        page = int(request.args.get('page', 1))
        page_size = int(request.args.get('page_size', 10))

        tasks = AutoLabelTask.query.filter_by(dataset_id=dataset_id)\
            .order_by(AutoLabelTask.created_at.desc())\
            .paginate(page=page, per_page=page_size, error_out=False)

        # 构建任务列表，包含关联的AI服务信息
        task_list = []
        for task in tasks.items:
            task_dict = task.to_dict()
            _attach_model_info(task_dict, task)
            task_list.append(task_dict)

        return jsonify({
            'code': 0,
            'msg': '获取成功',
            'data': {
                'list': task_list,
                'total': tasks.total,
                'page': page,
                'page_size': page_size
            }
        })

    except Exception as e:
        logger.error(f"获取任务列表失败: {str(e)}", exc_info=True)
        return jsonify({'code': 500, 'msg': f'获取失败: {str(e)}'}), 500


@auto_label_bp.route('/dataset/<int:dataset_id>/auto-label/image/<int:image_id>', methods=['POST'])
def label_single_image(dataset_id, image_id):
    """单张图片AI标注（直连模型推理）"""
    try:
        data = request.json or {}
        confidence_threshold = float(data.get('confidence_threshold', 0.5))

        model_id, err = _resolve_model_id(data)
        if err:
            return jsonify({'code': 400, 'msg': err}), 400

        java_backend_url = os.getenv('JAVA_BACKEND_URL', 'http://localhost:8080')
        image_response = requests.get(
            f"{java_backend_url}/admin-api/dataset/image/get",
            params={'id': image_id},
            timeout=10
        )

        if image_response.status_code != 200:
            return jsonify({'code': 404, 'msg': '图片不存在'}), 404

        image_data = image_response.json()
        if image_data.get('code') != 0:
            return jsonify({'code': 404, 'msg': '获取图片信息失败'}), 404

        image_info = image_data.get('data', {})
        image_path = image_info.get('path')

        if not image_path:
            return jsonify({'code': 400, 'msg': '图片路径不存在'}), 400

        bucket_name, object_key = _parse_minio_path(image_path)
        if not bucket_name or not object_key:
            return jsonify({'code': 400, 'msg': '无法解析图片路径'}), 400

        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.jpg')
        temp_file.close()

        success, error_msg = ModelService.download_from_minio(bucket_name, object_key, temp_file.name)
        if not success:
            return jsonify({'code': 500, 'msg': f'下载图片失败: {error_msg}'}), 500

        try:
            from PIL import Image as PILImage
            with PILImage.open(temp_file.name) as img:
                image_width, image_height = img.size

            inference_service = InferenceService(model_id)
            detections = inference_service.detect_image_file(temp_file.name, {
                'conf_thres': confidence_threshold,
                'iou_thres': 0.45,
            })
            annotations = _parse_inference_result({'detections': detections}, image_width, image_height)

            update_response = requests.put(
                f"{java_backend_url}/admin-api/dataset/image/update",
                json={
                    'id': image_id,
                    'datasetId': dataset_id,
                    'annotations': json.dumps(annotations, ensure_ascii=False),
                    'completed': 1 if annotations else 0
                },
                timeout=10
            )

            if update_response.status_code != 200:
                logger.warning(f"更新图片标注失败: {image_id}")
                return jsonify({'code': 500, 'msg': '更新图片标注失败'}), 500

            return jsonify({
                'code': 0,
                'msg': '标注成功',
                'data': {
                    'annotations': annotations,
                    'count': len(annotations)
                }
            })

        finally:
            if os.path.exists(temp_file.name):
                os.unlink(temp_file.name)

    except Exception as e:
        logger.error(f"单张图片AI标注失败: {str(e)}", exc_info=True)
        return jsonify({'code': 500, 'msg': f'标注失败: {str(e)}'}), 500


@auto_label_bp.route('/dataset/<int:dataset_id>/auto-label/export', methods=['POST'])
def export_labeled_dataset(dataset_id):
    """导出标注数据集（转发至 iot-dataset /annotation/export）"""
    try:
        data = request.json or {}
        if data.get('task_id'):
            logger.warning('export task_id 已由 iot-dataset 统一导出，旧参数 task_id 已忽略')
        export_format = (data.get('format') or 'yolo').lower()
        if export_format not in ('yolo', ''):
            return jsonify({'code': 400, 'msg': f'导出格式 {export_format} 已下线，请使用 YOLO 导出'}), 400
        body = {
            'trainRatio': float(data.get('train_ratio', 0.7)),
            'valRatio': float(data.get('val_ratio', 0.2)),
            'testRatio': float(data.get('test_ratio', 0.1)),
            'sampleSelection': data.get('sample_selection') or data.get('sample_type', 'all'),
            'selectedClasses': data.get('selected_classes') or [],
            'exportPrefix': data.get('export_prefix') or data.get('file_prefix') or '',
        }
        if not body['selectedClasses']:
            return jsonify({'code': 400, 'msg': '请至少选择一个导出类别'}), 400
        resp = requests.post(
            _dataset_annotation_url(dataset_id, 'export'),
            json=body,
            headers=_forward_request_headers(),
            timeout=1800,
            stream=True,
        )
        if not resp.ok:
            return _proxy_dataset_json_response(resp)
        headers = {
            k: v for k, v in resp.headers.items()
            if k.lower() in ('content-type', 'content-disposition', 'content-length')
        }
        return Response(resp.iter_content(chunk_size=8192), status=resp.status_code, headers=headers)
    except Exception as e:
        logger.error(f"导出数据集失败: {str(e)}", exc_info=True)
        return jsonify({'code': 500, 'msg': f'导出失败: {str(e)}'}), 500


@auto_label_bp.route('/dataset/<int:dataset_id>/extract-frames', methods=['POST'])
def extract_frames_from_video(dataset_id):
    """视频抽帧（转发至 iot-dataset /annotation/extract-frames）"""
    try:
        if 'file' not in request.files:
            return jsonify({'code': 400, 'msg': '未找到视频文件'}), 400
        file = request.files['file']
        if not file or file.filename == '':
            return jsonify({'code': 400, 'msg': '未选择视频文件'}), 400
        frame_interval = request.form.get('frame_interval', '30')
        resp = requests.post(
            _dataset_annotation_url(dataset_id, 'extract-frames'),
            files={'file': (file.filename, file.stream, file.content_type or 'video/mp4')},
            data={'frame_interval': frame_interval},
            headers=_forward_request_headers(),
            timeout=1800,
        )
        return _proxy_dataset_json_response(resp)
    except Exception as e:
        logger.error(f"视频抽帧失败: {str(e)}", exc_info=True)
        return jsonify({'code': 500, 'msg': f'抽帧失败: {str(e)}'}), 500


@auto_label_bp.route('/dataset/<int:dataset_id>/import-labelme', methods=['POST'])
def import_labelme_dataset(dataset_id):
    """导入 LabelMe（转发至 iot-dataset /annotation/import-labelme）"""
    try:
        files = request.files.getlist('files')
        if not files:
            return jsonify({'code': 400, 'msg': '未选择文件'}), 400
        multipart = []
        for f in files:
            multipart.append(('files', (f.filename, f.stream, f.content_type or 'application/octet-stream')))
        resp = requests.post(
            _dataset_annotation_url(dataset_id, 'import-labelme'),
            files=multipart,
            headers=_forward_request_headers(),
            timeout=1800,
        )
        if not resp.ok:
            return _proxy_dataset_json_response(resp)
        body = resp.json()
        data = body.get('data') if isinstance(body, dict) else {}
        images = (data or {}).get('imagesCopied') or (data or {}).get('imported_count') or 0
        return jsonify({
            'code': 0,
            'msg': body.get('msg') or f'导入完成，共导入 {images} 个文件',
            'data': {'imported_count': images, **(data or {})},
        })
    except Exception as e:
        logger.error(f"导入labelme数据集失败: {str(e)}", exc_info=True)
        return jsonify({'code': 500, 'msg': f'导入失败: {str(e)}'}), 500


def _download_dataset_image(image: dict) -> tuple[int | None, str | None, int, int]:
    """下载数据集图片到临时文件，返回 (image_id, temp_path, width, height)。"""
    from PIL import Image as PILImage

    image_id = image.get('id')
    image_path = image.get('path')
    if not image_path:
        return image_id, None, 0, 0

    bucket_name, object_key = _parse_minio_path(image_path)
    if not bucket_name or not object_key:
        return image_id, None, 0, 0

    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.jpg')
    temp_file.close()

    success, error_msg = ModelService.download_from_minio(bucket_name, object_key, temp_file.name)
    if not success:
        logger.error(f"下载图片失败 image_id={image_id}: {error_msg}")
        if os.path.exists(temp_file.name):
            os.unlink(temp_file.name)
        return image_id, None, 0, 0

    try:
        with PILImage.open(temp_file.name) as img:
            image_width, image_height = img.size
    except Exception as e:
        logger.error(f"读取图片尺寸失败 image_id={image_id}: {e}")
        os.unlink(temp_file.name)
        return image_id, None, 0, 0

    return image_id, temp_file.name, image_width, image_height


def _select_bootstrap_images(all_images, task):
    """按冷启动策略筛选图片子集。"""
    selection = task.bootstrap_selection or 'unlabeled_first'
    limit = task.bootstrap_limit or len(all_images)

    if selection == 'unlabeled_first':
        pool = [img for img in all_images if not img.get('completed')]
    elif selection == 'random':
        pool = list(all_images)
        random.shuffle(pool)
        return pool[:limit]
    elif selection == 'unlabeled_only':
        pool = [img for img in all_images if not img.get('completed')]
    else:
        pool = list(all_images)
    return pool[:limit]


def _parse_text_prompts(task) -> list:
    if not task.text_prompts:
        return []
    try:
        parsed = json.loads(task.text_prompts) if isinstance(task.text_prompts, str) else task.text_prompts
        return parsed if isinstance(parsed, list) else []
    except Exception:
        return []


def execute_auto_label_task(app, task_id):
    """执行自动化标注任务：YOLO 直连 InferenceService 或 SAM 进程内推理。"""
    task = None
    with app.app_context():
        try:
            task = AutoLabelTask.query.get(task_id)
            if not task:
                logger.error(f"任务不存在: {task_id}")
                return

            label_mode = (task.label_mode or 'yolo').lower()
            inference_service = None
            sam_service = None

            if label_mode == 'sam':
                sam_service = get_sam_service()
                sam_service.warmup_if_needed()
                text_prompts = _parse_text_prompts(task)
                if not text_prompts:
                    raise Exception('SAM 任务缺少 text_prompts')
            else:
                model_id = task.model_id
                if not model_id and task.model_service_id:
                    ai_service = AIService.query.get(task.model_service_id)
                    model_id = ai_service.model_id if ai_service else None
                if not model_id:
                    raise Exception('任务未关联有效模型')
                inference_service = InferenceService(model_id)
                inference_service.get_model()

            task.status = 'PROCESSING'
            task.started_at = datetime.now()
            db.session.commit()

            java_backend_url = os.getenv('JAVA_BACKEND_URL', 'http://localhost:8080').rstrip('/')
            logger.info(f"开始获取数据集图片列表: dataset_id={task.dataset_id}, label_mode={label_mode}")

            images = _fetch_all_dataset_images(java_backend_url, task.dataset_id)

            if task.phase == 'BOOTSTRAP' or (task.bootstrap_limit and label_mode == 'sam'):
                images = _select_bootstrap_images(images, task)
            elif task.bootstrap_selection == 'unlabeled_only':
                images = [img for img in images if not img.get('completed')]

            task.total_images = len(images)
            task.processed_images = 0
            task.success_count = 0
            task.failed_count = 0
            db.session.commit()

            logger.info(f"数据集 {task.dataset_id} 本批 {len(images)} 张，label_mode={label_mode}")

            success_count = 0
            failed_count = 0
            prefetch_workers = int(os.getenv('AUTO_LABEL_PREFETCH_WORKERS', '2'))
            annotation_type = task.annotation_type or 'rectangle'
            return_masks = bool(task.return_masks)

            def _iter_with_prefetch(items):
                if prefetch_workers <= 1 or len(items) <= 1:
                    for item in items:
                        yield _download_dataset_image(item)
                    return
                with ThreadPoolExecutor(max_workers=prefetch_workers) as pool:
                    futures = {pool.submit(_download_dataset_image, img): idx for idx, img in enumerate(items)}
                    results = [None] * len(items)
                    for future in as_completed(futures):
                        results[futures[future]] = future.result()
                    for row in results:
                        yield row

            for idx, (image_id, temp_path, image_width, image_height) in enumerate(_iter_with_prefetch(images)):
                image = images[idx]
                if not temp_path:
                    failed_count += 1
                    db.session.add(AutoLabelResult(
                        task_id=task_id,
                        dataset_image_id=image_id or image.get('id', 0),
                        status='FAILED',
                        error_message='下载或解析图片失败',
                    ))
                else:
                    try:
                        if label_mode == 'sam':
                            sam_result = sam_service.predict(
                                temp_path,
                                text=_parse_text_prompts(task),
                                return_masks=return_masks,
                                conf=task.confidence_threshold,
                            )
                            annotations = to_annotations(
                                sam_result, image_width, image_height,
                                annotation_type=annotation_type,
                            )
                        else:
                            detections = inference_service.detect_image_file(temp_path, {
                                'conf_thres': task.confidence_threshold,
                                'iou_thres': 0.45,
                            })
                            annotations = _parse_inference_result(
                                {'detections': detections}, image_width, image_height
                            )
                        db.session.add(AutoLabelResult(
                            task_id=task_id,
                            dataset_image_id=image_id,
                            annotations=json.dumps(annotations, ensure_ascii=False),
                            status='SUCCESS',
                        ))
                        update_response = requests.put(
                            f"{java_backend_url}/admin-api/dataset/image/update",
                            json={
                                'id': image_id,
                                'datasetId': task.dataset_id,
                                'annotations': json.dumps(annotations, ensure_ascii=False),
                                'completed': 1 if annotations else 0,
                            },
                            timeout=10,
                        )
                        if update_response.status_code != 200:
                            logger.warning(f"更新图片标注失败: {image_id}")
                        success_count += 1
                    except Exception as e:
                        logger.error(f"处理图片失败: {e}", exc_info=True)
                        failed_count += 1
                        db.session.add(AutoLabelResult(
                            task_id=task_id,
                            dataset_image_id=image_id or image.get('id', 0),
                            status='FAILED',
                            error_message=str(e),
                        ))
                    finally:
                        if os.path.exists(temp_path):
                            os.unlink(temp_path)

                task.processed_images = idx + 1
                task.success_count = success_count
                task.failed_count = failed_count
                if (idx + 1) % _AUTO_LABEL_PROGRESS_COMMIT_INTERVAL == 0 or idx + 1 == len(images):
                    db.session.commit()

            task.status = 'COMPLETED'
            task.completed_at = datetime.now()
            db.session.commit()

            logger.info(
                f"自动化标注完成: task_id={task_id}, success={success_count}, failed={failed_count}"
            )

        except Exception as e:
            logger.error(f"执行自动化标注任务失败: {str(e)}", exc_info=True)
            if task:
                task.status = 'FAILED'
                task.error_message = str(e)
                task.completed_at = datetime.now()
                db.session.commit()


def _parse_minio_path(path):
    """解析MinIO路径，返回bucket和object_key"""
    # 格式: /api/v1/buckets/{bucket}/objects/download?prefix={object_key}
    from urllib.parse import urlparse, parse_qs

    try:
        parsed = urlparse(path)
        path_parts = parsed.path.split('/')

        if len(path_parts) >= 5 and path_parts[3] == 'buckets':
            bucket_name = path_parts[4]
        else:
            return None, None

        query_params = parse_qs(parsed.query)
        object_key = query_params.get('prefix', [None])[0]

        return bucket_name, object_key
    except Exception as e:
        logger.error(f"解析MinIO路径失败: {path}, 错误: {str(e)}")
        return None, None


def _parse_inference_result(result, image_width, image_height):
    """解析推理结果，转换为标注格式（归一化坐标 + {x,y}格式）"""
    annotations = []

    try:
        if not result:
            return annotations

        # 检查返回格式：可能是 {'code': 0, 'data': {...}} 或直接是 data
        if isinstance(result, dict) and 'code' in result:
            if result.get('code') != 0:
                logger.warning(f"推理返回错误: {result.get('msg', '未知错误')}")
                return annotations
            predictions = result.get('data', {}).get('predictions', [])
        elif isinstance(result, dict) and 'data' in result:
            predictions = result.get('data', {}).get('predictions', [])
        elif isinstance(result, dict) and 'predictions' in result:
            predictions = result.get('predictions', [])
        elif isinstance(result, dict) and 'detections' in result:
            predictions = result.get('detections', [])
        else:
            logger.warning(f"无法识别的推理结果格式: {type(result)}")
            return annotations

        # 验证图片尺寸
        if not image_width or not image_height or image_width <= 0 or image_height <= 0:
            logger.error(f"图片尺寸无效: width={image_width}, height={image_height}")
            return annotations

        for pred in predictions:
            try:
                # 推理结果格式: {'class': int, 'class_name': str, 'confidence': float, 'bbox': [x1, y1, x2, y2]}
                class_id = pred.get('class')
                class_name = pred.get('class_name', '')
                confidence = float(pred.get('confidence', 0))
                bbox = pred.get('bbox', [])

                # 如果没有class_name，尝试使用class_id
                if not class_name and class_id is not None:
                    class_name = str(class_id)

                if not class_name or not bbox or len(bbox) < 4:
                    continue

                x1, y1, x2, y2 = bbox[:4]

                # 确保坐标在图片范围内
                x1 = max(0, min(x1, image_width))
                y1 = max(0, min(y1, image_height))
                x2 = max(0, min(x2, image_width))
                y2 = max(0, min(y2, image_height))

                # **关键修复**: 将像素坐标归一化为0-1范围
                norm_x1 = x1 / image_width
                norm_y1 = y1 / image_height
                norm_x2 = x2 / image_width
                norm_y2 = y2 / image_height

                # **关键修复**: 转换为前端期望的格式 - 归一化坐标 + {x, y}对象格式 + label字段
                annotation = {
                    'label': class_name,  # 使用label字段而不是class，匹配手动标注
                    'confidence': confidence,
                    'points': [
                        {'x': norm_x1, 'y': norm_y1},
                        {'x': norm_x2, 'y': norm_y1},
                        {'x': norm_x2, 'y': norm_y2},
                        {'x': norm_x1, 'y': norm_y2}
                    ],
                    'type': 'rectangle',
                    'auto': True,
                    'color': '#52c41a'  # AI标注使用绿色
                }
                annotations.append(annotation)

                logger.debug(f"转换标注: {class_name}, 像素[{x1:.1f},{y1:.1f},{x2:.1f},{y2:.1f}] -> 归一化[{norm_x1:.3f},{norm_y1:.3f},{norm_x2:.3f},{norm_y2:.3f}]")

            except Exception as e:
                logger.error(f"解析单个预测结果失败: {str(e)}, pred: {pred}")
                continue
            
    except Exception as e:
        logger.error(f"解析推理结果失败: {str(e)}", exc_info=True)
    
    return annotations
