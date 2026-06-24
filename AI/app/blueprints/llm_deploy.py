"""
GPU 节点 Qwen 大模型部署 API。
"""
import logging

from flask import Blueprint, jsonify, request

from app.services.llm_deploy_service import (
    check_llm_deploy_vram,
    delete_llm_deploy,
    deploy_llm,
    get_llm_catalog,
    list_deployed_llm_services,
    receive_llm_heartbeat,
    stop_llm_deploy,
)

llm_deploy_bp = Blueprint('llm_deploy', __name__)
logger = logging.getLogger(__name__)


@llm_deploy_bp.route('/catalog', methods=['GET'])
def catalog_route():
    return jsonify(get_llm_catalog())


@llm_deploy_bp.route('/list', methods=['GET'])
def list_route():
    page = request.args.get('page', 1, type=int)
    page_size = request.args.get('pageSize', 20, type=int)
    return jsonify(list_deployed_llm_services(page, page_size))


@llm_deploy_bp.route('/check-vram', methods=['GET'])
def check_vram_route():
    try:
        qwen_model_key = request.args.get('qwen_model_key', '')
        target_node_id = request.args.get('target_node_id', type=int)
        tensor_parallel_size = request.args.get('tensor_parallel_size', 1, type=int)
        if not qwen_model_key:
            return jsonify({'code': 400, 'msg': '缺少 qwen_model_key'}), 400
        if not target_node_id:
            return jsonify({'code': 400, 'msg': '缺少 target_node_id'}), 400
        return jsonify(
            check_llm_deploy_vram(
                qwen_model_key,
                target_node_id=target_node_id,
                tensor_parallel_size=tensor_parallel_size,
            )
        )
    except ValueError as exc:
        return jsonify({'code': 400, 'msg': str(exc)}), 400
    except Exception as exc:
        logger.exception('显存预检失败')
        return jsonify({'code': 500, 'msg': str(exc)}), 500


@llm_deploy_bp.route('/deploy', methods=['POST'])
def deploy_route():
    try:
        data = request.get_json() or {}
        qwen_model_key = data.get('qwen_model_key')
        if not qwen_model_key:
            return jsonify({'code': 400, 'msg': '缺少 qwen_model_key'}), 400
        result = deploy_llm(
            qwen_model_key,
            start_port=int(data.get('start_port', 8100)),
            target_node_id=int(data['target_node_id']) if data.get('target_node_id') else None,
            auto_schedule=bool(data.get('auto_schedule', False)),
            tensor_parallel_size=int(data.get('tensor_parallel_size', 1)),
            max_model_len=int(data.get('max_model_len', 8192)),
            service_name=data.get('service_name'),
        )
        return jsonify(result)
    except ValueError as exc:
        return jsonify({'code': 400, 'msg': str(exc)}), 400
    except Exception as exc:
        logger.exception('LLM 部署失败')
        return jsonify({'code': 500, 'msg': str(exc)}), 500


@llm_deploy_bp.route('/heartbeat', methods=['POST'])
def heartbeat_route():
    try:
        data = request.get_json() or {}
        return jsonify(receive_llm_heartbeat(data))
    except ValueError as exc:
        return jsonify({'code': 400, 'msg': str(exc)}), 400
    except Exception as exc:
        logger.exception('LLM 心跳处理失败')
        return jsonify({'code': 500, 'msg': str(exc)}), 500


@llm_deploy_bp.route('/stop', methods=['POST'])
def stop_route():
    try:
        data = request.get_json() or {}
        service_id = data.get('service_id')
        if not service_id:
            return jsonify({'code': 400, 'msg': '缺少 service_id'}), 400
        return jsonify(stop_llm_deploy(int(service_id)))
    except ValueError as exc:
        return jsonify({'code': 400, 'msg': str(exc)}), 400
    except Exception as exc:
        logger.exception('停止 LLM 部署失败')
        return jsonify({'code': 500, 'msg': str(exc)}), 500


@llm_deploy_bp.route('/delete', methods=['DELETE'])
def delete_route():
    try:
        service_id = request.args.get('id', type=int)
        if not service_id:
            return jsonify({'code': 400, 'msg': '缺少 id'}), 400
        return jsonify(delete_llm_deploy(service_id))
    except ValueError as exc:
        return jsonify({'code': 400, 'msg': str(exc)}), 400
    except Exception as exc:
        logger.exception('删除 LLM 部署失败')
        return jsonify({'code': 500, 'msg': str(exc)}), 500
