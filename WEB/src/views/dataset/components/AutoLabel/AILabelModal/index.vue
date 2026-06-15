<template>
  <BasicModal
    @register="register"
    width="640px"
    @cancel="handleCancel"
    :canFullscreen="false"
    :showOkBtn="false"
    :showCancelBtn="false"
    :get-container="getContainer"
  >
    <template #title>
      <span class="modal-title-with-icon">
        <Icon icon="ant-design:robot-outlined" class="title-icon" />
        AI 批量自动标注
      </span>
    </template>

    <div class="modal-content">
      <Alert
        type="info"
        show-icon
        class="guide-alert"
        message="使用说明"
      >
        <template #description>
          <ol class="guide-steps">
            <li>在 <strong>训练中心 → 模型管理</strong> 中上传或训练目标检测模型（需有 .pt / .onnx 权重）</li>
            <li>确认本数据集已导入待标注图片（当前 <strong>{{ totalImages }}</strong> 张）</li>
            <li>选择模型并设置置信度，将直连 AI 推理能力批量标注并写回，<strong>无需部署推理服务</strong></li>
          </ol>
        </template>
      </Alert>

      <Alert
        v-if="!modelLoading && modelList.length === 0"
        type="warning"
        show-icon
        class="empty-alert"
        message="暂无可用模型"
      >
        <template #description>
          <p>请先在模型管理中上传或训练模型，完成后点击「刷新列表」。</p>
          <Button type="link" size="small" class="deploy-link" @click="goModelPage">
            前往模型管理
            <Icon icon="ant-design:arrow-right-outlined" />
          </Button>
        </template>
      </Alert>

      <Form
        :model="form"
        :label-col="{ span: 0 }"
        :wrapper-col="{ span: 24 }"
      >
        <FormItem>
          <div class="form-label-row">
            <span class="form-label">选择检测模型</span>
            <Button type="link" size="small" :loading="modelLoading" @click="loadModelList">
              <Icon icon="ant-design:reload-outlined" />
              刷新列表
            </Button>
          </div>
          <Select
            v-model:value="form.model_id"
            placeholder="请选择已上传权重的目标检测模型"
            :loading="modelLoading"
            show-search
            :filter-option="filterModelOption"
            allow-clear
            class="model-select"
            :get-popup-container="getSelectPopupContainer"
          >
            <SelectOption
              v-for="model in modelList"
              :key="model.id"
              :value="model.id"
            >
              {{ formatModelLabel(model) }}
            </SelectOption>
          </Select>
          <div class="form-hint">
            直接使用模型权重推理，无需额外部署；模型类别需与待标注场景匹配
          </div>
        </FormItem>

        <FormItem>
          <div class="form-label">置信度阈值</div>
          <div class="confidence-slider-wrapper">
            <Slider
              v-model:value="form.confidence_threshold"
              :min="0.1"
              :max="0.9"
              :step="0.05"
              class="confidence-slider"
            />
            <div class="confidence-value">{{ form.confidence_threshold }}</div>
          </div>
          <div class="form-hint">
            阈值越高检测越严格、框越少；首次使用建议 0.4~0.5，漏检多时可适当降低
          </div>
        </FormItem>

        <FormItem>
          <div class="scope-note">
            <Icon icon="ant-design:info-circle-outlined" />
            <span>
              任务在后台异步执行，模型仅加载一次以提升性能；可在顶栏查看进度，完成后请抽查并修正误检。
            </span>
          </div>
        </FormItem>
      </Form>
    </div>

    <template #footer>
      <div class="modal-footer-custom">
        <Button
          class="start-ai-label-btn"
          @click="handleStart"
          :loading="loading"
          :disabled="modelList.length === 0 || totalImages === 0"
        >
          <template #icon><Icon icon="ant-design:play-circle-outlined" /></template>
          开启 AI 批量标注
        </Button>
        <Button class="cancel-btn" @click="handleCancel">
          <template #icon><Icon icon="ant-design:close-outlined" /></template>
          取消
        </Button>
      </div>
    </template>
  </BasicModal>
</template>

<script lang="ts" setup>
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { BasicModal, useModal } from '@/components/Modal';
import { Icon } from '@/components/Icon';
import { Alert, Form, FormItem, Select, SelectOption, Slider } from 'ant-design-vue';
import { useMessage } from '@/hooks/web/useMessage';
import { startAutoLabel, getAutoLabelModelList } from '@/api/device/auto-label';
import { Button } from '@/components/Button';

defineOptions({ name: 'AILabelModal' });

interface ModelOption {
  id: number;
  name: string;
  version?: string;
  description?: string;
  model_path?: string;
  onnx_model_path?: string;
}

const props = defineProps<{
  datasetId?: number;
  totalImages?: number;
  getContainer?: () => HTMLElement;
}>();

const router = useRouter();
const getSelectPopupContainer = (): HTMLElement => props.getContainer?.() ?? document.body;

const { createMessage } = useMessage();

const emits = defineEmits(['success']);

const loading = ref(false);
const modelLoading = ref(false);
const modelList = ref<ModelOption[]>([]);

const form = reactive({
  model_id: undefined as number | undefined,
  confidence_threshold: 0.5,
});

const [register, { openModal, closeModal }] = useModal();

function hasModelWeights(model: Record<string, unknown>): boolean {
  return Boolean(
    model.model_path || model.onnx_model_path || model.torchscript_model_path
      || model.tensorrt_model_path || model.openvino_model_path,
  );
}

function formatModelLabel(model: ModelOption): string {
  const version = model.version ? ` · v${model.version}` : '';
  return `${model.name}${version}`;
}

async function loadModelList() {
  try {
    modelLoading.value = true;
    const response = await getAutoLabelModelList({ pageNo: 1, pageSize: 200 });

    let rawList: Record<string, unknown>[] = [];
    if (Array.isArray(response)) {
      rawList = response;
    } else if (response?.data && Array.isArray(response.data)) {
      rawList = response.data;
    } else if (response?.list && Array.isArray(response.list)) {
      rawList = response.list;
    }

    modelList.value = rawList
      .filter((m) => hasModelWeights(m))
      .map((model) => ({
        id: model.id as number,
        name: (model.name || `模型 ${model.id}`) as string,
        version: model.version as string | undefined,
        description: model.description as string | undefined,
        model_path: model.model_path as string | undefined,
        onnx_model_path: model.onnx_model_path as string | undefined,
      }));
  } catch {
    createMessage.error('加载模型列表失败');
    modelList.value = [];
  } finally {
    modelLoading.value = false;
  }
}

const filterModelOption = (input: string, option: { children?: { children?: string }[] }) => {
  const label = option?.children?.[0]?.children ?? '';
  return String(label).toLowerCase().includes(input.toLowerCase());
};

function goModelPage() {
  closeModal();
  router.push({ path: '/train', query: { tab: '1' } });
}

async function handleStart() {
  if (!form.model_id) {
    createMessage.warning('请选择检测模型');
    return;
  }

  const dsId = props.datasetId;
  if (!dsId) {
    createMessage.warning('请先选择数据集');
    return;
  }

  if ((props.totalImages ?? 0) <= 0) {
    createMessage.warning('数据集暂无图片，请先导入或上传');
    return;
  }

  try {
    loading.value = true;
    const res = await startAutoLabel(dsId, {
      model_id: form.model_id,
      confidence_threshold: form.confidence_threshold,
    });

    if (res && (res.task_id || res.data?.task_id)) {
      const taskId = res.task_id || res.data?.task_id;
      createMessage.success('AI 批量标注任务已启动，请在顶栏查看进度');
      closeModal();
      emits('success', { taskId });
    } else if (res && res.code === 0) {
      createMessage.success('AI 批量标注任务已启动，请在顶栏查看进度');
      closeModal();
      emits('success', { taskId: res.data?.task_id });
    } else {
      createMessage.error(res?.msg || '启动 AI 批量标注失败');
    }
  } catch (error: unknown) {
    const err = error as { response?: { data?: { msg?: string } }; message?: string };
    const errorMsg = err?.response?.data?.msg || err?.message || '启动 AI 批量标注失败';
    createMessage.error(errorMsg);
  } finally {
    loading.value = false;
  }
}

const openModalWithLoad = () => {
  loadModelList();
  openModal();
};

defineExpose({
  openModal: openModalWithLoad,
  closeModal,
  form,
  loadModelList,
});

function handleCancel() {
  closeModal();
}
</script>

<style lang="less" scoped>
.modal-content {
  padding: 20px 24px 8px;

  :deep(.ant-form-item) {
    margin-bottom: 20px;

    &:last-child {
      margin-bottom: 0;
    }
  }
}

.guide-alert {
  margin-bottom: 16px;

  .guide-steps {
    margin: 8px 0 0;
    padding-left: 18px;
    color: #595959;
    font-size: 13px;
    line-height: 1.7;

    li + li {
      margin-top: 4px;
    }
  }
}

.empty-alert {
  margin-bottom: 16px;

  p {
    margin: 0 0 4px;
    color: #595959;
  }

  .deploy-link {
    padding-left: 0;
    height: auto;
  }
}

.form-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.form-label {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  line-height: 22px;
}

.model-select {
  width: 100%;
}

.form-hint {
  margin-top: 8px;
  font-size: 12px;
  color: #999;
  line-height: 1.5;
}

.scope-note {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  background: #f6ffed;
  border: 1px solid #b7eb8f;
  border-radius: 6px;
  font-size: 12px;
  color: #595959;
  line-height: 1.6;
}

.confidence-slider-wrapper {
  position: relative;
  padding-right: 50px;
  padding-top: 8px;
  padding-bottom: 8px;

  .confidence-value {
    position: absolute;
    top: 8px;
    right: 0;
    font-size: 14px;
    font-weight: 500;
    color: #333;
    line-height: 22px;
    min-width: 40px;
    text-align: right;
  }
}

.modal-title-with-icon {
  display: flex;
  align-items: center;
  gap: 8px;

  .title-icon {
    font-size: 18px;
    color: #333;
  }
}

.modal-footer-custom {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #e8e8e8;

  .start-ai-label-btn {
    background: #1890ff !important;
    border-color: #1890ff !important;
    color: #fff !important;
    height: 32px;
    padding: 4px 15px;
    font-size: 14px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    gap: 6px;

    &:disabled {
      opacity: 0.55;
    }
  }

  .cancel-btn {
    height: 32px;
    padding: 4px 15px;
    font-size: 14px;
    border-radius: 4px;
  }
}
</style>
