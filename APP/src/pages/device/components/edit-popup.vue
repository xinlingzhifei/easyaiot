<template>
  <wd-popup v-model="visible" position="bottom" custom-style="border-radius: 24rpx 24rpx 0 0; max-height: 90vh;">
    <view class="p-32rpx">
      <view class="mb-24rpx text-center text-32rpx font-semibold">
        编辑设备
      </view>

      <scroll-view scroll-y class="max-h-70vh">
        <view class="mb-24rpx">
          <view class="mb-12rpx text-26rpx text-[#666]">
            设备名称 <text class="text-[#f56c6c]">*</text>
          </view>
          <wd-input v-model="form.name" placeholder="请输入设备名称" clearable />
        </view>

        <view class="mb-24rpx">
          <view class="mb-12rpx text-26rpx text-[#666]">
            RTSP 地址
          </view>
          <wd-textarea v-model="form.source" placeholder="rtsp://..." :maxlength="500" />
        </view>

        <view class="mb-24rpx">
          <view class="mb-12rpx text-26rpx text-[#666]">
            IP 地址
          </view>
          <wd-input v-model="form.ip" placeholder="可选" clearable />
        </view>

        <view class="mb-24rpx">
          <view class="mb-12rpx text-26rpx text-[#666]">
            端口
          </view>
          <wd-input v-model="portText" type="number" placeholder="554" clearable />
        </view>

        <view class="mb-24rpx">
          <view class="mb-12rpx text-26rpx text-[#666]">
            用户名
          </view>
          <wd-input v-model="form.username" placeholder="可选" clearable />
        </view>

        <view class="mb-24rpx">
          <view class="mb-12rpx text-26rpx text-[#666]">
            密码
          </view>
          <wd-input v-model="form.password" placeholder="可选" show-password clearable />
        </view>
      </scroll-view>

      <view class="mt-24rpx flex gap-24rpx">
        <wd-button class="flex-1" plain @click="visible = false">
          取消
        </wd-button>
        <wd-button class="flex-1" type="primary" :loading="submitting" @click="handleSubmit">
          保存
        </wd-button>
      </view>
    </view>
  </wd-popup>
</template>

<script lang="ts" setup>
import type { DeviceInfo } from '@/api/video/camera'
import { computed, reactive, ref } from 'vue'
import { useToast } from '@wot-ui/ui/components/wd-toast'
import { updateDevice } from '@/api/video/camera'

const emit = defineEmits<{ success: [] }>()
const toast = useToast()
const visible = ref(false)
const deviceId = ref('')
const submitting = ref(false)

const form = reactive({
  name: '',
  source: '',
  ip: '',
  port: undefined as number | undefined,
  username: '',
  password: '',
})

const portText = computed({
  get: () => form.port == null ? '' : String(form.port),
  set: (val: string) => {
    form.port = val === '' ? undefined : Number(val)
  },
})

function resetForm() {
  form.name = ''
  form.source = ''
  form.ip = ''
  form.port = undefined
  form.username = ''
  form.password = ''
}

async function handleSubmit() {
  if (!form.name.trim()) {
    toast.warning('请输入设备名称')
    return
  }

  submitting.value = true
  try {
    await updateDevice(deviceId.value, {
      name: form.name.trim(),
      source: form.source.trim() || undefined,
      ip: form.ip.trim() || undefined,
      port: form.port,
      username: form.username.trim() || undefined,
      password: form.password || undefined,
    })
    toast.success('保存成功')
    visible.value = false
    emit('success')
  }
  catch (err: any) {
    toast.error(err?.msg || err?.message || '保存失败')
  }
  finally {
    submitting.value = false
  }
}

function openEdit(device: DeviceInfo) {
  deviceId.value = device.id
  resetForm()
  form.name = device.name || ''
  form.source = device.source || ''
  form.ip = device.ip || ''
  form.port = device.port
  visible.value = true
}

defineExpose({ openEdit })
</script>
