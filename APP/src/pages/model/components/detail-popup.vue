<template>
  <wd-popup v-model="visible" position="bottom" custom-style="border-radius: 24rpx 24rpx 0 0; max-height: 80vh;">
    <view class="p-32rpx">
      <view class="mb-24rpx text-center text-32rpx font-semibold">
        模型详情
      </view>
      <view v-if="model" class="max-h-60vh overflow-y-auto">
        <view class="mb-24rpx flex items-center gap-24rpx">
          <image
            v-if="displayImageUrl"
            :src="displayImageUrl"
            mode="aspectFill"
            class="h-120rpx w-120rpx rounded-12rpx bg-[#f0f0f0]"
          />
          <view class="min-w-0 flex-1">
            <view class="text-34rpx font-semibold text-[#333]">
              {{ model.name }}
            </view>
            <view class="mt-8rpx text-26rpx text-[#999]">
              v{{ model.version || '-' }}
            </view>
          </view>
          <wd-tag :type="getModelStatusTagType(model.status)" plain>
            {{ getModelStatusText(model.status) }}
          </wd-tag>
        </view>

        <view class="rounded-12rpx bg-[#f7f8f9] p-24rpx">
          <view v-for="row in detailRows" :key="row.label" class="mb-16rpx flex text-28rpx last:mb-0">
            <view class="w-160rpx flex-shrink-0 text-[#999]">
              {{ row.label }}
            </view>
            <view class="flex-1 break-all text-[#333]">
              {{ row.value }}
            </view>
          </view>
        </view>

        <view v-if="classNames.length" class="mt-24rpx">
          <view class="mb-12rpx text-28rpx text-[#666]">
            检测类别（{{ classNames.length }}）
          </view>
          <view class="flex flex-wrap gap-12rpx">
            <wd-tag v-for="cls in classNames.slice(0, 20)" :key="cls" plain>
              {{ cls }}
            </wd-tag>
            <wd-tag v-if="classNames.length > 20" plain>
              +{{ classNames.length - 20 }}
            </wd-tag>
          </view>
        </view>
      </view>
    </view>
  </wd-popup>
</template>

<script lang="ts" setup>
import type { ModelInfo } from '@/api/model'
import { computed, ref } from 'vue'
import { getModelClasses, getModelDetail } from '@/api/model'
import { getModelStatusTagType, getModelStatusText } from '@/utils/model/trainTaskUtils'
import { resolveModelImageDisplayUrl } from '@/utils/mediaDisplay'

const visible = ref(false)
const model = ref<ModelInfo | null>(null)
const classNames = ref<string[]>([])

const displayImageUrl = computed(() => resolveModelImageDisplayUrl(model.value?.imageUrl))

const detailRows = computed(() => {
  if (!model.value)
    return []
  const m = model.value
  return [
    { label: '模型 ID', value: String(m.id) },
    { label: '版本', value: m.version || '-' },
    { label: '描述', value: m.description || '-' },
    { label: '权重路径', value: m.filePath || '-' },
    { label: '创建时间', value: m.createTime || '-' },
  ]
})

async function open(item: ModelInfo) {
  visible.value = true
  model.value = item
  classNames.value = []
  try {
    model.value = await getModelDetail(item.id)
  }
  catch {
    // ignore
  }
  try {
    const res = await getModelClasses(item.id)
    classNames.value = res?.classNames || res?.selectedClassNames || []
  }
  catch {
    classNames.value = item.classNames || []
  }
}

defineExpose({ open })
</script>
