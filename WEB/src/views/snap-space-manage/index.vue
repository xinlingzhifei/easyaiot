<template>
  <div class="snap-space-page">
    <div class="page-header">
      <div class="header-left">
        <Button type="text" class="back-btn" @click="goBack">
          <ArrowLeftOutlined /> 返回抓拍空间
        </Button>
        <div v-if="spaceInfo" class="space-info">
          <h1 class="page-title">{{ spaceInfo.space_name }}</h1>
          <div class="page-meta">
            <a-tag color="green">抓拍告警</a-tag>
            <span v-if="spaceInfo.device_id">设备 {{ spaceInfo.device_id }}</span>
            <span>{{ alertList.length }} 条告警</span>
          </div>
        </div>
      </div>
    </div>

    <div class="snap-body">
      <!-- 左侧：日期 + 告警列表 -->
      <aside class="left-panel">
        <div class="panel-section">
          <div class="section-label">选择日期</div>
          <DatePicker
            v-model:value="selectedDate"
            value-format="YYYY-MM-DD"
            style="width: 100%"
            @change="handleDateChange"
          />
          <div v-if="dateHints.length" class="date-hints">
            <span
              v-for="d in dateHints.slice(0, 6)"
              :key="d.date"
              class="date-chip"
              :class="{ active: d.date === selectedDateStr }"
              @click="selectDate(d.date)"
            >
              {{ d.date.slice(5) }} ({{ d.count }})
            </span>
          </div>
        </div>

        <div class="panel-section alert-section">
          <div class="section-label">
            告警列表
            <span v-if="alertList.length" class="count-badge">{{ alertList.length }}</span>
          </div>
          <Spin :spinning="loading">
            <div v-if="!alertList.length && !loading" class="empty-hint">
              <Empty description="该日暂无告警" :image="Empty.PRESENTED_IMAGE_SIMPLE" />
            </div>
            <div v-else class="alert-list">
              <div
                v-for="alert in alertList"
                :key="alert.id"
                class="alert-item"
                :class="{ active: selectedAlert?.id === alert.id }"
                @click="selectAlert(alert)"
              >
                <div class="alert-thumb">
                  <img
                    v-if="alert.image_url"
                    :src="thumbUrl(alert.image_url)"
                    alt=""
                  />
                  <PictureOutlined v-else class="no-img" />
                </div>
                <div class="alert-info">
                  <div class="alert-event">{{ formatAlertEvent(alert.event) }}</div>
                  <div class="alert-time">{{ formatTime(alert.time) }}</div>
                  <div class="alert-object">{{ alert.object || alert.device_name || '-' }}</div>
                </div>
              </div>
            </div>
          </Spin>
        </div>
      </aside>

      <!-- 右侧：相册展示 -->
      <main class="right-panel">
        <div v-if="selectedAlert" class="preview-section">
          <div class="preview-header">
            <span class="preview-title">{{ formatAlertEvent(selectedAlert.event) }}</span>
            <span class="preview-time">{{ formatTime(selectedAlert.time) }}</span>
          </div>
          <div class="preview-image-wrap">
            <img
              v-if="selectedAlert.image_url"
              :src="thumbUrl(selectedAlert.image_url)"
              alt="告警图片"
              class="preview-image"
            />
            <Empty v-else description="暂无告警图片" />
          </div>
          <div class="preview-meta">
            <div class="meta-item">
              <span class="label">设备</span>
              <span>{{ selectedAlert.device_name || selectedAlert.device_id }}</span>
            </div>
            <div class="meta-item">
              <span class="label">告警对象</span>
              <span>{{ selectedAlert.object || '-' }}</span>
            </div>
            <div v-if="selectedAlert.region" class="meta-item">
              <span class="label">区域</span>
              <span>{{ selectedAlert.region }}</span>
            </div>
            <Button
              v-if="selectedAlert.device_id && selectedAlert.time"
              type="primary"
              size="small"
              class="view-record-btn"
              @click="handleViewRecord(selectedAlert)"
            >
              <VideoCameraOutlined /> 查看告警录像
            </Button>
          </div>
        </div>

        <div class="album-section">
          <div class="album-header">
            <span>告警相册</span>
            <span class="album-count">{{ alertList.length }} 张</span>
          </div>
          <Spin :spinning="loading">
            <div v-if="!alertList.length && !loading" class="album-empty">
              <Empty description="选择日期查看告警图片" />
            </div>
            <div v-else class="album-grid">
              <div
                v-for="alert in alertList"
                :key="'album-' + alert.id"
                class="album-item"
                :class="{ active: selectedAlert?.id === alert.id }"
                @click="selectAlert(alert)"
              >
                <img
                  v-if="alert.image_url"
                  :src="thumbUrl(alert.image_url)"
                  alt=""
                  loading="lazy"
                />
                <div v-else class="album-no-img">
                  <PictureOutlined />
                </div>
                <div class="album-overlay">
                  <span>{{ formatTime(alert.time, 'HH:mm:ss') }}</span>
                </div>
              </div>
            </div>
          </Spin>
        </div>
      </main>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router';
import { Button, DatePicker, Empty, Spin } from 'ant-design-vue';
import { ArrowLeftOutlined, PictureOutlined, VideoCameraOutlined } from '@ant-design/icons-vue';
import dayjs, { type Dayjs } from 'dayjs';
import { useMessage } from '@/hooks/web/useMessage';
import { getSnapSpace } from '@/api/device/snap';
import { queryAlarmList, queryAlertCountByDate } from '@/api/device/calculate';
import { navigateToAlertRecord } from '@/views/camera/utils/alertRecordNavigate';
import { resolveAlertImageDisplayUrl } from '@/utils/alertMinioImage';

defineOptions({ name: 'SnapSpaceManage' });

interface AlertItem {
  id: number;
  event?: string;
  object?: string;
  region?: string;
  time?: string;
  device_id?: string;
  device_name?: string;
  image_url?: string;
}

const route = useRoute();
const router = useRouter();
const { createMessage } = useMessage();

function parseRouteSpaceId(param: unknown): number | null {
  let raw = param;
  if (Array.isArray(raw)) raw = raw[0];
  if (raw == null || raw === '') return null;
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
}

const activeSpaceId = ref<number | null>(null);
let loadToken = 0;

function isOnSnapPage(): boolean {
  return route.name === 'SnapSpaceManage';
}

function teardownPage() {
  loadToken += 1;
  activeSpaceId.value = null;
  spaceInfo.value = null;
  alertList.value = [];
  selectedAlert.value = null;
  loading.value = false;
}

const spaceInfo = ref<{ space_name: string; device_id?: string } | null>(null);
const selectedDate = ref<Dayjs>(dayjs());
const selectedDateStr = computed(() => selectedDate.value.format('YYYY-MM-DD'));
const alertList = ref<AlertItem[]>([]);
const selectedAlert = ref<AlertItem | null>(null);
const loading = ref(false);
const dateHints = ref<{ date: string; count: number }[]>([]);

function goBack() {
  teardownPage();
  router.push({ path: '/camera/index', query: { tab: '4' } });
}

function thumbUrl(url?: string) {
  return resolveAlertImageDisplayUrl(url);
}

function formatTime(time?: string, fmt = 'YYYY-MM-DD HH:mm:ss') {
  if (!time) return '-';
  return dayjs(time).format(fmt);
}

function formatAlertEvent(event?: string) {
  if (!event) return '未知告警';
  return event;
}

function selectDate(date: string) {
  if (activeSpaceId.value == null) return;
  selectedDate.value = dayjs(date);
  void loadAlerts();
}

function handleDateChange() {
  if (activeSpaceId.value == null) return;
  void loadAlerts();
}

function selectAlert(alert: AlertItem) {
  selectedAlert.value = alert;
}

async function handleViewRecord(alert: AlertItem) {
  if (!alert.device_id || !alert.time) {
    createMessage.warning('缺少设备或告警时间');
    return;
  }
  const ok = await navigateToAlertRecord(router, {
    id: alert.id,
    device_id: alert.device_id,
    time: alert.time,
  });
  if (!ok) {
    createMessage.warning('未找到该设备关联的录像空间');
  }
}

async function loadSpaceInfo(token: number) {
  const id = activeSpaceId.value;
  if (id == null || token !== loadToken || !isOnSnapPage()) return;
  try {
    const res = await getSnapSpace(id);
    if (token !== loadToken) return;
    const data = (res as any)?.data ?? res;
    if (data) {
      spaceInfo.value = data;
    }
  } catch (e) {
    console.error(e);
    createMessage.error('加载抓拍空间信息失败');
  }
}

async function loadDateHints(token: number) {
  if (!spaceInfo.value?.device_id || token !== loadToken || !isOnSnapPage()) return;
  try {
    const res = await queryAlertCountByDate({
      device_id: spaceInfo.value.device_id,
    });
    if (token !== loadToken) return;
    const list = res?.count_list || [];
    dateHints.value = list
      .filter((item: { value: string; count: number }) => item.value)
      .map((item: { value: string; count: number }) => ({
        date: String(item.value),
        count: item.count,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
    if (dateHints.value.length && !dateHints.value.some((d) => d.date === selectedDateStr.value)) {
      selectedDate.value = dayjs(dateHints.value[0].date);
    }
  } catch (e) {
    console.error(e);
  }
}

async function loadAlerts() {
  if (!spaceInfo.value?.device_id || activeSpaceId.value == null || !isOnSnapPage()) return;
  const token = ++loadToken;
  loading.value = true;
  selectedAlert.value = null;
  try {
    const begin = `${selectedDateStr.value} 00:00:00`;
    const end = `${selectedDateStr.value} 23:59:59`;
    const res = await queryAlarmList({
      device_id: spaceInfo.value.device_id,
      begin_datetime: begin,
      end_datetime: end,
      pageNo: 1,
      pageSize: 500,
    });
    if (token !== loadToken) return;
    alertList.value = res?.alert_list || [];
    if (alertList.value.length) {
      selectedAlert.value = alertList.value[0];
    }
  } catch (e) {
    if (token === loadToken) {
      console.error(e);
      createMessage.error('加载告警列表失败');
      alertList.value = [];
    }
  } finally {
    if (token === loadToken) loading.value = false;
  }
}

async function initPage() {
  if (!isOnSnapPage()) return;
  const id = parseRouteSpaceId(route.params.spaceId);
  if (id == null) return;
  activeSpaceId.value = id;
  const token = ++loadToken;
  await loadSpaceInfo(token);
  if (token !== loadToken) return;
  await loadDateHints(token);
  if (token !== loadToken) return;
  await loadAlerts();
}

onMounted(() => {
  void initPage();
});

watch(
  () => (isOnSnapPage() ? route.params.spaceId : null),
  (param, prev) => {
    if (!isOnSnapPage()) {
      teardownPage();
      return;
    }
    if (param === prev && activeSpaceId.value != null) return;
    void initPage();
  },
);

onBeforeRouteLeave(() => {
  teardownPage();
});

onBeforeUnmount(() => {
  teardownPage();
});
</script>

<style lang="less" scoped>
.snap-space-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 100px);
  min-height: 600px;
  background: #f0f2f5;
}

.page-header {
  padding: 12px 20px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;

  .header-left {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .back-btn {
    color: #595959;
    padding-left: 0;
  }

  .page-title {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
  }

  .page-meta {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 4px;
    font-size: 13px;
    color: #8c8c8c;
  }
}

.snap-body {
  flex: 1;
  display: flex;
  margin: 12px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.left-panel {
  width: 340px;
  flex-shrink: 0;
  background: #fff;
  border-right: 1px solid #f0f0f0;
  display: flex;
  flex-direction: column;
}

.panel-section {
  padding: 16px;
  border-bottom: 1px solid #f5f5f5;

  .section-label {
    font-size: 13px;
    font-weight: 500;
    color: #595959;
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    gap: 6px;

    .count-badge {
      background: #f6ffed;
      color: #52c41a;
      font-size: 11px;
      padding: 0 6px;
      border-radius: 10px;
    }
  }
}

.date-hints {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;

  .date-chip {
    font-size: 12px;
    padding: 2px 8px;
    border-radius: 4px;
    background: #f5f5f5;
    cursor: pointer;

    &:hover, &.active {
      background: #f6ffed;
      color: #52c41a;
    }
  }
}

.alert-section {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.alert-list {
  overflow-y: auto;
  max-height: calc(100vh - 280px);
}

.alert-item {
  display: flex;
  gap: 10px;
  padding: 10px;
  border-radius: 6px;
  cursor: pointer;
  margin-bottom: 4px;
  border: 1px solid transparent;

  &:hover {
    background: #fafafa;
  }

  &.active {
    background: #f6ffed;
    border-color: #b7eb8f;
  }

  .alert-thumb {
    width: 56px;
    height: 56px;
    flex-shrink: 0;
    border-radius: 4px;
    overflow: hidden;
    background: #f5f5f5;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .no-img {
      font-size: 24px;
      color: #d9d9d9;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
    }
  }

  .alert-info {
    flex: 1;
    min-width: 0;

    .alert-event {
      font-size: 13px;
      font-weight: 500;
      color: #262626;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .alert-time {
      font-size: 12px;
      color: #8c8c8c;
      margin-top: 2px;
    }

    .alert-object {
      font-size: 12px;
      color: #595959;
      margin-top: 2px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
}

.empty-hint {
  padding: 24px 0;
}

.right-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #fff;
  min-width: 0;
  overflow: hidden;
}

.preview-section {
  padding: 20px 24px;
  border-bottom: 1px solid #f0f0f0;

  .preview-header {
    display: flex;
    align-items: baseline;
    gap: 12px;
    margin-bottom: 16px;

    .preview-title {
      font-size: 16px;
      font-weight: 600;
    }

    .preview-time {
      font-size: 13px;
      color: #8c8c8c;
    }
  }

  .preview-image-wrap {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 200px;
    max-height: 360px;
    background: #fafafa;
    border-radius: 8px;
    overflow: hidden;

    .preview-image {
      max-width: 100%;
      max-height: 360px;
      object-fit: contain;
    }
  }

  .preview-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 16px 24px;
    margin-top: 12px;
    font-size: 13px;

    .meta-item {
      .label {
        color: #8c8c8c;
        margin-right: 6px;
      }
    }

    .view-record-btn {
      margin-left: auto;
    }
  }
}

.album-section {
  flex: 1;
  padding: 16px 24px;
  overflow: hidden;
  display: flex;
  flex-direction: column;

  .album-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
    font-size: 14px;
    font-weight: 500;

    .album-count {
      font-size: 12px;
      color: #8c8c8c;
      font-weight: normal;
    }
  }
}

.album-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
  overflow-y: auto;
  flex: 1;
  padding-bottom: 16px;
}

.album-item {
  position: relative;
  aspect-ratio: 4/3;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  background: #f5f5f5;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.2s;
  }

  &:hover img {
    transform: scale(1.05);
  }

  &.active {
    border-color: #52c41a;
    box-shadow: 0 0 0 2px rgba(82, 196, 26, 0.2);
  }

  .album-no-img {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32px;
    color: #d9d9d9;
  }

  .album-overlay {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    padding: 4px 8px;
    background: linear-gradient(transparent, rgba(0, 0, 0, 0.6));
    color: #fff;
    font-size: 11px;
  }
}

.album-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
