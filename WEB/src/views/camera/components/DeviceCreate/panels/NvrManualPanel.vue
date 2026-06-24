<template>
  <DeviceCreatePanelLayout>
    <template #form>
      <BasicForm @register="registerForm" />
    </template>
    <template #actions>
      <Button type="primary" :loading="submitting" @click="handleSubmit">登记并挂载通道</Button>
    </template>
  </DeviceCreatePanelLayout>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { BasicForm, useForm } from '@/components/Form';
import { Button } from '@/components/Button';
import { useMessage } from '@/hooks/web/useMessage';
import { registerNvrWithChannels } from '@/api/device/camera';
import {
  formatNvrRegisterHint,
  nvrRegisterRegisteredCount,
} from '@/views/camera/utils/nvrRegisterMessage';
import DeviceCreatePanelLayout from '../DeviceCreatePanelLayout.vue';
import {
  DEVICE_CREATE_FORM_GRID,
  DEVICE_CREATE_NUMBER_PROPS,
} from '../deviceCreateForm';

const emit = defineEmits<{ success: [] }>();

const { createMessage } = useMessage();
const submitting = ref(false);

const vendorOptions = [
  { label: '海康', value: 'hikvision' },
  { label: '大华', value: 'dahua' },
  { label: '华为', value: 'huawei' },
  { label: '萤石', value: 'ezviz' },
  { label: '小米', value: 'xiaomi' },
];

const [registerForm, { validate, getFieldsValue }] = useForm({
  ...DEVICE_CREATE_FORM_GRID,
  schemas: [
    {
      field: 'ip',
      label: 'NVR IP',
      component: 'Input',
      required: true,
      componentProps: { placeholder: '192.168.1.64' },
    },
    {
      field: 'port',
      label: 'Web 端口',
      component: 'InputNumber',
      defaultValue: 80,
      componentProps: { min: 1, max: 65535, ...DEVICE_CREATE_NUMBER_PROPS },
    },
    {
      field: 'vendor',
      label: '品牌',
      component: 'Select',
      componentProps: { allowClear: true, placeholder: '自动识别', options: vendorOptions },
    },
    {
      field: 'username',
      label: '用户名',
      component: 'Input',
      required: true,
      defaultValue: 'admin',
      componentProps: { placeholder: 'admin', allowClear: true },
    },
    {
      field: 'password',
      label: '密码',
      component: 'InputPassword',
      required: true,
      componentProps: { allowClear: true },
    },
    {
      field: 'name',
      label: '设备名称',
      component: 'Input',
      componentProps: { placeholder: '可选', allowClear: true },
    },
  ],
});

async function handleSubmit() {
  try {
    await validate();
  } catch {
    return;
  }
  const values = getFieldsValue();
  const ip = String(values.ip || '').trim();
  if (!ip) {
    createMessage.warning('请填写 NVR IP');
    return;
  }
  submitting.value = true;
  try {
    const port = values.port ?? 80;
    const res = await registerNvrWithChannels({
      ip,
      port,
      username: String(values.username || '').trim(),
      password: values.password || '',
      vendor: values.vendor,
      name: values.name || undefined,
      scheme: port === 443 || port === 8443 ? 'https' : 'http',
      timeout: 15,
    });
    const n = nvrRegisterRegisteredCount(res);
    if (n > 0) {
      createMessage.success(`NVR 已登记，已挂载 ${n} 路通道`);
      emit('success');
    } else {
      createMessage.warning(`NVR 登记失败：${formatNvrRegisterHint(res)}`);
    }
  } catch (e: unknown) {
    const err = e as { msg?: string; message?: string };
    createMessage.error(err?.msg || err?.message || 'NVR 登记失败');
  } finally {
    submitting.value = false;
  }
}
</script>
