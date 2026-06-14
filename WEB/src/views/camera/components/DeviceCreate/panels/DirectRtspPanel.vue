<template>
  <DeviceCreatePanelLayout>
    <template #form>
      <BasicForm @register="registerForm" />
    </template>
    <template #actions>
      <Button type="primary" :loading="submitting" @click="handleSubmit">注册设备</Button>
    </template>
  </DeviceCreatePanelLayout>
</template>

<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { BasicForm, useForm } from '@/components/Form';
import { Button } from '@/components/Button';
import { useMessage } from '@/hooks/web/useMessage';
import { registerDevice } from '@/api/device/camera';
import {
  ensureDeviceStreamForwardTask,
  ensureEdgeStreamForwardTask,
} from '@/api/device/stream_forward';
import { listScheduleNodes } from '@/api/device/node';
import DeviceCreatePanelLayout from '../DeviceCreatePanelLayout.vue';
import {
  DEVICE_CREATE_COL_LINE,
  DEVICE_CREATE_FORM_GRID,
} from '../deviceCreateForm';

const emit = defineEmits<{ success: [] }>();

const { createMessage } = useMessage();
const submitting = ref(false);
const edgeNodeOptions = ref<Array<{ label: string; value: number }>>([]);

const [registerForm, { validate, getFieldsValue, updateSchema }] = useForm({
  ...DEVICE_CREATE_FORM_GRID,
  schemas: [
    {
      field: 'name',
      label: '设备名称',
      component: 'Input',
      colProps: DEVICE_CREATE_COL_LINE,
      componentProps: { placeholder: '可选' },
    },
    {
      field: 'source',
      label: 'RTSP 地址',
      component: 'Input',
      required: true,
      colProps: DEVICE_CREATE_COL_LINE,
      componentProps: { placeholder: 'rtsp://username:password@ip:port/path' },
    },
    {
      field: 'access_mode',
      label: '接入方式',
      component: 'Select',
      defaultValue: 'local',
      colProps: DEVICE_CREATE_COL_LINE,
      componentProps: {
        options: [
          { label: '本机转发', value: 'local' },
          { label: 'Edge Agent 出站接入', value: 'edge_agent' },
        ],
      },
    },
    {
      field: 'edge_node_id',
      label: 'Edge 节点',
      component: 'Select',
      colProps: DEVICE_CREATE_COL_LINE,
      componentProps: {
        placeholder: '选择在线 Edge/计算节点',
        options: edgeNodeOptions,
        showSearch: true,
        allowClear: true,
        filterOption: (input: string, option: any) => {
          return option.label.toLowerCase().includes(input.toLowerCase());
        },
      },
      ifShow: ({ values }) => values.access_mode === 'edge_agent',
      required: ({ values }) => values.access_mode === 'edge_agent',
    },
    {
      field: 'edge_transport',
      label: '传输方式',
      component: 'Select',
      defaultValue: 'tcp',
      colProps: DEVICE_CREATE_COL_LINE,
      componentProps: {
        options: [
          { label: 'TCP', value: 'tcp' },
          { label: 'UDP', value: 'udp' },
        ],
      },
      ifShow: ({ values }) => values.access_mode === 'edge_agent',
    },
  ],
});

async function loadEdgeNodes() {
  try {
    const nodes = await listScheduleNodes();
    edgeNodeOptions.value = nodes
      .filter((node) => node.id != null)
      .map((node) => ({
        label: `${node.name || node.host} (${node.host})`,
        value: Number(node.id),
      }));
    updateSchema({
      field: 'edge_node_id',
      componentProps: {
        options: edgeNodeOptions.value,
      },
    });
  } catch (error) {
    console.error('加载 Edge 节点失败', error);
    edgeNodeOptions.value = [];
  }
}

async function handleSubmit() {
  try {
    await validate();
  } catch {
    return;
  }
  const values = getFieldsValue();
  const source = String(values.source || '').trim();
  if (!source) {
    createMessage.error('RTSP 取流地址不能为空');
    return;
  }
  if (values.access_mode === 'edge_agent' && !values.edge_node_id) {
    createMessage.error('请选择 Edge 节点');
    return;
  }
  submitting.value = true;
  try {
    const response = await registerDevice({
      name: values.name || undefined,
      source,
      stream: 0,
      cameraType: 'custom',
    });
    const deviceId = response?.data?.id;
    createMessage.success('设备注册成功');
    if (deviceId) {
      try {
        if (values.access_mode === 'edge_agent') {
          await ensureEdgeStreamForwardTask(deviceId, {
            edge_node_id: Number(values.edge_node_id),
            transport: values.edge_transport || 'tcp',
          });
          createMessage.success('Edge Agent 接入命令已下发');
        } else {
          await ensureDeviceStreamForwardTask(deviceId);
        }
      } catch {
        /* 静默 */
      }
    }
    emit('success');
  } catch (error: unknown) {
    const err = error as { msg?: string; message?: string };
    createMessage.error(err?.msg || err?.message || '设备注册失败');
  } finally {
    submitting.value = false;
  }
}

onMounted(() => {
  void loadEdgeNodes();
});
</script>
