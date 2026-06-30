<template>
  <div class="sam-inference-page">
    <!-- 模型状态提示区 -->
    <div v-if="!modelReady" class="model-status-bar">
      <!-- 正在检测 -->
      <Alert v-if="!modelChecked" type="info" show-icon message="正在检测 SAM 模型环境…">
        <template #icon><LoadingOutlined spin /></template>
      </Alert>

      <!-- 模型未下载 -->
      <Alert
        v-else-if="!modelDownloading && !downloadStarted"
        type="warning"
        show-icon
        :message="modelError || 'SAM 3.1 模型权重尚未安装'"
      >
        <template #description>
          <p class="model-alert-desc">
            模型文件约 <strong>3.3 GB</strong>，首次需从魔塔 ModelScope 下载并安装至 AI 服务本地。下载一次后即可长期使用。
          </p>
          <Button
            type="primary"
            size="small"
            :loading="downloadStarting"
            @click="handleDownloadModel"
          >
            <template #icon><CloudDownloadOutlined /></template>
            {{ downloadStarting ? '正在启动…' : '立即下载模型' }}
          </Button>
        </template>
      </Alert>

      <!-- 下载中 -->
      <div v-else-if="showProgressPanel" class="model-download-card">
        <div class="download-card-header">
          <LoadingOutlined spin class="download-spin-icon" />
          <span class="download-title">正在下载 SAM 3.1 模型权重</span>
          <Tag color="processing">下载中</Tag>
        </div>
        <div class="download-card-body">
          <Progress
            :percent="downloadProgress"
            :status="modelDownloadJustFinished ? 'success' : 'active'"
            :stroke-color="{ from: '#266cfb', to: '#5ba3f5' }"
          />
          <div class="download-meta">
            <span>{{ downloadStageText }}</span>
            <span v-if="modelStatus?.downloaded_bytes && modelStatus?.total_bytes">
              {{ formatSize(modelStatus.downloaded_bytes) }} / {{ formatSize(modelStatus.total_bytes) }}
            </span>
          </div>
          <p class="download-footnote">
            <InfoCircleOutlined />
            下载在 AI 服务端后台进行，支持断点续传；可关闭页面稍后回来继续
          </p>
        </div>
      </div>

      <!-- 下载出错 -->
      <Alert
        v-else-if="modelStatus?.stage === 'error'"
        type="error"
        show-icon
        :message="modelError || '模型下载失败'"
      >
        <template #description>
          <Button type="primary" size="small" @click="handleDownloadModel">重新下载</Button>
        </template>
      </Alert>
    </div>

    <div class="sam-layout">
      <div class="sam-panel sam-input-panel">
        <div class="panel-title">
          <Icon icon="ant-design:experiment-outlined" />
          SAM 万物识别
        </div>
        <Alert type="info" show-icon class="hint-alert" message="使用英文类别词描述目标，如 car、fire、person with helmet" />
        <Alert v-if="samUnavailableMessage" type="warning" show-icon class="hint-alert" :message="samUnavailableMessage" />

        <div class="field-block">
          <label>文本类别（Tag，英文）</label>
          <Select
            v-model:value="textPrompts"
            mode="tags"
            placeholder="输入后回车，如 car、helmet"
            :token-separators="[',']"
            style="width: 100%"
          />
        </div>

        <div class="field-block">
          <label>置信度 {{ conf }}</label>
          <Slider v-model:value="conf" :min="0.1" :max="0.9" :step="0.05" />
        </div>

        <div class="field-block">
          <Checkbox v-model:checked="returnMasks">返回分割 mask</Checkbox>
        </div>

        <div class="field-block">
          <label>上传图片</label>
          <input type="file" accept="image/*" @change="onFileChange" />
        </div>

        <Button type="primary" block :loading="loading" :disabled="!canPredict" @click="runPredict">
          开始识别
        </Button>

        <div v-if="health" class="health-info">
          服务: {{ health.status }} · 引擎 {{ health.engine }} · {{ health.device }}
          <span v-if="modelReady" class="health-model-ok"> · 模型已就绪</span>
          <span v-else class="health-model-pending"> · 模型未就绪</span>
        </div>
      </div>

      <div class="sam-panel sam-result-panel">
        <div class="panel-title">识别结果</div>
        <div v-if="!previewUrl" class="empty-hint">请上传图片并运行识别</div>
        <div v-else class="canvas-wrap">
          <img ref="imgRef" :src="previewUrl" class="base-img" @load="drawOverlay" />
          <canvas ref="canvasRef" class="overlay-canvas" />
        </div>
        <div v-if="result" class="result-meta">
          耗时 {{ result.inference_ms ?? '-' }} ms · 检出 {{ result.predictions?.length ?? 0 }} 个目标
        </div>
        <div v-if="result?.predictions?.length" class="pred-list">
          <div v-for="(p, i) in result.predictions" :key="i" class="pred-item">
            {{ p.class_name }} · {{ (p.confidence * 100).toFixed(1) }}%
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { Alert, Button, Checkbox, Progress, Select, Slider, Tag } from 'ant-design-vue';
import { CloudDownloadOutlined, InfoCircleOutlined, LoadingOutlined } from '@ant-design/icons-vue';
import { Icon } from '@/components/Icon';
import {
  getSamHealth,
  getSamModelStatus,
  downloadSamModel,
  samPredict,
  fileToBase64,
  parseSamApiError,
  type SamModelStatus,
  type SamPredictResult,
} from '@/api/device/sam';
import { canRunSamPredict, getSamUnavailableMessage } from '@/api/device/samHealth';
import { useMessage } from '@/hooks/web/useMessage';

defineOptions({ name: 'SamInferencePage' });

const POLL_INTERVAL_MS = 1500;

const { createMessage } = useMessage();
const textPrompts = ref<string[]>([]);
const conf = ref(0.45);
const returnMasks = ref(true);
const imageFile = ref<File | null>(null);
const previewUrl = ref('');
const loading = ref(false);
const result = ref<SamPredictResult | null>(null);
const health = ref<any>(null);
const imgRef = ref<HTMLImageElement>();
const canvasRef = ref<HTMLCanvasElement>();
const samUnavailableMessage = computed(() => getSamUnavailableMessage(health.value));
const canPredict = computed(() =>
  !!imageFile.value && !!textPrompts.value.length && modelReady.value && canRunSamPredict(health.value),
);

// ---- 模型检测与下载状态 ----
const modelChecked = ref(false);
const modelStatus = ref<SamModelStatus | null>(null);
const downloadStarted = ref(false);
const downloadStarting = ref(false);
const modelDownloadJustFinished = ref(false);
const modelError = ref<string | null>(null);
const pollTimer = ref<ReturnType<typeof setInterval> | null>(null);
const finishTimer = ref<ReturnType<typeof setTimeout> | null>(null);

const modelReady = computed(() => !!modelStatus.value?.exists);
const modelDownloading = computed(() => !!modelStatus.value?.downloading);
const showProgressPanel = computed(
  () => modelDownloading.value || downloadStarted.value || modelDownloadJustFinished.value,
);
const downloadProgress = computed(() => {
  if (modelDownloadJustFinished.value) return 100;
  return modelStatus.value?.progress ?? 0;
});
const downloadStageText = computed(() => {
  const stage = modelStatus.value?.stage;
  if (stage === 'installing') return '正在写入模型文件…';
  if (stage === 'downloading') return '正在从 ModelScope 下载 SAM 3.1…';
  if (modelDownloadJustFinished.value) return '下载完成';
  return '准备下载…';
});

function startPolling() {
  stopPolling();
  pollTimer.value = setInterval(refreshModelStatus, POLL_INTERVAL_MS);
}

function stopPolling() {
  if (pollTimer.value) {
    clearInterval(pollTimer.value);
    pollTimer.value = null;
  }
}

async function refreshModelStatus() {
  const wasReady = modelReady.value;
  try {
    const res = await getSamModelStatus();
    const data = res?.data;
    if (!data) return;
    modelStatus.value = data;
    modelChecked.value = true;
    if (data.exists) {
      stopPolling();
      downloadStarted.value = false;
      modelError.value = null;
      // 仅当从「未就绪→就绪」转换时才弹提示（首次加载不弹）
      if (!wasReady && modelChecked.value && downloadStarted.value) {
        modelDownloadJustFinished.value = true;
        finishTimer.value = setTimeout(() => {
          modelDownloadJustFinished.value = false;
        }, 2000);
        createMessage.success('SAM 模型已安装完成，可以开始识别');
        try { health.value = await getSamHealth(); } catch { /* ignore */ }
      }
    } else if (data.stage === 'error') {
      downloadStarted.value = false;
      modelError.value = data.error || '模型下载失败';
    }
  } catch {
    if (!modelChecked.value) {
      modelError.value = '无法连接模型服务，请确认 AI 服务已启动';
      modelChecked.value = true;
    }
  }
}

async function handleDownloadModel() {
  downloadStarting.value = true;
  modelDownloadJustFinished.value = false;
  downloadStarted.value = true;
  modelError.value = null;
  try {
    const res = await downloadSamModel();
    if (res?.data) {
      modelStatus.value = {
        exists: !!res.data.exists,
        filename: res.data.filename || 'sam3.1_multiplex.pt',
        path: res.data.path,
        size_bytes: res.data.size_bytes ?? 0,
        downloading: !!res.data.downloading,
        resumable: !!res.data.resumable,
        stage: res.data.stage,
        progress: res.data.progress ?? 0,
        downloaded_bytes: res.data.downloaded_bytes,
        total_bytes: res.data.total_bytes,
        error: res.data.error,
      };
    }
    startPolling();
  } catch (error: unknown) {
    downloadStarted.value = false;
    modelError.value = parseSamApiError(error, '触发下载失败');
    createMessage.error(modelError.value);
  } finally {
    downloadStarting.value = false;
  }
}

function formatSize(bytes?: number) {
  if (!bytes || bytes <= 0) return '--';
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

// ---- 推理功能 ----

onMounted(async () => {
  try {
    health.value = await getSamHealth();
  } catch {
    health.value = { status: 'unknown' };
  }
  await refreshModelStatus();
  if (modelDownloading.value && !downloadStarted.value) {
    // 服务端后台正在下载中，加入轮询
    downloadStarted.value = true;
    startPolling();
  }
});

onBeforeUnmount(() => {
  stopPolling();
  if (finishTimer.value) clearTimeout(finishTimer.value);
});

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  imageFile.value = file;
  previewUrl.value = URL.createObjectURL(file);
  result.value = null;
}

async function runPredict() {
  if (!imageFile.value || !textPrompts.value.length) return;
  if (samUnavailableMessage.value) {
    createMessage.warning(samUnavailableMessage.value);
    return;
  }
  if (!modelReady.value) {
    createMessage.warning('SAM 模型尚未就绪，请先下载模型权重');
    return;
  }
  loading.value = true;
  try {
    const b64 = await fileToBase64(imageFile.value);
    result.value = await samPredict({
      image_base64: b64,
      text: textPrompts.value,
      return_masks: returnMasks.value,
      conf: conf.value,
    });
    await drawOverlay();
  } catch (e: any) {
    const msg = e?.message || '识别失败';
    createMessage.error(msg);
    // 如果是因为模型未加载触发，刷新状态
    if (msg.includes('模型') || msg.includes('model')) {
      refreshModelStatus();
    }
  } finally {
    loading.value = false;
  }
}

async function drawOverlay() {
  await new Promise((r) => requestAnimationFrame(r));
  const img = imgRef.value;
  const canvas = canvasRef.value;
  if (!img || !canvas || !result.value) return;
  canvas.width = img.clientWidth;
  canvas.height = img.clientHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const [oh, ow] = result.value.orig_shape || [img.naturalHeight, img.naturalWidth];
  const sx = canvas.width / ow;
  const sy = canvas.height / oh;

  if (returnMasks.value && result.value.masks?.length) {
    ctx.fillStyle = 'rgba(114, 46, 209, 0.25)';
    for (const mask of result.value.masks) {
      const contour = mask.xy?.[0];
      if (!contour?.length) continue;
      ctx.beginPath();
      contour.forEach(([x, y], i) => {
        const px = x * sx;
        const py = y * sy;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.closePath();
      ctx.fill();
    }
  }

  ctx.strokeStyle = '#722ed1';
  ctx.lineWidth = 2;
  for (const p of result.value.predictions || []) {
    const [x1, y1, x2, y2] = p.bbox;
    ctx.strokeRect(x1 * sx, y1 * sy, (x2 - x1) * sx, (y2 - y1) * sy);
    ctx.fillStyle = '#722ed1';
    ctx.fillText(p.class_name, x1 * sx, Math.max(12, y1 * sy - 4));
  }
}

watch(result, () => drawOverlay());
</script>

<style lang="less" scoped>
.sam-inference-page {
  padding: 16px;
}

/* ---- 模型状态栏 ---- */
.model-status-bar {
  margin-bottom: 16px;
}

.model-alert-desc {
  margin: 0 0 10px;
  line-height: 1.6;
  color: rgba(0, 0, 0, 0.6);

  strong {
    color: #d46b08;
  }
}

.model-download-card {
  background: #fff;
  border: 1px solid #e8ecf1;
  border-radius: 8px;
  padding: 16px 20px;
}

.download-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.download-spin-icon {
  color: #266cfb;
  font-size: 18px;
}

.download-title {
  flex: 1;
  font-weight: 600;
  font-size: 14px;
}

.download-card-body {
  :deep(.ant-progress-bg) {
    border-radius: 4px;
  }
}

.download-meta {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.download-footnote {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 12px 0 0;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.4);
  padding: 8px 10px;
  background: #f8faff;
  border-radius: 6px;
}

/* ---- 原有布局 ---- */
.sam-layout {
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 16px;
  min-height: 520px;
}
.sam-panel {
  background: var(--component-background, #fff);
  border: 1px solid var(--border-color-base, #f0f0f0);
  border-radius: 8px;
  padding: 16px;
}
.panel-title {
  font-weight: 600;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.field-block {
  margin-bottom: 16px;
  label {
    display: block;
    margin-bottom: 6px;
    color: rgba(0, 0, 0, 0.65);
  }
}
.canvas-wrap {
  position: relative;
  max-width: 100%;
}
.base-img {
  max-width: 100%;
  display: block;
}
.overlay-canvas {
  position: absolute;
  left: 0;
  top: 0;
  pointer-events: none;
}
.empty-hint {
  color: rgba(0, 0, 0, 0.45);
  padding: 48px 0;
  text-align: center;
}
.pred-list {
  margin-top: 12px;
}
.pred-item {
  padding: 4px 0;
  border-bottom: 1px dashed #f0f0f0;
}
.health-info {
  margin-top: 12px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}
.health-model-ok {
  color: #52c41a;
  font-weight: 500;
}
.health-model-pending {
  color: #faad14;
}
.hint-alert {
  margin-bottom: 12px;
}
</style>
