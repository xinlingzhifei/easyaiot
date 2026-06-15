<template>
  <div class="sam-inference-page">
    <GpuStackMonitorTip class="page-monitor-tip" />
    <div class="sam-layout">
      <div class="sam-panel sam-input-panel">
        <div class="panel-title">
          <Icon icon="ant-design:experiment-outlined" />
          SAM 万物识别
        </div>
        <Alert type="info" show-icon class="hint-alert" message="使用英文类别词描述目标，如 car、fire、person with helmet" />

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

        <Button type="primary" block :loading="loading" :disabled="!imageFile || !textPrompts.length" @click="runPredict">
          开始识别
        </Button>

        <div v-if="health" class="health-info">
          服务: {{ health.status }} · 引擎 {{ health.engine }} · {{ health.device }}
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
import { onMounted, ref, watch } from 'vue';
import { Alert, Button, Checkbox, Select, Slider } from 'ant-design-vue';
import { Icon } from '@/components/Icon';
import GpuStackMonitorTip from '@/components/GpuStackMonitorTip/index.vue';
import { getSamHealth, samPredict, fileToBase64, type SamPredictResult } from '@/api/device/sam';
import { useMessage } from '@/hooks/web/useMessage';

defineOptions({ name: 'SamInferencePage' });

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

onMounted(async () => {
  try {
    health.value = await getSamHealth();
  } catch {
    health.value = { status: 'unknown' };
  }
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
    createMessage.error(e?.message || '识别失败');
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
.hint-alert {
  margin-bottom: 12px;
}
</style>
