<template>
  <div>
    <BasicTable v-if="state.isTableMode" @register="registerTable">
      <template #toolbar>
        <div style="display: flex; align-items: center; gap: 8px;">
          <a-button type="default" @click="handleClickSwap"
                    preIcon="ant-design:swap-outlined">切换视图
          </a-button>
          <a-button type="primary" danger @click="handleClearAllAlerts"
                    preIcon="ant-design:delete-outlined">一键清空告警
          </a-button>
        </div>
      </template>
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'device_id'">
          <span style="cursor: pointer" @click="handleCopy(record['device_id'])"><Icon
            icon="tdesign:copy-filled" color="#4287FCFF"/> {{ formatDeviceId(record['device_id']) }}</span>
        </template>
        <template v-if="column.key === 'device_name'">
          <span style="cursor: pointer" @click="handleCopy(record['device_name'])"><Icon
            icon="tdesign:copy-filled" color="#4287FCFF"/> {{ record['device_name'] }}</span>
        </template>
        <template v-if="column.key === 'task_type'">
          <a-tag :color="getTaskTypeColor(record['task_type'])">
            {{ getTaskTypeText(record['task_type']) }}
          </a-tag>
        </template>
        <template v-if="column.dataIndex === 'action'">
          <TableAction
            :actions="[
              {
                icon: 'ion:image-sharp',
                tooltip: {
                  title: '查看告警图片',
                  placement: 'top',
                },
                onClick: handleViewImage.bind(null, record),
              },
              {
                icon: 'icon-park-outline:video',
                tooltip: {
                  title: '查看告警录像',
                  placement: 'top',
                },
                onClick: handleViewVideo.bind(null, record),
              },
            ]"
          />
        </template>
      </template>
    </BasicTable>
    <div v-else>
      <AlertCards
        :api="queryAlarmList"
        :params="params"
        @getMethod="getMethod"
        @viewImage="handleCardViewImage"
        @viewVideo="handleCardViewVideo"
      >
        <template #header>
          <div style="display: flex; align-items: center; gap: 8px;">
            <a-button type="default" @click="handleClickSwap"
                      preIcon="ant-design:swap-outlined">切换视图
            </a-button>
            <a-button type="primary" danger @click="handleClearAllAlerts"
                      preIcon="ant-design:delete-outlined">一键清空告警
            </a-button>
          </div>
        </template>
      </AlertCards>
    </div>
    <!-- 图片查看弹窗 -->
    <ImageModal @register="registerImageModal" />
    <!-- 视频播放弹窗 -->
    <DialogPlayer @register="registerVideoModal" />
  </div>
</template>
<script lang="ts" setup name="noticeSetting">
import {reactive, ref, onMounted, onActivated} from 'vue';
import {BasicTable, TableAction, useTable} from '@/components/Table';
import {useMessage} from '@/hooks/web/useMessage';
import {getBasicColumns, getFormConfig} from "./Data";
import {useRouter} from "vue-router";
import {queryAlarmList, clearAllAlerts} from "@/api/device/calculate";
import {resolveAlertRecordVideoUrl} from '@/utils/alertRecord';
import {Icon} from "@/components/Icon";
import AlertCards from "@/views/alert/components/AlertCards/index.vue";
import ImageModal from "@/views/alert/components/ImageModal/index.vue";
import DialogPlayer from "@/components/VideoPlayer/DialogPlayer.vue";
import { useModal } from '@/components/Modal';

const router = useRouter();
const [registerImageModal, { openModal: openImageModal }] = useModal();
const [registerVideoModal, { openModal: openVideoModal }] = useModal();

defineOptions({name: 'Alarm'})

const state = reactive({
  isTableMode: false,
  activeKey: '1',
});

const params = ref<Record<string, any>>({});

let cardListReload = () => {};

/** 表格模式下保存的筛选条件（不含分页），翻页时合并 */
const lastTableFilterParams = ref<Record<string, any>>({});

const refreshData = () => {
  const route = router.currentRoute.value;
  if (route.query.task_name) {
    params.value = {task_name: route.query.task_name};
    setTimeout(() => {
      const form = getForm();
      if (form) {
        form.setFieldsValue({task_name: route.query.task_name});
      }
      reload();
      cardListReload();
    }, 100);
  } else {
    reload();
    cardListReload();
  }
};

onMounted(() => {
  refreshData();
});

onActivated(() => {
  refreshData();
});

// 获取内部fetch方法;
function getMethod(m: any) {
  cardListReload = m;
}

// 切换视图
function handleClickSwap() {
  state.isTableMode = !state.isTableMode;
}

// 表格刷新
function handleSuccess() {
  reload({
    page: 0,
  });
  cardListReload();
}

// 卡片视图事件处理
function handleCardViewImage(record) {
  handleViewImage(record);
}

function handleCardViewVideo(record) {
  handleViewVideo(record);
}

const {createMessage, createConfirm} = useMessage();
const [
  registerTable,
  {
    reload,
    getForm,
  },
] = useTable({
  canResize: true,
  showIndexColumn: false,
  title: '告警事件列表',
  api: queryAlarmList,
  columns: getBasicColumns(),
  useSearchForm: true,
  showTableSetting: false,
  formConfig: getFormConfig(),
  fetchSetting: {
    listField: 'alert_list',
    totalField: 'total',
    pageField: 'pageNo',
    sizeField: 'pageSize',
  },
  beforeFetch: (p) => {
    const timeRangeKey = '[begin_datetime, end_datetime]';
    if (p[timeRangeKey] && Array.isArray(p[timeRangeKey])) {
      const [begin, end] = p[timeRangeKey];
      if (begin && typeof begin.format === 'function') {
        p.begin_datetime = begin.format('YYYY-MM-DD HH:mm:ss');
      } else if (begin) {
        p.begin_datetime = begin;
      }
      if (end && typeof end.format === 'function') {
        p.end_datetime = end.format('YYYY-MM-DD HH:mm:ss');
      } else if (end) {
        p.end_datetime = end;
      }
      delete p[timeRangeKey];
    }
    if (p.begin_datetime && typeof p.begin_datetime === 'object' && typeof (p.begin_datetime as any).format === 'function') {
      p.begin_datetime = (p.begin_datetime as any).format('YYYY-MM-DD HH:mm:ss');
    }
    if (p.end_datetime && typeof p.end_datetime === 'object' && typeof (p.end_datetime as any).format === 'function') {
      p.end_datetime = (p.end_datetime as any).format('YYYY-MM-DD HH:mm:ss');
    }
    if (p.task_name) {
      p.task_name = String(p.task_name).trim();
      if (!p.task_name) delete p.task_name;
    }
    const route = router.currentRoute.value;
    if (route.query.task_name && !p.task_name) {
      p.task_name = String(route.query.task_name).trim();
    }
    if (p.begin_datetime === null || p.begin_datetime === undefined || p.begin_datetime === '') {
      delete p.begin_datetime;
    }
    if (p.end_datetime === null || p.end_datetime === undefined || p.end_datetime === '') {
      delete p.end_datetime;
    }
    const hasFilterParams = !!(
      p.begin_datetime ||
      p.end_datetime ||
      p.task_name ||
      p.device_id ||
      p.object ||
      p.event
    );
    if (!hasFilterParams && Object.keys(lastTableFilterParams.value).length > 0) {
      Object.assign(p, lastTableFilterParams.value);
    } else if (hasFilterParams) {
      const filterParams: Record<string, any> = {};
      if (p.begin_datetime) filterParams.begin_datetime = p.begin_datetime;
      if (p.end_datetime) filterParams.end_datetime = p.end_datetime;
      if (p.task_name) filterParams.task_name = p.task_name;
      if (p.device_id !== undefined && p.device_id !== '') filterParams.device_id = p.device_id;
      if (p.object !== undefined && p.object !== null && p.object !== '') filterParams.object = p.object;
      if (p.event !== undefined && p.event !== null && p.event !== '') filterParams.event = p.event;
      lastTableFilterParams.value = filterParams;
    }
    return p;
  },
  rowKey: 'id',
});

const handleViewImage = (record: Record<string, any>) => {
  const minioUrl = record['image_url'];
  if (minioUrl == null || String(minioUrl).trim() === '') {
    createMessage.warn('告警图片不存在');
    return;
  }
  openImageModal(true, {
    image_url: minioUrl,
  });
};

// 防重复提示：记录最近提示的时间和内容
let lastVideoErrorTime = 0;
let lastVideoErrorMsg = '';

const handleViewVideo = async (record) => {
  if (!record['device_id'] || !record['time']) {
    createMessage.warn('缺少必要信息：设备ID或告警时间');
    return;
  }

  try {
    const videoUrl = await resolveAlertRecordVideoUrl({
      id: record['id'],
      device_id: record['device_id'],
      time: record['time'],
      record_path: record['record_path'],
    });

    if (videoUrl) {
      openVideoModal(true, {
        id: record['device_id'],
        http_stream: videoUrl,
      });
      lastVideoErrorTime = 0;
      lastVideoErrorMsg = '';
    } else {
      showVideoErrorOnce('暂未找到该时间段的录像文件，请稍后再试');
    }
  } catch (error: any) {
    console.error('查询录像失败:', error);
    const errorData = error?.response?.data || error?.data;
    const errorMsg = errorData?.message || error?.message || '查询录像失败，请稍后重试';
    showVideoErrorOnce(errorMsg);
  }
};

// 防重复提示函数：3秒内相同错误只提示一次
function showVideoErrorOnce(message: string) {
  const now = Date.now();
  // 如果3秒内提示过相同内容，则不再提示
  if (now - lastVideoErrorTime < 3000 && lastVideoErrorMsg === message) {
    return;
  }
  lastVideoErrorTime = now;
  lastVideoErrorMsg = message;
  createMessage.warn(message);
}

// 格式化设备ID显示（超过8个字符省略）
function formatDeviceId(deviceId: string | null | undefined): string {
  if (!deviceId) return '-';
  if (deviceId.length <= 8) return deviceId;
  return deviceId.substring(0, 8) + '...';
}

// 获取任务类型文本
function getTaskTypeText(taskType: string | null | undefined): string {
  if (!taskType) return '实时';
  // 兼容 'snap' 和 'snapshot' 两种值
  if (taskType === 'snap' || taskType === 'snapshot') {
    return '抓拍';
  } else if (taskType === 'realtime') {
    return '实时';
  }
  return taskType;
}

// 获取任务类型标签颜色
function getTaskTypeColor(taskType: string | null | undefined): string {
  if (!taskType) return 'blue';
  // 兼容 'snap' 和 'snapshot' 两种值
  if (taskType === 'snap' || taskType === 'snapshot') {
    return 'green';
  } else if (taskType === 'realtime') {
    return 'blue';
  }
  return 'default';
}

async function handleCopy(record: object) {
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(record);
  } else {
    // 降级方案
    const textarea = document.createElement('textarea');
    textarea.value = record;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
  createMessage.success('复制成功');
}

// 一键清空所有告警
const handleClearAllAlerts = () => {
  createConfirm({
    title: '清空告警',
    iconType: 'warning',
    content: '确定要清空所有告警记录吗？此操作不可恢复！',
    async onOk() {
      try {
        await clearAllAlerts();
        createMessage.success('清空告警成功');
        reload();
        cardListReload();
      } catch (error: any) {
        const errorMsg =
          error?.response?.data?.msg ||
          error?.response?.data?.message ||
          error?.message ||
          '清空告警失败，请稍后重试';
        createMessage.error(errorMsg);
      }
    },
  });
};
</script>
