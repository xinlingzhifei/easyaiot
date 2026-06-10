<template>
  <BasicModal
    v-bind="$attrs"
    @register="register"
    title="空间存储策略"
    :width="520"
    @ok="handleSubmit"
  >
    <a-alert
      type="info"
      show-icon
      class="modal-alert"
      message="修改文件夹默认保存时间后，该文件夹下所有「跟随目录」的设备将自动同步。"
    />
    <BasicForm @register="registerForm" />
  </BasicModal>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { Alert as AAlert } from 'ant-design-vue';
import { BasicModal, useModalInner } from '@/components/Modal';
import { BasicForm, useForm } from '@/components/Form';
import { useMessage } from '@/hooks/web/useMessage';
import { updateDirectory } from '@/api/device/camera';
import { DEFAULT_SAVE_TIME, formatSaveTimeLabel, isValidSaveTime } from '@/views/camera/utils/spaceSaveTime';

const emit = defineEmits(['success', 'register']);

const { createMessage } = useMessage();
const directoryId = ref<number | null>(null);
const saveTimeField = ref<'snap_save_time' | 'record_save_time'>('snap_save_time');

const [registerForm, { setFieldsValue, validate, resetFields }] = useForm({
  labelWidth: 110,
  baseColProps: { span: 24 },
  schemas: [
    {
      field: 'directory_name',
      label: '目录名称',
      component: 'Input',
      componentProps: { disabled: true },
    },
    {
      field: 'save_time',
      label: '默认保存时间',
      component: 'InputNumber',
      required: true,
      componentProps: {
        min: 0,
        max: 3650,
        style: { width: '100%' },
        placeholder: '0=永久，或不少于 7 天',
      },
      helpMessage: '单位：天。0 表示永久保存，自定义天数须 ≥7。',
    },
  ],
  showActionButtonGroup: false,
});

const [register, { setModalProps, closeModal }] = useModalInner(async (data) => {
  resetFields();
  directoryId.value = data?.directoryId ?? null;
  saveTimeField.value = data?.saveTimeField ?? 'snap_save_time';
  await setFieldsValue({
    directory_name: data?.directoryName ?? '',
    save_time: data?.saveTime ?? DEFAULT_SAVE_TIME,
  });
});

async function handleSubmit() {
  if (directoryId.value == null) return;
  const values = await validate();
  const saveTime = Number(values.save_time);
  if (!isValidSaveTime(saveTime)) {
    createMessage.warning('保存时间须为 0（永久）或不少于 7 天');
    return;
  }
  setModalProps({ confirmLoading: true });
  try {
    const res = await updateDirectory(directoryId.value, {
      [saveTimeField.value]: saveTime,
    });
    if (res?.code !== undefined && res.code !== 0) {
      createMessage.error(res.msg || '保存失败');
      return;
    }
    createMessage.success(`文件夹默认保存时间已设为 ${formatSaveTimeLabel(saveTime)}`);
    closeModal();
    emit('success');
  } catch (e) {
    console.error(e);
    createMessage.error('保存空间存储策略失败');
  } finally {
    setModalProps({ confirmLoading: false });
  }
}
</script>

<style lang="less" scoped>
.modal-alert {
  margin-bottom: 16px;
}
</style>
