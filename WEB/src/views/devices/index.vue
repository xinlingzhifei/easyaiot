<template>
  <div class="device-wrapper">
    <BasicTable @register="registerTable" v-if="state.isTableMode">
      <template #toolbar>
        <Button type="primary" @click="handleClickAdd" preIcon="ant-design:plus-outlined">
          添加设备
        </Button>
        <Button type="default" @click="handleClickSwap"
                  preIcon="ant-design:swap-outlined">切换视图
        </Button>
        <PopConfirmButton
          placement="topRight"
          @confirm="handleClickDeleteAll"
          type="primary"
          color="error"
          :disabled="!checkedKeys.length"
          :title="`您确定要批量删除数据?`"
          preIcon="ant-design:delete-outlined"
        >批量删除
        </PopConfirmButton>
      </template>
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'connectStatus'">
          <Tag :color="record.connectStatus === 'ONLINE' ? 'green' : 'red'">{{
              record.connectStatus === 'ONLINE' ? '在线' : '离线'
            }}
          </Tag>
        </template>
        <template v-if="column.key === 'activeStatus'">
          <Tag :color="record.activeStatus === 1 ? 'green' : 'red'">{{
              record.activeStatus === 1 ? '已激活' : '未激活'
            }}
          </Tag>
        </template>
        <template v-if="column.dataIndex === 'action'">
          <TableAction
            :stopButtonPropagation="true"
            :actions="[
              {
                icon: 'ant-design:eye-outlined',
                tooltip: {
                  title: '详情',
                  placement: 'top',
                },
                onClick: goDeviceDrawer.bind(null, record),
              },
              {
                icon: 'ant-design:edit-filled',
                tooltip: {
                  title: '编辑',
                  placement: 'top',
                },
                onClick: openAddModal.bind(null, true, { isEdit: true, record }),
              },
              {
                icon: 'material-symbols:delete-outline-rounded',
                tooltip: {
                  title: '删除',
                  placement: 'top',
                },
                popConfirm: {
                  title: `是否确认删除？`,
                  placement: 'topRight',
                  confirm: handleClickDelete.bind(null, record),
                },
              },
            ]"
          />
        </template>
      </template>
    </BasicTable>
    <div v-else>
      <DeviceCardList :params="params" :api="getDevicesList" @get-method="getMethod"
                      @delete="handleDel" @edit="handleEdit" @view="handleView">
        <template #header>
          <Button type="primary" @click="handleClickAdd" preIcon="ant-design:plus-outlined">
            添加设备
          </Button>
          <Button type="default" @click="handleClickSwap"
                    preIcon="ant-design:swap-outlined">切换视图
          </Button>
          <PopConfirmButton
            placement="topRight"
            @confirm="handleClickDeleteAll"
            type="primary"
            color="error"
            :disabled="!checkedKeys.length"
            :title="`您确定要批量删除数据?`"
            preIcon="ant-design:delete-outlined"
          >批量删除
          </PopConfirmButton>
        </template>
      </DeviceCardList>
    </div>
    <DeviceModal @register="registerAddModel" @success="handleSuccess"/>
  </div>
</template>

<script setup lang="ts">
import moment from 'moment';
import {onMounted, reactive, ref} from 'vue';
import {
  deleteDevices,
  getDevicesList,
} from '@/api/device/devices';
import {Tag} from 'ant-design-vue';
import {getBasicColumns, getFormConfig} from './Data';
import {Button, PopConfirmButton} from '@/components/Button';
import {useMessage} from '@/hooks/web/useMessage';
import {BasicTable, TableAction, useTable} from '@/components/Table';
import {useDrawer} from '@/components/Drawer';
import DeviceModal from "@/views/devices/components/DeviceModalForm/DeviceModal.vue";
import {useRouter} from "vue-router";
import {getDeviceProfiles} from "@/api/device/product";
import DeviceCardList from "@/views/devices/components/CardList/DeviceCardList.vue";

defineOptions({name: 'Devices'})

const {createMessage} = useMessage();
const [registerAddModel, {openDrawer: openAddModal}] = useDrawer();
const selectDevices = ref<string>('');
const checkedKeys = ref<Array<string | number>>([]);

const state = reactive({
  isTableMode: false,
  productMap: {} as Record<string, { productName: string; protocolType: string }>,
});

// 请求api时附带参数
const params = {};

let cardListReload = () => {
};

// 获取内部fetch方法;
function getMethod(m: any) {
  cardListReload = m;
}

//详情按钮事件
function handleView(record) {
  goDeviceDrawer(record);
}

//编辑按钮事件
function handleEdit(record) {
  openAddModal(true, { isEdit: true, record });
}

//删除按钮事件
function handleDel(record) {
  handleClickDelete(record);
  handleSuccess();
}

const [registerTable, {reload}] = useTable({
  title: '设备信息档案列表',
  api: getDevicesList,
  beforeFetch: (data) => {
    const {page, pageSize, pageNo, order, field, textSearch, onlineStatus} = data;
    return {
      ...data,
      pageNum: pageNo || page,
      pageSize,
      textSearch,
      onlineStatus,
      deviceProfileIdStr: selectDevices.value,
      sortOrder: order == 'descend' ? 'DESC' : (order == 'ascend' ? 'ASC' : 'DESC'),
      sortProperty: field || 'updateTime',
      filterNoCustomer: 1,
    };
  },
  afterFetch: (data) => {
    //请求之后对返回值进行处理
    //console.log('afterFetch', data);
    let list = data.map((res) => {
      const {lastUpdateTime, additionalInfo} = res;
      const newDate = new Date(lastUpdateTime);
      res.lastUpdateTime = lastUpdateTime
        ? moment(newDate)?.format?.('YYYY-MM-DD HH:mm:ss')
        : '-';
      res.gateway = additionalInfo?.gateway;
      res.productName = state.productMap[res['productIdentification']]?.productName;
      res.protocolType = state.productMap[res['productIdentification']]?.protocolType;
      return res;
    });
    return list;
  },
  columns: getBasicColumns(),
  useSearchForm: true,
  formConfig: getFormConfig(),
  showTableSetting: false,
  tableSetting: {fullScreen: true},
  showIndexColumn: false,
  rowKey: 'id',
  fetchSetting: {
    listField: 'data',
    totalField: 'total',
  },
  rowSelection: {
    type: 'checkbox',
    selectedRowKeys: checkedKeys.value,
    onSelect: onSelect,
    onSelectAll: onSelectAll,
  },
});

const router = useRouter();

function goDeviceDrawer(record) {
  const params = {
    id: record.id,
    productIdentification: record.productIdentification,
    deviceIdentification: record.deviceIdentification,
    deviceType: record.deviceType,
  };
  router.push({name: 'DeviceDetail', params});
}

function onSelect(record, selected) {
  if (selected) {
    checkedKeys.value = [...checkedKeys.value, record.id];
  } else {
    checkedKeys.value = checkedKeys.value.filter((id) => id !== record.id);
  }
}

function onSelectAll(selected, _, changeRows) {
  const changeIds = changeRows.map((item) => item.id);
  if (selected) {
    checkedKeys.value = [...checkedKeys.value, ...changeIds];
  } else {
    checkedKeys.value = checkedKeys.value.filter((id) => {
      return !changeIds.includes(id);
    });
  }
}

// 删除选中
async function handleClickDeleteAll() {
  try {
    await Promise.all([...checkedKeys.value.map((item) => deleteDevices(item + ''))]);
    createMessage.success('删除成功');
  } catch (error) {
    console.error(error)
    //console.log(error);
    createMessage.error('删除失败');
  }
  handleSuccess();
}

async function handleClickDelete(record) {
  try {
    await deleteDevices(record.id);
    createMessage.success('删除成功');
  } catch (error) {
    console.error(error)
    //console.log(error);
    createMessage.error('删除失败');
  }
  handleSuccess();
}

// 新增
function handleClickAdd() {
  openAddModal(true, { isEdit: false });
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

async function initProductList() {
  const record = await getDeviceProfiles({ pageNum: 1, pageSize: 500 });
  record.data.forEach((item) => {
    state.productMap[item.productIdentification] = {
      productName: item.productName,
      protocolType: item.protocolType,
    };
  });
}

onMounted(() => {
  initProductList();
})
</script>

<style lang="less" scoped>
:deep(.iot-basic-table-action.left) {
  justify-content: center;
}

.device-wrapper {
  :deep(.ant-tabs-nav) {
    padding: 5px 0 0 25px;
  }

  :deep(.ant-form-item) {
    margin-bottom: 10px;
  }

  .device-tab {
    padding: 16px 19px 0 15px;

    .ant-tabs {
      background-color: #FFFFFF;

      :deep(.ant-tabs-nav) {
        padding: 5px 0 0 25px;
      }
    }
  }
}
</style>
