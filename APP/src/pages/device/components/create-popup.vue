<template>
  <wd-popup v-model="visible" position="bottom" custom-style="border-radius: 24rpx 24rpx 0 0; max-height: 85vh;">
    <view class="p-32rpx">
      <view class="mb-24rpx text-center text-32rpx font-semibold">
        添加设备
      </view>

      <scroll-view scroll-y class="max-h-60vh">
        <view class="mb-24rpx">
          <view class="mb-12rpx text-26rpx text-[#666]">
            设备名称
          </view>
          <wd-input v-model="form.name" placeholder="可选，默认可由系统生成" clearable />
        </view>

        <view class="mb-24rpx">
          <view class="mb-12rpx text-26rpx text-[#666]">
            RTSP 地址 <text class="text-[#f56c6c]">*</text>
          </view>
          <wd-textarea
            v-model="form.source"
            placeholder="rtsp://username:password@ip:port/path"
            :maxlength="500"
          />
        </view>
      </scroll-view>

      <view class="mt-24rpx flex gap-24rpx">
        <wd-button class="flex-1" plain @click="visible = false">
          取消
        </wd-button>
        <wd-button class="flex-1" type="primary" :loading="submitting" @click="handleSubmit">
          注册
        </wd-button>
      </view>
    </view>
  </wd-popup>
</template>

<script lang="ts" setup>
import { reactive, ref } from 'vue'
import { useToast } from '@wot-ui/ui/components/wd-toast'
import { registerDevice } from '@/api/video/camera'

const emit = defineEmits<{ success: [] }>()
const toast = useToast()
const visible = ref(false)
const submitting = ref(false)

const form = reactive({
  name: '',
  source: '',
})

function resetForm() {
  form.name = ''
  form.source = ''
}

async function handleSubmit() {
  const source = form.source.trim()
  if (!source) {
    toast.warning('请输入 RTSP 地址')
    return
  }

  submitting.value = true
  try {
    await registerDevice({
      name: form.name.trim() || `设备_${Date.now()}`,
      source,
    })
    toast.success('设备注册成功')
    visible.value = false
    emit('success')
  }
  catch (err: any) {
    toast.error(err?.msg || err?.message || '注册失败')
  }
  finally {
    submitting.value = false
  }
}

function openCreate() {
  resetForm()
  visible.value = true
}

defineExpose({ openCreate })
</script>
