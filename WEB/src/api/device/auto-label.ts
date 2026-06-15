import { defHttp } from '@/utils/http/axios';
import {
  exportAnnotationDataset,
  extractAnnotationFrames,
  importAnnotationLabelme,
  type DatasetAnnotationExportParams,
} from '@/api/device/dataset';

enum Api {
  /** AI 推理与自动标注任务（model-server） */
  AutoLabel = '/model/dataset',
  Model = '/model',
  /** @deprecated 旧版依赖部署推理服务，保留兼容 */
  AIService = '/model/deploy_service',
}

const commonApi = (
  method: 'get' | 'post' | 'delete' | 'put',
  url: string,
  params = {},
  headers = {},
  isTransformResponse = true,
) => {
  defHttp.setHeader({ 'X-Authorization': 'Bearer ' + localStorage.getItem('jwt_token') });

  return defHttp[method](
    {
      url,
      headers: {
        // @ts-ignore
        ignoreCancelToken: true,
        ...headers,
      },
      ...params,
    },
    {
      isTransformResponse: isTransformResponse,
    },
  );
};

// —— AI 自动标注（直连 model-server 模型推理，无需部署推理服务）——

export interface StartAutoLabelParams {
  model_id?: number;
  label_mode?: 'yolo' | 'sam';
  text_prompts?: string[];
  confidence_threshold?: number;
  annotation_type?: 'rectangle' | 'polygon';
  return_masks?: boolean;
  sample_selection?: string;
  /** @deprecated 请使用 model_id */
  model_service_id?: number;
}

export interface StartSamBootstrapParams {
  text_prompts: string[];
  bootstrap_limit?: number;
  bootstrap_selection?: 'unlabeled_first' | 'random' | 'all';
  confidence_threshold?: number;
  annotation_type?: 'rectangle' | 'polygon';
  return_masks?: boolean;
}

export const startAutoLabel = (datasetId: number, data: StartAutoLabelParams | Record<string, unknown>) => {
  return commonApi('post', `${Api.AutoLabel}/dataset/${datasetId}/auto-label/start`, { data });
};

export const startSamBootstrap = (datasetId: number, data: StartSamBootstrapParams) => {
  return commonApi('post', `${Api.AutoLabel}/dataset/${datasetId}/auto-label/bootstrap/start`, { data });
};

export const getSamBootstrapStatus = (datasetId: number) => {
  return commonApi('get', `${Api.AutoLabel}/dataset/${datasetId}/auto-label/bootstrap/status`);
};

export const completeSamBootstrapReview = (
  datasetId: number,
  data: { review_passed: boolean; reviewer_note?: string },
) => {
  return commonApi('post', `${Api.AutoLabel}/dataset/${datasetId}/auto-label/bootstrap/complete-review`, { data });
};

export const getAutoLabelTask = (datasetId: number, taskId: number) => {
  return commonApi('get', `${Api.AutoLabel}/dataset/${datasetId}/auto-label/task/${taskId}`);
};

export const listAutoLabelTasks = (datasetId: number, params: any) => {
  return commonApi('get', `${Api.AutoLabel}/dataset/${datasetId}/auto-label/tasks`, { params });
};

export const getAutoLabelModelList = (params = {}) => {
  return commonApi('get', `${Api.Model}/list`, { params });
};

/** @deprecated 自动标注已改为直连模型，请使用 getAutoLabelModelList */
export const getAIServiceList = (params = {}) => {
  return commonApi('get', `${Api.AIService}/list`, { params }, {}, false);
};

export const labelSingleImage = (datasetId: number, imageId: number, data: Record<string, unknown>) => {
  return commonApi('post', `${Api.AutoLabel}/dataset/${datasetId}/auto-label/image/${imageId}`, { data });
};

// —— 以下导入/导出已迁移至 iot-dataset（/dataset/{id}/annotation/*），保留别名兼容旧调用 ——

/** @deprecated 请使用 `exportAnnotationDataset`（@/api/device/dataset） */
export const exportLabeledDataset = (datasetId: number, params: Record<string, unknown>) => {
  const body: DatasetAnnotationExportParams = {
    trainRatio: Number(params.train_ratio ?? 0.7),
    valRatio: Number(params.val_ratio ?? 0.2),
    testRatio: Number(params.test_ratio ?? 0.1),
    sampleSelection: (params.sample_selection ?? params.sample_type ?? 'all') as DatasetAnnotationExportParams['sampleSelection'],
    selectedClasses: (params.selected_classes as string[]) ?? [],
    exportPrefix: String(params.export_prefix ?? params.file_prefix ?? ''),
  };
  return exportAnnotationDataset(datasetId, body);
};

/** @deprecated 请使用 `extractAnnotationFrames`（@/api/device/dataset） */
export const extractFramesFromVideo = extractAnnotationFrames;

/** @deprecated 请使用 `importAnnotationLabelme`（@/api/device/dataset） */
export const importLabelmeDataset = importAnnotationLabelme;
