<template>
  <BasicModal
    v-bind="$attrs"
    @register="register"
    title="告警图片"
    :footer="null"
    :maskClosable="true"
    @cancel="handleCancel"
  >
    <div class="monitor-dialog monitor-dialog--vod">
      <div class="monitor-dialog__vod-viewer">
        <div class="monitor-dialog__video-body">
          <div v-if="loading" class="monitor-dialog__loading">
            <Spin size="large" />
            <span>加载中...</span>
          </div>
          <img
            v-else-if="imageUrl"
            :src="imageUrl"
            alt="告警图片"
            class="monitor-dialog__alert-image"
            @error="handleImageError"
            @load="handleImageLoad"
          />
          <div v-else class="monitor-dialog__loading">
            <Icon icon="ant-design:picture-outlined" :size="48" />
            <span>图片加载失败</span>
          </div>
        </div>
      </div>
    </div>
  </BasicModal>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { BasicModal, useModalInner } from '@/components/Modal';
import { Spin } from 'ant-design-vue';
import { Icon } from '@/components/Icon';
import { useMessage } from '@/hooks/web/useMessage';
import { resolveAlertImageDisplayUrl } from '@/utils/alertMinioImage';

const { createMessage } = useMessage();
const loading = ref(false);
const imageUrl = ref<string>('');

function applyModalLayout() {
  setModalProps({
    defaultFullscreen: false,
    canFullscreen: false,
    width: 1000,
    title: '告警图片',
    minHeight: 0,
    bodyStyle: { padding: 0 },
    wrapClassName: 'monitor-dialog-wrap monitor-dialog-wrap--vod',
  });
}

const [register, { setModalProps, closeModal }] = useModalInner(async (data) => {
  applyModalLayout();
  loading.value = true;
  imageUrl.value = '';

  try {
    const url = resolveAlertImageDisplayUrl(data?.image_url);

    if (!url) {
      createMessage.error('图片地址为空');
      return;
    }

    imageUrl.value = url;
  } catch (error: any) {
    console.error('加载图片失败:', error);
    const errorMsg = error?.response?.data?.message || error?.message || '加载图片失败';
    createMessage.error(errorMsg);
  } finally {
    loading.value = false;
  }
});

const handleImageError = (event: Event) => {
  console.error('图片加载错误:', event);
  createMessage.error('图片加载失败');
  imageUrl.value = '';
};

const handleImageLoad = () => {
  // 图片加载成功
};

function handleCancel() {
  imageUrl.value = '';
  loading.value = false;
  closeModal();
}
</script>

<style lang="less">
.monitor-dialog-wrap--vod {
  .monitor-dialog__video-body {
    .monitor-dialog__alert-image {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
      margin: 0;
      padding: 0;
      background: #000;
    }
  }
}
</style>
