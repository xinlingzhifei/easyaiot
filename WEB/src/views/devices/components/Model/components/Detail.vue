<template>
  <BasicModal
    @register="register"
    title="属性历史数据"
    width="96%"
    :min-height="640"
    :centered="true"
    @cancel="handleCancel"
    @ok="handleSubmit"
  >
    <div class="history-modal">
      <div class="filter-bar">
        <div class="filter-group">
          <span class="filter-label">时间范围</span>
          <Segmented v-model:value="currentTime" :options="timeList" @change="handleQuickRangeChange" />
        </div>
        <div class="filter-divider"></div>
        <div class="filter-group custom-range">
          <span class="filter-label">自定义</span>
          <RangePicker
            v-model:value="customTime"
            :show-time="true"
            :disabled-date="disabledDate"
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DD HH:mm:ss"
            :allow-clear="true"
            @calendar-change="calendarPriceRangeChange"
            @change="handleCustomRangeChange"
          />
        </div>
      </div>

      <div class="history-content">
        <section class="trend-panel">
          <div class="panel-heading">
            <div>
              <div class="panel-title">{{ state.propertyName }}趋势</div>
              <div class="panel-subtitle">{{ activeRangeLabel }}</div>
            </div>
            <div v-if="latestPoint" class="latest-value">
              <span>最新值</span>
              <strong>{{ latestPoint.value }}{{ state.unit || '' }}</strong>
            </div>
          </div>
          <div class="chart-wrap">
            <div ref="chartRef" class="trend-chart"></div>
            <Empty
              v-if="!trendData.length"
              class="chart-empty"
              :image="Empty.PRESENTED_IMAGE_SIMPLE"
              description="暂无趋势数据"
            />
          </div>
        </section>

        <section class="table-panel">
          <div class="panel-heading compact-heading">
            <div>
              <div class="panel-title">数据明细</div>
              <div class="panel-subtitle">
                共 {{ tableRowCount }} 条记录
                <template v-if="trendData.length"> · 趋势点 {{ trendData.length }}</template>
                <template v-if="state.industrialPoint"> · 报文为响应 PDU，不含 MBAP 事务头</template>
              </div>
            </div>
          </div>
          <BasicTable @register="registerTable" />
        </section>
      </div>
    </div>
  </BasicModal>
</template>

<script lang="ts" setup name="Detail">
import { computed, nextTick, reactive, ref, Ref, watch } from 'vue';
import moment from 'moment';
import { Empty, RangePicker, Segmented } from 'ant-design-vue';
import { BasicModal, useModalInner } from '@/components/Modal';
import { BasicTable, useTable } from '@/components/Table';
import { useECharts } from '@/hooks/web/useECharts';
import { getDevicethingmodelsHistory } from '@/api/device/devices';
import { detailColumns } from '../tableData';
import { useRoute } from 'vue-router';

interface TrendPoint {
  time: string;
  timestamp: number;
  value: number;
}

const route = useRoute();
const chartRef = ref<HTMLDivElement | null>(null);
const { setOptions, resize, dispose: disposeChart } = useECharts(chartRef as Ref<HTMLDivElement>);

const state = reactive({
  unit: '',
  propertyName: '',
  deviceIdentification: '',
  identifier: '',
  industrialPoint: null as Record<string, any> | null,
});

const currentTime = ref<number | string>(1);
const timeList = [
  { label: '1小时', value: 1 },
  { label: '12小时', value: 12 },
  { label: '24小时', value: 24 },
  { label: '7天', value: 168 },
  { label: '30天', value: 720 },
];
const customTime = ref<string[]>([]);
const selectPriceDate = ref<any>('');
const trendData = ref<TrendPoint[]>([]);
const tableRowCount = ref(0);

const activeRangeLabel = computed(() => {
  if (customTime.value?.length === 2) {
    return `${customTime.value[0]} 至 ${customTime.value[1]}`;
  }
  return timeList.find((item) => item.value === currentTime.value)?.label || '';
});

const latestPoint = computed(() => {
  if (!trendData.value.length) return null;
  return [...trendData.value].sort((a, b) => b.timestamp - a.timestamp)[0];
});

function getTimeRange() {
  if (customTime.value?.length === 2) {
    return [Date.parse(customTime.value[0]), Date.parse(customTime.value[1])];
  }
  const endTime = Date.now();
  return [endTime - 60 * 60 * 1000 * Number(currentTime.value), endTime];
}

function handleQuickRangeChange() {
  customTime.value = [];
  reload({ page: 1 });
}

function calendarPriceRangeChange(date) {
  selectPriceDate.value = date?.[0];
}

function disabledDate(current) {
  if (!selectPriceDate.value) return false;
  return (
    current < moment(selectPriceDate.value).subtract(90, 'days') ||
    current > moment(selectPriceDate.value).add(90, 'days')
  );
}

function handleCustomRangeChange(dates) {
  customTime.value = dates || [];
  selectPriceDate.value = '';
  if (customTime.value.length === 2) reload({ page: 1 });
}

interface ParsedHistoryValue {
  display: string;
  numeric: number | null;
}

function toChartNumber(value: unknown): number | null {
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (value == null || value === '') return null;
  const text = String(value).trim();
  if (!text) return null;
  if (text === 'true' || text === 'TRUE') return 1;
  if (text === 'false' || text === 'FALSE') return 0;
  const numeric = Number(text);
  return Number.isFinite(numeric) ? numeric : null;
}

function extractRawPayload(raw: unknown, identifier: string): string | null {
  if (raw == null || !identifier) return null;
  const text = String(raw).trim();
  if (!text.startsWith('{')) return null;
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    const rawMap = parsed?._raw;
    if (rawMap && typeof rawMap === 'object' && !Array.isArray(rawMap)) {
      const payload = (rawMap as Record<string, unknown>)[identifier];
      return payload == null ? null : String(payload);
    }
  } catch {
    // ignore
  }
  return null;
}

function parseHistoryDataValue(raw: unknown, identifier: string): ParsedHistoryValue {
  if (raw == null || raw === '') {
    return { display: '--', numeric: null };
  }
  const text = String(raw).trim();
  if (!text) {
    return { display: '--', numeric: null };
  }

  if (!text.startsWith('{') && !text.startsWith('[')) {
    return { display: text, numeric: toChartNumber(text) };
  }

  try {
    const parsed = JSON.parse(text);
    if (parsed != null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const record = parsed as Record<string, unknown>;
      let value = identifier ? record[identifier] : undefined;
      const properties = record.properties;
      if (value == null && properties && typeof properties === 'object' && !Array.isArray(properties)) {
        value = (properties as Record<string, unknown>)[identifier];
      }
      const dataField = record.data;
      if (value == null && dataField && typeof dataField === 'object' && !Array.isArray(dataField)) {
        value = (dataField as Record<string, unknown>)[identifier];
      }
      if (value == null && record.value != null && Object.keys(record).length <= 2) {
        value = record.value;
      }
      if (value == null && record._value != null) {
        value = record._value;
      }
      if (value == null) {
        const candidates = Object.entries(record).filter(([key]) => !key.startsWith('_'));
        if (candidates.length === 1) {
          value = candidates[0][1];
        }
      }
      if (value != null) {
        return {
          display: String(value),
          numeric: toChartNumber(value),
        };
      }
    }
  } catch {
    // 非 JSON，保留原始文本
  }

  return {
    display: text,
    numeric: toChartNumber(text),
  };
}

async function renderChart() {
  // 弹窗 destroyOnClose 后 DOM 重建，先丢掉旧实例再绑定新节点
  await nextTick();
  disposeChart();
  await nextTick();

  if (!trendData.value.length) {
    return;
  }
  const sorted = [...trendData.value].sort((a, b) => a.timestamp - b.timestamp);
  await setOptions({
    grid: { left: 56, right: 24, top: 24, bottom: 48 },
    tooltip: {
      trigger: 'axis',
      valueFormatter: (value) => `${value}${state.unit || ''}`,
    },
    xAxis: {
      type: 'time',
      axisLabel: {
        formatter: (value: number) => moment(value).format('MM-DD HH:mm'),
      },
    },
    yAxis: {
      type: 'value',
      name: state.unit ? `单位：${state.unit}` : undefined,
      scale: true,
    },
    series: [
      {
        type: 'line',
        name: state.propertyName,
        showSymbol: sorted.length < 80,
        data: sorted.map((item) => [item.timestamp, item.value]),
        lineStyle: { width: 2.5, color: '#1677ff' },
        itemStyle: { color: '#1677ff' },
      },
    ],
  } as any);
  resize();
}

const [register, { closeModal, getOpen }] = useModalInner(({ data }) => {
  state.unit = data.unit || '';
  state.propertyName = data.propertyName || data.propertyCode;
  state.deviceIdentification = String(
    data.deviceIdentification || route.params.deviceIdentification || '',
  );
  state.identifier = data.propertyCode;
  state.industrialPoint = data.industrialPoint || null;
  currentTime.value = 1;
  customTime.value = [];
  trendData.value = [];
  tableRowCount.value = 0;
  disposeChart();

  const valueTitle = state.industrialPoint
    ? `解析值${state.unit ? `（${state.unit}）` : ''}`
    : `${state.propertyName}${state.unit ? `（${state.unit}）` : ''}`;
  const columns: any[] = [...detailColumns(), { title: valueTitle, dataIndex: 'dataValue' }];
  if (state.industrialPoint) {
    columns.push(
      {
        title: '寄存器值',
        dataIndex: 'rawRegister',
        width: 120,
        customRender: ({ record }) => buildRawDisplay(record.rawData, state.industrialPoint).register,
      },
      {
        title: '数值进制',
        dataIndex: 'valueRadix',
        width: 105,
        customRender: ({ record }) => buildRawDisplay(record.rawData, state.industrialPoint).radix,
      },
      {
        title: '报文原始数据（PDU）',
        dataIndex: 'rawPayload',
        width: 260,
        customRender: ({ record }) => record.rawData || '--',
      },
    );
  }
  setColumns(columns);
  reload({ page: 1 });
});

watch(getOpen, (open) => {
  if (!open) {
    disposeChart();
    trendData.value = [];
    tableRowCount.value = 0;
  }
});

const [registerTable, { setColumns, reload }] = useTable({
  resizeHeightOffset: 120,
  api: getDevicethingmodelsHistory,
  bordered: false,
  showIndexColumn: false,
  useSearchForm: false,
  pagination: { pageSize: 1000, hideOnSinglePage: true },
  fetchSetting: { listField: 'data', totalField: 'total' },
  beforeFetch(ext) {
    const [startTime, endTime] = getTimeRange();
    return {
      ...ext,
      pageSize: 1000,
      deviceIdentification: state.deviceIdentification,
      identifier: state.identifier,
      startTime,
      endTime,
    };
  },
  afterFetch(data) {
    const identifier = state.identifier;
    const rows = (data || []).map((item) => {
      const originalValue = item.dataValue ?? item.datavalue;
      const parsed = parseHistoryDataValue(originalValue, identifier);
      const rawData = item.rawData || extractRawPayload(originalValue, identifier);
      return {
        ...item,
        dataValue: parsed.display,
        rawData: rawData || undefined,
        _chartValue: parsed.numeric,
      };
    });

    tableRowCount.value = rows.length;
    trendData.value = rows
      .filter((item) => item._chartValue != null && Number.isFinite(item._chartValue))
      .map((item) => ({
        time: moment(Number(item.ts)).format('YYYY-MM-DD HH:mm:ss'),
        timestamp: Number(item.ts),
        value: item._chartValue as number,
      }))
      .filter((item) => Number.isFinite(item.timestamp));

    renderChart();
    return rows.map(({ _chartValue, ...rest }) => rest);
  },
  immediate: false,
});

function resetAndClose() {
  trendData.value = [];
  tableRowCount.value = 0;
  customTime.value = [];
  state.industrialPoint = null;
  disposeChart();
  closeModal();
}

const handleSubmit = resetAndClose;
const handleCancel = resetAndClose;

interface RawDisplay {
  register: string;
  radix: string;
}

function emptyRawDisplay(value: unknown = '--'): RawDisplay {
  const text = value == null || value === '' ? '--' : String(value);
  return { register: text, radix: '--' };
}

function buildRawDisplay(rawData: unknown, point: Record<string, any> | null): RawDisplay {
  if (!rawData || !point) return emptyRawDisplay();
  const tokens = String(rawData).trim().split(/\s+/);
  if (tokens.length < 4 || tokens.some((token) => !/^[0-9a-fA-F]{2}$/.test(token))) {
    return emptyRawDisplay();
  }
  const byteCount = Number.parseInt(tokens[2], 16);
  const dataTokens = tokens.slice(3, 3 + byteCount);
  if (!dataTokens.length) return emptyRawDisplay();
  const bytes = dataTokens.map((token) => Number.parseInt(token, 16));
  let registerValue = 0;
  for (const byte of bytes) {
    registerValue = (registerValue << 8) | byte;
  }
  const radix = Number(point.valueRadix || 16);
  const radixLabel =
    radix === 2 ? 'BIN / 2进制' : radix === 8 ? 'OCT / 8进制' : radix === 10 ? 'DEC / 10进制' : 'HEX / 16进制';
  const registerText =
    radix === 2
      ? `0b${registerValue.toString(2)}`
      : radix === 8
        ? `0o${registerValue.toString(8)}`
        : radix === 10
          ? String(registerValue)
          : `0x${registerValue.toString(16).toUpperCase().padStart(Math.max(2, bytes.length * 2), '0')}`;
  return { register: registerText, radix: radixLabel };
}
</script>

<style lang="less" scoped>
.history-modal {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-height: 600px;
  padding: 4px 4px 8px;
}

.filter-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 20px;
  padding: 16px 20px;
  background: #f7f9fc;
  border: 1px solid #eef0f4;
  border-radius: 10px;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.filter-label {
  color: rgba(0, 0, 0, 0.45);
  white-space: nowrap;
  font-size: 13px;
}

.filter-divider {
  width: 1px;
  height: 28px;
  background: #e5e7eb;
}

.history-content {
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  gap: 20px;
  min-height: 520px;
}

.trend-panel,
.table-panel {
  display: flex;
  flex-direction: column;
  min-width: 0;
  border: 1px solid #eef0f4;
  border-radius: 10px;
  overflow: hidden;
  background: #fff;
}

.panel-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px 0;
}

.compact-heading {
  padding-bottom: 12px;
}

.panel-title {
  font-size: 16px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}

.panel-subtitle {
  margin-top: 6px;
  color: rgba(0, 0, 0, 0.45);
  font-size: 13px;
}

.latest-value {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;

  strong {
    color: #1677ff;
    font-size: 22px;
    line-height: 1.2;
  }
}

.chart-wrap {
  position: relative;
  flex: 1;
  min-height: 360px;
  padding: 12px 12px 20px;
}

.trend-chart {
  width: 100%;
  height: 360px;
}

.chart-empty {
  position: absolute;
  inset: 12px 12px 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.92);
}

.table-panel {
  :deep(.ant-table-wrapper) {
    padding: 0 12px 12px;
  }
}

@media (max-width: 1200px) {
  .history-content {
    grid-template-columns: 1fr;
  }
}
</style>
