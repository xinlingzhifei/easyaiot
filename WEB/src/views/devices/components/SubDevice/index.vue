<template>
  <div class="ops-page">
    <div class="ops-header">
      <div class="ops-header-main">
        <div class="ops-header-meta">
          <span class="ops-meta-item">已绑定 <strong>{{ pagination.total }}</strong></span>
          <span class="ops-meta-item">网关标识 <strong>{{ gatewayIdentification || '--' }}</strong></span>
        </div>
      </div>
      <div class="ops-header-actions">
        <Button @click="loadBoundList" :loading="loading" preIcon="ant-design:reload-outlined">
          刷新
        </Button>
        <Button type="primary" @click="openBindModal" preIcon="ant-design:link-outlined">
          绑定子设备
        </Button>
        <Popconfirm
          title="确认解绑选中的子设备？"
          :disabled="!selectedRowKeys.length"
          @confirm="handleUnbind"
        >
          <Button
            danger
            :disabled="!selectedRowKeys.length"
            :loading="unbinding"
            preIcon="ant-design:disconnect-outlined"
          >
            批量解绑
          </Button>
        </Popconfirm>
      </div>
    </div>

    <div class="ops-surface">
      <div class="ops-surface-head">
        <div class="ops-surface-title">
          已绑定列表
          <span class="ops-count">({{ pagination.total }})</span>
        </div>
      </div>
      <div class="ops-surface-body">
        <Table
          rowKey="id"
          size="middle"
          :loading="loading"
          :columns="columns"
          :dataSource="boundList"
          :rowSelection="{ selectedRowKeys, onChange: onSelectChange }"
          :pagination="false"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'connectStatus'">
              <Tag :color="record.connectStatus === 'ONLINE' ? 'green' : 'red'">
                {{ record.connectStatus === 'ONLINE' ? '在线' : '离线' }}
              </Tag>
            </template>
            <template v-else-if="column.key === 'action'">
              <a style="margin-right: 12px" @click="openSubDevice(record)">管控</a>
              <Popconfirm title="确认解绑该子设备？" @confirm="handleUnbindOne(record)">
                <a class="danger-link">解绑</a>
              </Popconfirm>
            </template>
          </template>
        </Table>
        <div v-if="!loading && boundList.length === 0" class="ops-empty">
          <Icon icon="ant-design:cluster-outlined" class="ops-empty-icon" />
          <p>暂无已绑定子设备</p>
          <p class="ops-empty-hint">
            可手动绑定，或由网关上报 topo/upstream/add、sub/property 自动创建并出现在此列表
          </p>
        </div>
        <div v-if="pagination.total > 0" class="table-pagination">
          <Pagination
            v-model:current="pagination.current"
            v-model:pageSize="pagination.pageSize"
            :total="pagination.total"
            :showSizeChanger="true"
            :showTotal="(total) => `共 ${total} 条`"
            @change="handlePageChange"
            @showSizeChange="handlePageChange"
          />
        </div>
      </div>
    </div>

    <Modal
      v-model:visible="bindVisible"
      :width="'90vw'"
      :style="{ maxWidth: '1360px' }"
      wrap-class-name="device-bind-modal"
      :body-style="{ padding: 0, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }"
      :confirmLoading="binding"
      destroy-on-close
      @cancel="closeBindModal"
    >
      <template #title>
        <div class="bind-modal-title">
          <span class="bind-modal-title-main">绑定子设备</span>
          <span class="bind-modal-title-sub">从未关联网关的子设备中选择，绑定到当前网关</span>
        </div>
      </template>

      <div class="bind-modal-shell">
        <div class="bind-modal-context">
          <div class="bind-modal-context-left">
            <span class="bind-modal-context-item">
              目标网关<strong>{{ gatewayIdentification || '--' }}</strong>
            </span>
            <span class="bind-modal-context-badge">网关子设备 · 未绑定</span>
          </div>
          <span class="bind-modal-context-item">
            候选总数<strong>{{ bindPagination.total }}</strong>
          </span>
        </div>

        <div class="bind-modal-panel">
          <div class="bind-modal-toolbar">
            <Input
              v-model:value="bindKeyword"
              allowClear
              class="bind-modal-search"
              placeholder="搜索设备名称，回车查询"
              @pressEnter="loadUnboundList"
            />
            <Button type="primary" @click="loadUnboundList" :loading="bindLoading" preIcon="ant-design:search-outlined">
              查询
            </Button>
          </div>

          <div class="bind-modal-table-wrap">
            <Table
              rowKey="id"
              size="middle"
              :loading="bindLoading"
              :columns="bindColumns"
              :dataSource="unboundList"
              :rowSelection="{ selectedRowKeys: bindSelectedKeys, onChange: onBindSelectChange }"
              :pagination="false"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'connectStatus'">
                  <Tag :color="record.connectStatus === 'ONLINE' ? 'green' : 'red'">
                    {{ record.connectStatus === 'ONLINE' ? '在线' : '离线' }}
                  </Tag>
                </template>
              </template>
            </Table>
            <div v-if="!bindLoading && unboundList.length === 0" class="bind-modal-empty">
              <Icon icon="ant-design:cluster-outlined" class="bind-modal-empty-icon" />
              <p>暂无可绑定的子设备</p>
              <p class="bind-modal-empty-hint">需设备类型为「网关子设备」且未关联网关</p>
            </div>
          </div>

          <div v-if="bindPagination.total > 0" class="bind-modal-pagination">
            <Pagination
              v-model:current="bindPagination.current"
              v-model:pageSize="bindPagination.pageSize"
              :total="bindPagination.total"
              :showSizeChanger="true"
              :showTotal="(total) => `共 ${total} 条`"
              @change="handleBindPageChange"
              @showSizeChange="handleBindPageChange"
            />
          </div>
        </div>
      </div>

      <template #footer>
        <div class="bind-modal-footer">
          <span class="bind-modal-footer-extra">
            已选择 <strong>{{ bindSelectedKeys.length }}</strong> 个子设备
          </span>
          <Space :size="12">
            <Button @click="closeBindModal">取消</Button>
            <Button type="primary" :loading="binding" @click="handleBind">确认绑定</Button>
          </Space>
        </div>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { Modal, Pagination, Popconfirm, Space, Table, Tag, Input } from 'ant-design-vue';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { useMessage } from '@/hooks/web/useMessage';
import {
  associateGatewayDevices,
  disassociateGatewayDevices,
  getGatewaySubDevices,
  getUnboundSubDevices,
} from '@/api/device/devices';

defineOptions({ name: 'DeviceSubDevice' });

const props = defineProps<{
  gatewayIdentification: string;
}>();

const { createMessage } = useMessage();
const router = useRouter();

const openSubDevice = (record: any) => {
  if (!record?.id) return;
  router.push({ name: 'DeviceDetail', params: { id: String(record.id) } });
};

const loading = ref(false);
const unbinding = ref(false);
const binding = ref(false);
const bindLoading = ref(false);
const bindVisible = ref(false);
const bindKeyword = ref('');

const boundList = ref<any[]>([]);
const unboundList = ref<any[]>([]);
const selectedRowKeys = ref<Array<string | number>>([]);
const bindSelectedKeys = ref<Array<string | number>>([]);

const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
});

const bindPagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
});

const gatewayIdentification = computed(() => props.gatewayIdentification || '');

const columns = [
  { title: '设备名称', dataIndex: 'deviceName', key: 'deviceName', ellipsis: true },
  { title: '设备标识', dataIndex: 'deviceIdentification', key: 'deviceIdentification', ellipsis: true },
  { title: '产品标识', dataIndex: 'productIdentification', key: 'productIdentification', ellipsis: true },
  { title: '连接状态', dataIndex: 'connectStatus', key: 'connectStatus', width: 100 },
  { title: '操作', key: 'action', width: 140 },
];

const bindColumns = [
  { title: '设备名称', dataIndex: 'deviceName', key: 'deviceName', ellipsis: true },
  { title: '设备标识', dataIndex: 'deviceIdentification', key: 'deviceIdentification', ellipsis: true },
  { title: '产品标识', dataIndex: 'productIdentification', key: 'productIdentification', ellipsis: true },
  { title: '连接状态', dataIndex: 'connectStatus', key: 'connectStatus', width: 90 },
];

const onSelectChange = (keys: Array<string | number>) => {
  selectedRowKeys.value = keys;
};

const onBindSelectChange = (keys: Array<string | number>) => {
  bindSelectedKeys.value = keys;
};

async function loadBoundList() {
  if (!gatewayIdentification.value) {
    boundList.value = [];
    pagination.total = 0;
    return;
  }
  loading.value = true;
  try {
    const res = await getGatewaySubDevices({
      gatewayIdentification: gatewayIdentification.value,
      pageNum: pagination.current,
      pageSize: pagination.pageSize,
    });
    boundList.value = res?.data || res?.rows || [];
    pagination.total = res?.total || 0;
    selectedRowKeys.value = [];
  } catch (e) {
    console.error(e);
    createMessage.error('加载子设备列表失败');
  } finally {
    loading.value = false;
  }
}

async function loadUnboundList() {
  bindLoading.value = true;
  try {
    const res = await getUnboundSubDevices({
      pageNum: bindPagination.current,
      pageSize: bindPagination.pageSize,
      deviceName: bindKeyword.value || undefined,
    });
    unboundList.value = res?.data || res?.rows || [];
    bindPagination.total = res?.total || 0;
  } catch (e) {
    console.error(e);
    createMessage.error('加载可绑定子设备失败');
  } finally {
    bindLoading.value = false;
  }
}

function handlePageChange(page: number, pageSize: number) {
  pagination.current = page;
  pagination.pageSize = pageSize;
  loadBoundList();
}

function handleBindPageChange(page: number, pageSize: number) {
  bindPagination.current = page;
  bindPagination.pageSize = pageSize;
  loadUnboundList();
}

function openBindModal() {
  bindVisible.value = true;
  bindSelectedKeys.value = [];
  bindKeyword.value = '';
  bindPagination.current = 1;
  loadUnboundList();
}

function closeBindModal() {
  bindVisible.value = false;
  bindSelectedKeys.value = [];
}

async function handleBind() {
  if (!bindSelectedKeys.value.length) {
    createMessage.warning('请选择要绑定的子设备');
    return;
  }
  if (!gatewayIdentification.value) {
    createMessage.error('网关设备标识缺失');
    return;
  }
  binding.value = true;
  try {
    await associateGatewayDevices(bindSelectedKeys.value, gatewayIdentification.value);
    createMessage.success('绑定成功');
    closeBindModal();
    await loadBoundList();
  } catch (e: any) {
    console.error(e);
    createMessage.error(e?.message || '绑定失败');
  } finally {
    binding.value = false;
  }
}

async function handleUnbind() {
  if (!selectedRowKeys.value.length) return;
  unbinding.value = true;
  try {
    await disassociateGatewayDevices(selectedRowKeys.value);
    createMessage.success('解绑成功');
    await loadBoundList();
  } catch (e: any) {
    console.error(e);
    createMessage.error(e?.message || '解绑失败');
  } finally {
    unbinding.value = false;
  }
}

async function handleUnbindOne(record: any) {
  try {
    await disassociateGatewayDevices([record.id]);
    createMessage.success('解绑成功');
    await loadBoundList();
  } catch (e: any) {
    console.error(e);
    createMessage.error(e?.message || '解绑失败');
  }
}

watch(
  () => props.gatewayIdentification,
  (val) => {
    if (val && val !== '--') {
      pagination.current = 1;
      loadBoundList();
    }
  },
);

onMounted(() => {
  loadBoundList();
});
</script>

<style lang="less" scoped>
@import '../styles/device-ops.less';

.danger-link {
  color: #ff4d4f;
}

.table-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>

<style lang="less">
@import '../styles/device-bind-modal.less';
</style>
