<template>
  <div class="workload-bundle-batch">
    <Alert
      type="info"
      show-icon
      class="mb-4"
      message="工作负载批量分发"
      :description="`${WORKLOAD_BUNDLE_COPY.offlineHint} ${WORKLOAD_BUNDLE_COPY.remotePythonTip}`"
    />

    <CollapseContainer title="目标节点" :canExpan="true" :defaultExpan="true" class="mb-4">
      <div class="node-select-row">
        <span class="select-label">{{ WORKLOAD_BUNDLE_COPY.selectNodes }}</span>
        <Select
          v-model:value="selectedNodeIds"
          mode="multiple"
          show-search
          allow-clear
          placeholder="选择 compute / hybrid 节点（可多选）"
          style="min-width: 480px; flex: 1"
          :options="nodeOptions"
          :filter-option="filterNode"
          :loading="nodesLoading"
        />
        <Button @click="loadNodes" :loading="nodesLoading">刷新</Button>
        <Button type="link" @click="selectAllEligible">全选可用</Button>
      </div>
      <div v-if="selectedNodeIds.length" class="selected-count">
        已选 {{ selectedNodeIds.length }} 个节点
      </div>
    </CollapseContainer>

    <CollapseContainer title="系统工具 · FFmpeg（推流/算法必需）" :canExpan="true" :defaultExpan="true" class="mb-4">
      <FfmpegBatchPanel :node-ids="selectedNodeIds" />
    </CollapseContainer>

    <Tabs v-model:activeKey="activeBundleKey" type="card" destroy-inactive-tab-pane>
      <TabPane v-for="bundle in WORKLOAD_BUNDLE_TYPES" :key="bundle.key" :tab="bundle.label">
        <WorkloadBundlePanel :bundle="bundle" :node-ids="selectedNodeIds" />
      </TabPane>
    </Tabs>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { Alert, Select, TabPane, Tabs } from 'ant-design-vue';
import { Button } from '@/components/Button';
import { CollapseContainer } from '@/components/Container';
import { getNodePage, type ComputeNodeVO } from '@/api/device/node';
import { isPlatformNode } from '../../utils/platformNode';
import { WORKLOAD_BUNDLE_COPY, WORKLOAD_BUNDLE_TYPES } from '../../utils/constants';
import WorkloadBundlePanel from './WorkloadBundlePanel.vue';
import FfmpegBatchPanel from './FfmpegBatchPanel.vue';

defineOptions({ name: 'WorkloadBundleBatch' });

const nodesLoading = ref(false);
const nodeList = ref<ComputeNodeVO[]>([]);
const selectedNodeIds = ref<number[]>([]);
const activeBundleKey = ref(WORKLOAD_BUNDLE_TYPES[0].key);

const nodeOptions = ref<Array<{ label: string; value: number; disabled?: boolean }>>([]);

function filterNode(input: string, option: { label?: string }) {
  return (option.label || '').toLowerCase().includes(input.toLowerCase());
}

function isEligibleNode(node: ComputeNodeVO) {
  if (isPlatformNode(node)) return false;
  if (node.nodeRole !== 'compute' && node.nodeRole !== 'hybrid') return false;
  return !!(node.sshUsername?.trim() || node.sshCredentialConfigured);
}

async function loadNodes() {
  nodesLoading.value = true;
  try {
    const res = await getNodePage({ pageNo: 1, pageSize: 500 });
    nodeList.value = res?.data?.list || [];
    nodeOptions.value = nodeList.value.map((node) => ({
      label: `${node.name} (${node.host}) — ${node.status || 'unknown'}`,
      value: node.id!,
      disabled: !isEligibleNode(node),
    }));
  } finally {
    nodesLoading.value = false;
  }
}

function selectAllEligible() {
  selectedNodeIds.value = nodeList.value.filter(isEligibleNode).map((n) => n.id!);
}

onMounted(() => {
  loadNodes();
});
</script>

<style scoped lang="less">
.workload-bundle-batch {
  padding: 16px 20px 24px;
  min-height: 480px;
}

.node-select-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.select-label {
  font-size: 14px;
  color: #333;
  white-space: nowrap;
}

.selected-count {
  margin-top: 8px;
  font-size: 13px;
  color: #666;
}
</style>
