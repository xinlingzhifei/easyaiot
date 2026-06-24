<template>
  <view class="yd-page-container yd-page-container-paging">
    <wd-navbar title="模型推理" placeholder safe-area-inset-top fixed>
      <template #right>
        <AppNavUserButton />
      </template>
    </wd-navbar>

    <!-- 推理工作台 -->
    <view class="mx-24rpx mt-16rpx rounded-12rpx bg-white p-24rpx shadow-sm">
      <view class="mb-24rpx text-30rpx font-semibold text-[#333]">
        图片推理
      </view>

      <view class="mb-24rpx">
        <view class="mb-12rpx text-26rpx text-[#666]">
          选择模型
        </view>
        <view
          class="flex items-center justify-between rounded-8rpx bg-[#f7f8f9] px-24rpx py-20rpx"
          @click="pickerVisible = true"
        >
          <text class="text-28rpx" :class="selectedModelLabel ? 'text-[#333]' : 'text-[#999]'">
            {{ selectedModelLabel || '请选择模型' }}
          </text>
          <wd-icon name="arrow-right" size="16px" color="#999" />
        </view>
        <wd-picker
          v-model:visible="pickerVisible"
          :model-value="selectedModelValue"
          :columns="modelOptions"
          label-key="label"
          value-key="value"
          @confirm="handleModelConfirm"
        />
      </view>

      <view class="mb-24rpx">
        <view class="mb-12rpx text-26rpx text-[#666]">
          输入图片
        </view>
        <view
          class="flex h-240rpx items-center justify-center rounded-12rpx border-2 border-[#eee] border-dashed bg-[#fafafa]"
          @click="chooseImage"
        >
          <image
            v-if="inputImagePath"
            :src="inputImagePath"
            mode="aspectFit"
            class="h-full w-full rounded-12rpx"
          />
          <view v-else class="text-center text-[#999]">
            <view class="i-carbon-image text-64rpx" />
            <view class="mt-12rpx text-26rpx">
              点击选择图片
            </view>
          </view>
        </view>
      </view>

      <wd-button type="primary" block :loading="inferencing" :disabled="!canInfer" @click="handleInfer">
        {{ inferencing ? '推理中...' : '开始推理' }}
      </wd-button>

      <ResultPanel
        :input-image-url="displayInputUrl"
        :result-image-url="displayResultUrl"
        :detection-count="detectionCount"
        :average-confidence="averageConfidence"
      />
    </view>

    <!-- 历史记录 -->
    <view class="mx-24rpx mt-16rpx mb-16rpx text-28rpx font-semibold text-[#666]">
      推理历史
    </view>

    <z-paging
      ref="pagingRef"
      v-model="historyList"
      :fixed="false"
      class="min-h-0 flex-1"
      :default-page-size="10"
      empty-view-text="暂无推理记录"
      @query="queryHistory"
    >
      <view class="px-24rpx pb-24rpx">
        <view
          v-for="item in historyList"
          :key="item.id"
          class="mb-16rpx rounded-12rpx bg-white p-24rpx shadow-sm"
          :class="{ 'ring-2 ring-[#1890ff]': activeHistoryId === item.id }"
          @click="handleHistoryClick(item)"
        >
          <view class="flex gap-16rpx">
            <image
              v-if="getHistoryThumb(item)"
              :src="getHistoryThumb(item)"
              mode="aspectFill"
              class="h-100rpx w-100rpx flex-shrink-0 rounded-8rpx bg-[#f0f0f0]"
            />
            <view class="min-w-0 flex-1">
              <view class="truncate text-28rpx font-semibold text-[#333]">
                {{ item.model_name || `模型 #${item.model_id}` }}
              </view>
              <view class="mt-8rpx text-24rpx text-[#999]">
                {{ item.inference_type || 'image' }} · {{ formatDateTime(item.create_time) }}
              </view>
              <view class="mt-8rpx">
                <wd-tag plain>
                  {{ item.status || '完成' }}
                </wd-tag>
              </view>
            </view>
          </view>
        </view>
      </view>
    </z-paging>
  </view>
</template>

<script lang="ts" setup>
import type { InferenceTask } from '@/api/model/inference'
import type { ModelInfo } from '@/api/model'
import { computed, onMounted, ref } from 'vue'
import { useToast } from '@wot-ui/ui/components/wd-toast'
import { getModelPage } from '@/api/model'
import {
  getInferenceTaskDetail,
  getInferenceTasks,
  isPresetModelId,
  PRESET_MODEL_OPTIONS,
  runImageInference,
} from '@/api/model/inference'
import AppNavUserButton from '@/components/app-nav-user-button.vue'
import { formatDateTime } from '@/utils/date'
import { parseListResponse } from '@/utils/listResponse'
import { parseInferenceHistoryItem, parseInferenceResult } from '@/utils/model/inferenceResult'
import ResultPanel from './components/result-panel.vue'

definePage({
  style: {
    navigationStyle: 'custom',
  },
})

const toast = useToast()
const models = ref<ModelInfo[]>([])
const pickerVisible = ref(false)
const selectedModelValue = ref<string>('')
const selectedModelId = ref<string | number>('')
const inputImagePath = ref('')
const displayInputUrl = ref('')
const displayResultUrl = ref('')
const detectionCount = ref<number | undefined>()
const averageConfidence = ref<number | undefined>()
const inferencing = ref(false)
const historyList = ref<InferenceTask[]>([])
const pagingRef = ref<any>()
const activeHistoryId = ref<number | null>(null)

const modelOptions = computed(() => {
  const preset = PRESET_MODEL_OPTIONS.map(o => ({ value: o.value, label: o.label }))
  const custom = models.value.map(m => ({ value: String(m.id), label: `${m.name} (v${m.version || '-'})` }))
  return preset.concat(custom)
})

const selectedModelLabel = computed(() => {
  return modelOptions.value.find(o => o.value === selectedModelValue.value)?.label || ''
})

const canInfer = computed(() => !!selectedModelId.value && !!inputImagePath.value && !inferencing.value)

function applyResultView(view: ReturnType<typeof parseInferenceResult>, fallbackInput?: string) {
  displayInputUrl.value = view.inputImageUrl || fallbackInput || displayInputUrl.value
  displayResultUrl.value = view.resultImageUrl || ''
  detectionCount.value = view.detectionCount
  averageConfidence.value = view.averageConfidence
}

async function loadModels() {
  try {
    const res = await getModelPage({ pageNo: 1, pageSize: 200 })
    const { list } = parseListResponse<ModelInfo>(res, ['data'])
    models.value = list
  }
  catch {
    models.value = []
  }
}

function handleModelConfirm({ value }: { value: string[] }) {
  selectedModelValue.value = value[0] || ''
  selectedModelId.value = selectedModelValue.value
}

function chooseImage() {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      inputImagePath.value = res.tempFilePaths[0]
      displayInputUrl.value = res.tempFilePaths[0]
      displayResultUrl.value = ''
      detectionCount.value = undefined
      averageConfidence.value = undefined
      activeHistoryId.value = null
    },
  })
}

async function handleInfer() {
  if (!canInfer.value)
    return
  inferencing.value = true
  displayInputUrl.value = inputImagePath.value
  try {
    const res = await runImageInference(selectedModelId.value, inputImagePath.value)
    const view = parseInferenceResult(res)
    applyResultView(view, inputImagePath.value)
    if (view.resultImageUrl) {
      toast.success(`推理完成，检测到 ${view.detectionCount ?? 0} 个目标`)
    }
    else {
      toast.success('推理完成')
    }
    activeHistoryId.value = view.recordId ?? null
    pagingRef.value?.reload()
  }
  catch {
    toast.error('推理失败')
  }
  finally {
    inferencing.value = false
  }
}

function getHistoryThumb(item: InferenceTask) {
  const view = parseInferenceHistoryItem(item)
  return view.resultImageUrl || view.inputImageUrl || ''
}

async function queryHistory(pageNo: number, pageSize: number) {
  try {
    const params: Record<string, any> = { pageNo, pageSize }
    if (selectedModelId.value && !isPresetModelId(selectedModelId.value)) {
      params.model_id = Number(selectedModelId.value)
    }
    const res = await getInferenceTasks(params)
    const { list, total } = parseListResponse<InferenceTask>(res, ['data', 'list'])
    pagingRef.value?.completeByTotal(list, total)
  }
  catch {
    pagingRef.value?.complete(false)
  }
}

async function handleHistoryClick(item: InferenceTask) {
  activeHistoryId.value = item.id
  try {
    const detail = await getInferenceTaskDetail(item.id)
    const view = parseInferenceResult({ ...item, ...detail })
    applyResultView(view)
    uni.pageScrollTo?.({ scrollTop: 0, duration: 200 })
  }
  catch {
    const view = parseInferenceHistoryItem(item)
    applyResultView(view)
  }
}

onMounted(() => {
  loadModels()
})
</script>
