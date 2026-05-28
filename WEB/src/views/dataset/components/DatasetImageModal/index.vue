<template>
  <BasicModal
    @register="register"
    :title="getTitle"
    @cancel="handleCancel"
    :width="700"
    @ok="handleOk"
    :canFullscreen="false"
  >
    <div class="upload-modal">
      <Spin :spinning="state.uploading">
        <Form :labelCol="{ span: 5 }" :wrapperCol="{ span: 19 }">
          <!-- 数据集ID显示 -->
          <FormItem label="数据集ID">
            <InputNumber v-model:value="state.datasetId" disabled/>
          </FormItem>

          <!-- 文件上传区域 -->
          <FormItem :label="uploadLabel" required>
            <Upload
              v-model:file-list="state.fileList"
              :before-upload="beforeUpload"
              :custom-request="noopCustomRequest"
              :accept="acceptType"
              :max-count="1"
              list-type="picture"
            >
              <Button>
                <UploadOutlined/>
                选择文件
              </Button>
              <template v-if="hintText">
                <div class="ant-upload-hint">{{ hintText }}</div>
              </template>
            </Upload>
          </FormItem>

          <!-- 压缩包解压选项 -->
          <FormItem v-if="state.isZip" label="解压选项">
            <Checkbox v-model:checked="state.unzip">自动解压压缩包</Checkbox>
          </FormItem>
        </Form>
      </Spin>
    </div>
  </BasicModal>
</template>

<script lang="ts" setup>
import {computed, reactive} from 'vue';
import {BasicModal, useModalInner} from '@/components/Modal';
import {Button, Checkbox, Form, FormItem, InputNumber, message, Spin, Upload} from 'ant-design-vue';
import {UploadOutlined} from '@ant-design/icons-vue';
import {useMessage} from '@/hooks/web/useMessage';
import {uploadDatasetImage} from '@/api/device/dataset';
defineOptions({name: 'DatasetImageModal'});

const {createMessage} = useMessage();

const state = reactive({
  datasetId: null as number | null,
  isImage: false,
  isZip: false,
  fileList: [] as any[],
  unzip: true,
  uploading: false,
});

const getTitle = computed(() => state.isImage ? '上传图片' : '上传图片压缩包');
const uploadLabel = computed(() => state.isImage ? '选择图片' : '选择压缩包');
const hintText = computed(() => {
  if (state.isImage) return '支持格式: JPG/PNG/JPEG，最大50MB';
  return '支持ZIP格式压缩包，最大200MB';
});
const acceptType = computed(() => state.isImage ? 'image/*' : '.zip');

const [register, {closeModal}] = useModalInner((data) => {
  const {datasetId, isImage, isZip} = data;
  state.datasetId = datasetId;
  state.isImage = isImage;
  state.isZip = isZip;
  state.fileList = [];
  state.unzip = true;
});

const emits = defineEmits(['success']);

function handleCancel() {
  state.fileList = [];
  closeModal();
}

function beforeUpload(file: File) {
  const isImage = state.isImage;
  const isLtSize = isImage ? file.size < 50 * 1024 * 1024 : file.size < 200 * 1024 * 1024;

  if (!isLtSize) {
    message.error(`文件大小不能超过${isImage ? '50MB' : '200MB'}`);
    return Upload.LIST_IGNORE;
  }

  return true;
}

/** 阻止 Ant Upload 自动提交，由确认按钮统一调用业务上传接口 */
function noopCustomRequest(options: { onSuccess?: (body: string) => void }) {
  options.onSuccess?.('ok');
}

// 处理上传
async function handleOk() {
  if (!state.fileList.length) {
    message.error('请选择要上传的文件');
    return;
  }

  if (!state.datasetId) {
    message.error('数据集ID不能为空');
    return;
  }

  const file = state.fileList[0];
  const formData = new FormData();
  formData.append('file', file.originFileObj);
  formData.append('datasetId', state.datasetId.toString());
  formData.append('isZip', state.isZip.toString());
  formData.append('unzip', state.unzip.toString());

  try {
    state.uploading = true;
    const result = await uploadDatasetImage(formData);
    const failedCount = result?.failedCount ?? 0;
    const successCount = result?.successCount ?? 0;
    if (failedCount > 0) {
      createMessage.warning(`上传完成：成功 ${successCount} 个，失败 ${failedCount} 个`);
    } else {
      createMessage.success(successCount > 1 ? `成功上传 ${successCount} 个文件` : '上传成功');
    }
    emits('success');
    closeModal();
  } catch (error: any) {
    console.error('上传失败:', error);
    createMessage.error(error?.message || '上传失败');
  } finally {
    state.uploading = false;
  }
}
</script>

<style lang="less" scoped>
.upload-modal {
  padding: 20px;

  .ant-upload-hint {
    margin-top: 8px;
    color: #999;
    font-size: 12px;
  }

  :deep(.ant-form-item-label) {
    & > label::after {
      content: '';
    }
  }
}
</style>
