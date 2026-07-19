<!-- eslint-disable vue/v-on-event-hyphenation -->
<template>
  <div class="product-drawer-warpper">
    <Card class="detail-info" size="small">
      <div class="device_title">
        <span class="name">{{ state.record.productName }}</span>
        <span :class="state.record.status == '0' ? 'green' : 'red'">
          {{ state.record.status == '0' ? '启用' : '禁用' }}
        </span>
      </div>
      <div class="base_data">
        <div class="item">
          <span>状态：</span>
          <span :class="state.record.status == '0' ? 'green' : 'red'">
            {{ state.record.status == '0' ? '启用' : '禁用' }}
          </span>
        </div>
        <div class="item">
          <span>应用场景：</span>
          <span>{{ state.record.appId }}</span>
        </div>
        <div class="item">
          <span>产品名称：</span>
          <span>{{ state.record.productName }}</span>
        </div>
        <div class="item">
          <span>产品标识：</span>
          <span>{{ state.record.productIdentification }}</span>
        </div>
        <div class="item">
          <span>用户名：</span>
          <span>{{ state.record.userName }}</span>
        </div>
        <div class="item">
          <span>密码：</span>
          <span>{{ state.record.password }}</span>
        </div>
        <div class="item">
          <span>厂商名称：</span>
          <span>{{ state.record.manufacturerName }}</span>
        </div>
      </div>
    </Card>

    <Card class="product-tabs" ref="cardRef">
      <Tabs
        :animated="{ inkBar: true, tabPane: false }"
        :activeKey="state.activeKey"
        :tabBarGutter="40"
        @tabClick="handleTabClick"
      >
        <TabPane key="1" tab="基础信息">
          <ProductDetail :detail="state.record" />
        </TabPane>
        <TabPane key="guide" tab="接入指引">
          <AccessGuide
            v-if="state.activeKey === 'guide'"
            scope="product"
            :node-type="state.record.productType"
            :product-identification="state.record.productIdentification"
            :product-name="state.record.productName"
            :password="state.record.password"
            :user-name="state.record.userName"
            :connector="state.record.connector"
            :protocol-type="state.record.protocolType"
          />
        </TabPane>
        <TabPane key="3" tab="模型定义">
          <PhysicalModal
            v-if="state.activeKey === '3' && state.record.productIdentification"
            :product-identification="state.record.productIdentification"
            :device-profile-name="state.record.productName"
            :protocol-type="state.record.protocolType"
          />
        </TabPane>
        <TabPane v-if="!industrialProduct" key="script" tab="协议脚本">
          <ProductScript
            v-if="state.activeKey === 'script'"
            :product-id="state.record.id"
            :product-identification="state.record.productIdentification"
          />
        </TabPane>
        <TabPane key="2" tab="关联设备">
          <RelatedDevices
            v-if="state.activeKey === '2'"
            :product-identification="state.record.productIdentification"
            :product-name="state.record.productName"
            :app-id="state.record.appId"
          />
        </TabPane>
      </Tabs>
    </Card>
  </div>
</template>
<script lang="ts" setup>
import { computed, onMounted, reactive, watch } from 'vue';
import { Card, TabPane, Tabs } from 'ant-design-vue';
import ProductDetail from './ProductDetail.vue';
import PhysicalModal from './PhysicalModal.vue';
import ProductScript from './ProductScript.vue';
import RelatedDevices from './RelatedDevices.vue';
import AccessGuide from '@/views/devices/components/AccessGuide/index.vue';
import { isIndustrialProtocol, productModel } from '@/views/product/Data';
import { getDeviceProfileDetail } from '@/api/device/product';
import { useRoute } from 'vue-router';

defineOptions({ name: 'ProductDetail' });

const route = useRoute();

const emits = defineEmits(['upload:list']);

const state = reactive({
  id: '',
  activeKey: '1',
  record: productModel,
});

const industrialProduct = computed(() => isIndustrialProtocol(state.record.protocolType));

async function initProductDetail(record) {
  try {
    state.record.id = record.id;
    state.record.productIdentification = record.productIdentification;
    const ret = await getDeviceProfileDetail(record.id);
    state.record = ret;
  } catch (error) {
    console.error(error);
  }
}

const handleTabClick = (activeKey) => {
  if (activeKey === 'script' && industrialProduct.value) {
    return;
  }
  state.activeKey = activeKey;
};

watch(industrialProduct, (industrial) => {
  if (industrial && state.activeKey === 'script') {
    state.activeKey = '1';
  }
});

onMounted(() => {
  initProductDetail(route.params);
});
</script>

<style lang="less" scoped>
:deep(.product-drawer .scrollbar__wrap) {
  overflow: hidden;
}

:deep(.product-drawer .is-vertical) {
  display: none;
}

.product-drawer-warpper {
  height: 100%;
  overflow: hidden;
  background: #f5f7fa;
  padding: 16px 20px 20px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;

  .detail-info {
    margin-bottom: 16px;
    flex-shrink: 0;

    :deep(.ant-card-body) {
      padding: 16px 20px;
    }

    .device_title {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;

      .name {
        font-size: 15px;
        font-weight: 600;
        color: #1a1a1a;
        line-height: 24px;
      }

      .green {
        color: #52c41a;
        font-weight: 500;
        font-size: 13px;
      }

      .red {
        color: #ff4d4f;
        font-weight: 500;
        font-size: 13px;
      }
    }

    .base_data {
      display: flex;
      align-items: center;
      flex-wrap: nowrap;
      overflow-x: auto;
      font-size: 13px;
      color: #666;
      line-height: 22px;

      .item:first-child {
        border-left: none;
        padding-left: 0;
      }

      .item {
        padding-left: 16px;
        padding-right: 16px;
        border-left: 1px solid #e8e8e8;
        flex: 0 0 auto;
        white-space: nowrap;

        span:first-child {
          color: #999;
          margin-right: 4px;
        }

        span:last-child {
          color: #1a1a1a;
          font-weight: 500;
        }

        .red {
          color: #ff4d4f;
          font-weight: 500;
        }

        .green {
          color: #52c41a;
          font-weight: 500;
        }
      }
    }
  }

  .product-tabs {
    margin: 0;
    background: #ffffff;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    border: 1px solid rgba(0, 0, 0, 0.06);
    overflow: hidden;
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;

    :deep(.ant-card-body) {
      padding: 0;
      background: #ffffff;
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }

    :deep(.ant-tabs) {
      background-color: #ffffff;
      padding: 12px 20px 12px;
      margin: 0;
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }

    :deep(.ant-tabs-nav) {
      margin-bottom: 12px;
      padding: 0;
      flex-shrink: 0;
    }

    :deep(.ant-tabs-content-holder) {
      padding: 0;
      background: #ffffff;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }

    :deep(.ant-tabs-content) {
      height: 100%;
    }

    :deep(.ant-tabs-tabpane) {
      height: 100%;
      padding: 0;
      outline: none;

      > * {
        height: 100%;
        min-height: 0;
        overflow-y: auto;
      }

      > .product-script,
      > .access-guide {
        overflow: hidden;
      }
    }

    :deep(.ant-tabs-tabpane-active) {
      display: flex !important;
      flex-direction: column;

      > * {
        flex: 1 1 0;
        min-height: 0;
      }
    }

    :deep(.ant-tabs-tab) {
      padding: 12px 8px;
      font-size: 14px;
      font-weight: 500;
      color: #666;
      transition: all 0.3s ease;

      &:hover {
        color: #1890ff;
      }
    }

    :deep(.ant-tabs-tab-active) {
      .ant-tabs-tab-btn {
        color: #1890ff;
        font-weight: 600;
      }
    }

    :deep(.ant-tabs-ink-bar) {
      height: 3px;
      border-radius: 2px;
    }
  }
}
</style>
