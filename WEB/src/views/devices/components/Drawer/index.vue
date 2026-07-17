<template>
  <div class="device-drawer-wrapper">
    <Card class="detail-info" size="small">
      <div class="device_title">
        <span class="name">{{ description.deviceName || '设备详情' }}</span>
        <span :class="description.connectStatus == 'ONLINE' ? 'green' : 'red'">
          {{ description.connectStatus == 'ONLINE' ? '在线' : '离线' }}
        </span>
      </div>
      <div class="base_data">
        <div class="item">
          <span>应用场景：</span>
          <span :title="String(description.appId)">{{ description.appId }}</span>
        </div>
        <div class="item">
          <span>产品名称：</span>
          <span :title="String(description.productName)">{{ description.productName }}</span>
        </div>
        <div class="item">
          <span>设备标识：</span>
          <span :title="String(description.deviceIdentification)">{{ description.deviceIdentification }}</span>
        </div>
        <div class="item">
          <span>连接实例：</span>
          <span :title="String(description.connector)">{{ description.connector }}</span>
        </div>
        <div class="item">
          <span>用户名：</span>
          <span :title="String(description.userName)">{{ description.userName }}</span>
        </div>
        <div class="item">
          <span>密码：</span>
          <span :title="String(description.password)">{{ description.password }}</span>
        </div>
        <div class="item">
          <span>厂商名称：</span>
          <span :title="String(description.manufacturerName)">{{ description.manufacturerName }}</span>
        </div>
      </div>
    </Card>

    <Card class="device-tabs-card">
      <Tabs
        v-model:activeKey="activeKey"
        :animated="{ inkBar: true, tabPane: true }"
        :tabBarGutter="40"
        @tabClick="handleTabClick"
      >
        <TabPane key="Detail" tab="基础信息">
          <Detail />
        </TabPane>

        <TabPane key="AccessGuide" tab="接入指引">
          <AccessGuide
            v-if="activeKey === 'AccessGuide'"
            scope="device"
            :node-type="description.deviceType"
            :product-identification="description.productIdentification"
            :device-identification="description.deviceIdentification"
            :device-name="description.deviceName"
            :product-name="description.productName"
            :password="description.password"
            :user-name="description.userName"
            :connector="description.connector"
            :parent-identification="description.parentIdentification"
            :protocol-type="description.protocolType"
            :device-numeric-id="String(route.params.id || description.id || '')"
          />
        </TabPane>

        <TabPane key="TingModel" tab="运行状态">
          <TingModel v-if="activeKey === 'TingModel'" />
        </TabPane>

        <TabPane key="Shadow" tab="设备影子">
          <Shadow v-if="activeKey === 'Shadow'" />
        </TabPane>

        <TabPane key="Control" tab="功能调用">
          <Control v-if="activeKey === 'Control'" />
        </TabPane>

        <TabPane key="Event" tab="事件日志">
          <Event v-if="activeKey === 'Event'" />
        </TabPane>

        <TabPane key="Service" tab="指令日志">
          <Service v-if="activeKey === 'Service'" />
        </TabPane>

        <TabPane key="DeviceLog" tab="设备日志">
          <DeviceLog v-if="activeKey === 'DeviceLog'" />
        </TabPane>

        <TabPane v-if="isGateway" key="SubDevice" tab="网关子设备">
          <SubDevice
            v-if="activeKey === 'SubDevice'"
            :gateway-identification="description.deviceIdentification"
          />
        </TabPane>

        <TabPane key="RelatedCameras" tab="关联摄像头">
          <RelatedCameras
            v-if="activeKey === 'RelatedCameras'"
            :iot-device-id="route.params.id"
            :device-name="description.deviceName"
          />
        </TabPane>

        <TabPane key="Topic" tab="Topic管理">
          <Topic v-if="activeKey === 'Topic'" />
        </TabPane>
      </Tabs>
    </Card>
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { Card, TabPane, Tabs } from 'ant-design-vue';
import TingModel from '../Model/index.vue';
import Detail from './Detail.vue';
import AccessGuide from '../AccessGuide/index.vue';
import Shadow from '../Shadow/index.vue';
import Control from '../Control/index.vue';
import Event from '../Event/index.vue';
import Service from '../Service/index.vue';
import DeviceLog from '../DeviceLog/index.vue';
import SubDevice from '../SubDevice/index.vue';
import RelatedCameras from '../RelatedCameras/index.vue';
import Topic from '../Topic/index.vue';
import { useRoute } from 'vue-router';
import { getDevicesInfo } from '@/api/device/devices';

defineOptions({ name: 'DeviceDetail' });

const description = reactive({
  id: '',
  clientId: '',
  appId: '',
  deviceIdentification: '',
  deviceName: '',
  deviceDescription: '',
  deviceStatus: '',
  connectStatus: '',
  isWill: '',
  productIdentification: '',
  createBy: '',
  createTime: '',
  updateBy: '',
  updateTime: '',
  remark: '',
  deviceVersion: '',
  deviceSn: '',
  ipAddress: '',
  macAddress: '',
  activeStatus: '',
  extension: '',
  activatedTime: '',
  lastOnlineTime: '',
  productName: '',
  manufacturerName: '',
  deviceType: '',
  protocolType: '',
  connector: '',
  userName: '',
  password: '',
  parentIdentification: '',
});

const route = useRoute();

const isGateway = computed(() => description.deviceType === 'GATEWAY');

const initDeviceDetail = async (record) => {
  const info = await getDevicesInfo(record?.id);
  Object.keys(description).forEach((item) => {
    description[item] = info.device?.[item] ?? info.product?.[item] ?? '--';
  });
  // 设备类型优先用设备字段，缺省时回落产品类型
  if (!info.device?.deviceType && info.product?.productType) {
    description.deviceType = info.product.productType;
  }
  if (info.device?.parentIdentification) {
    description.parentIdentification = info.device.parentIdentification;
  }
};

onMounted(() => {
  initDeviceDetail(route.params);
});

const activeKey = ref('Detail');

const handleTabClick = (key) => {
  activeKey.value = key;
};
</script>
<style lang="less">
@import '../styles/device-ops.less';
</style>

<style lang="less" scoped>
.device-drawer-wrapper {
  height: 100%;
  overflow-y: auto;
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
      }
    }
  }

  .device-tabs-card {
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
      padding: 12px 20px 16px;
      margin: 0;
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }

    :deep(.ant-tabs-nav) {
      margin-bottom: 16px;
      padding: 0;
      flex-shrink: 0;
    }

    :deep(.ant-tabs-content-holder) {
      padding: 0 0 8px;
      background: #ffffff;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }

    :deep(.ant-tabs-content) {
      height: 100%;
    }

    :deep(.ant-tabs-tabpane) {
      padding: 0;

      > * {
        height: 100%;
        overflow-y: auto;
      }

      > .access-guide {
        overflow: hidden;
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
