<template>
  <div class="phsyical-modal">
    <div class="toolbar">
      <RadioGroup
        :value="state.functionType"
        button-style="solid"
        class="type-radio-group"
        @change="handleTypeChange"
      >
        <RadioButton
          v-for="item in typeOptions"
          :key="item.key"
          :value="item.key"
        >
          {{ item.label }}
          <template v-if="state.functionType === item.key">
            ({{ pagination.total }})
          </template>
        </RadioButton>
      </RadioGroup>

      <div class="toolbar-actions">
        <template v-if="isEdit">
          <span class="draft-hint">草稿未发布，发布后生效</span>
          <Button type="primary" preIcon="ant-design:plus-outlined" @click="handleEdit('add')">
            新增
          </Button>
          <Button type="primary" color="success" preIcon="ant-design:cloud-upload-outlined" @click="handleRelease">
            发布
          </Button>
          <Button @click="isEdit = false">退出编辑</Button>
        </template>
        <Button
          v-else
          type="primary"
          preIcon="ant-design:edit-outlined"
          @click="isEdit = true"
        >
          编辑物模型
        </Button>
        <Button
          type="default"
          preIcon="ant-design:swap-outlined"
          @click="handleViewSwap"
        >
          切换视图
        </Button>
      </div>
    </div>

    <div v-show="viewMode === 'table'" class="table-view">
      <BasicTable @register="registerTable">
        <template #action="{ record }">
          <TableAction :actions="actionsBtn(record)" />
        </template>
      </BasicTable>
    </div>

    <div v-show="viewMode === 'card'" class="card-view">
      <div class="card-search-form">
        <BasicTable @register="registerTable" />
      </div>
      <div class="card-container">
        <div v-if="cardData.length === 0" class="empty-state">
          <Empty description="暂无数据" />
        </div>
        <div v-else class="card-grid">
          <div v-for="record in cardData" :key="record.id" class="prop-card">
            <div class="card-header">
              <div class="title-wrap">
                <span class="title">
                  <span class="name">{{ getCardTitle(record) }}</span>
                  <span v-if="getCardCode(record)" class="code">({{ getCardCode(record) }})</span>
                </span>
              </div>
              <Tag :color="record.templateIdentification ? 'success' : 'orange'">
                {{ record.templateIdentification ? '标准' : '自定义' }}
              </Tag>
            </div>

            <div class="card-body">
              <div class="primary-line">{{ getPrimaryValue(record) }}</div>
              <div v-if="getSecondaryHint(record)" class="secondary-line">
                {{ getSecondaryHint(record) }}
              </div>
            </div>

            <div class="card-footer">
              <div class="meta-hint">
                <span v-if="record.templateIdentification">来自标准模板</span>
                <span v-else>产品自定义</span>
              </div>
              <div class="footer-actions" @click.stop>
                <TableAction :actions="actionsBtn(record)" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-if="cardData.length > 0" class="card-pagination">
        <Pagination
          v-model:current="pagination.current"
          v-model:pageSize="pagination.pageSize"
          :total="pagination.total"
          :showSizeChanger="true"
          :showTotal="(total) => `共 ${total} 条`"
          @change="handlePageChange"
          @showSizeChange="handlePageSizeChange"
        />
      </div>
    </div>

    <Edit
      :title="state.editModelTitle"
      :productIdentification="props.productIdentification"
      @register="registerEditModal"
      @submit="handleSubmit"
      @update:edit-function-type="updateEditFunctionType"
    />
  </div>
</template>

<script lang="ts" setup name="PhysicalModal">
import {BasicTable, TableAction, useTable, type ActionItem} from '@/components/Table';
import {getBasicColumns, getFormConfig} from '../data/ProductData';
import {useModal} from '@/components/Modal';
import Edit from './Edit.vue';
import { onMounted, reactive, ref, withDefaults, watch } from 'vue';
import {
  delPhsyicalEvent,
  delPhsyicalProperties,
  delPhsyicalService,
  getEventsList,
  getPropertiesList,
  getServicesList,
  releasePhsyical,
  savePhsyicalEvent,
  savePhsyicalProperties,
  savePhsyicalServiceWithParams,
  updatePhsyicalEvent,
  updatePhsyicalProperties,
  updatePhsyicalServiceWithParams,
  getPhsyicalServiceDetail,
} from '@/api/device/phsyicalModal';
import { getCommandsList } from '@/api/device/command';
import { getCommandsRequestList } from '@/api/device/command-parameter';
import {useMessage} from '@/hooks/web/useMessage';
import { Empty, Pagination, RadioButton, RadioGroup, Tag } from 'ant-design-vue';
import { Button } from '@/components/Button';
interface Props {
    productIdentification: string;
    deviceProfileName: string;
  }

  const props = withDefaults(defineProps<Props>(), {
    productIdentification: '',
    deviceProfileName: '',
  });

  const state = reactive({
    functionType : 'properties',
    editFunctionType : 'properties',
    editModelTitle: '物模型',
  });

  const typeOptions = [
    { key: 'properties', label: '属性' },
    { key: 'services', label: '服务' },
    { key: 'events', label: '事件' },
  ];

  const { createMessage } = useMessage();
  // 是否处理编辑物模型
  const isEdit = ref(false);
  // 视图模式：table 或 card
  const viewMode = ref<'table' | 'card'>('card');
  // 卡片数据
  const cardData = ref<any[]>([]);
  // 分页信息
  const pagination = reactive({
    current: 1,
    pageSize: 12,
    total: 0,
  });

  const [registerTable, { reload, setColumns, getDataSource, getPaginationRef }] = useTable({
    canResize: true,
    showIndexColumn: false,
    columns: getBasicColumns('properties'),
    useSearchForm: true,
    formConfig: getFormConfig(),
    rowKey: 'id',
    actionColumn: {
      width: 100,
      title: '操作',
      dataIndex: 'action',
      slots: { customRender: 'action' },
    },
    api: getPropertiesList,
    beforeFetch(params) {
      return {
        ...params,
        productIdentification: props.productIdentification,
        customApi: state.functionType == 'properties' ? getPropertiesList : state.functionType == 'services' ? getServicesList : getEventsList,
      };
    },
    fetchSetting: {
      listField: 'data',
      totalField: 'total',
    },
    pagination: true,
    afterFetch: async (data) => {
      let rows = data || [];
      if (state.functionType === 'services' && rows.length) {
        rows = await enrichServiceParamCounts(rows);
      }
      // 更新卡片数据
      cardData.value = rows;
      const paginationInfo = getPaginationRef();
      if (paginationInfo && typeof paginationInfo === 'object') {
        pagination.total = paginationInfo.total || 0;
        pagination.current = paginationInfo.current || 1;
        pagination.pageSize = paginationInfo.pageSize || 12;
      }
      return rows;
    },
  });

  const normalizeList = (response: any) => {
    if (Array.isArray(response)) return response;
    return response?.rows || response?.data || response?.list || [];
  };

  const enrichServiceParamCounts = async (rows: any[]) => {
    await Promise.all(
      rows.map(async (svc) => {
        if (!svc?.id) {
          svc.inputParamCount = 0;
          return;
        }
        try {
          const cmdRes = await getCommandsList({ serviceId: svc.id, pageNum: 1, pageSize: 20 });
          const commands = normalizeList(cmdRes);
          if (!commands.length) {
            svc.inputParamCount = 0;
            return;
          }
          const preferred =
            commands.find((c) => c.commandCode === svc.serviceCode) || commands[0];
          const reqRes = await getCommandsRequestList({
            commandsId: preferred.id,
            pageNum: 1,
            pageSize: 200,
          });
          svc.inputParamCount = normalizeList(reqRes).length;
        } catch {
          svc.inputParamCount = 0;
        }
      }),
    );
    return rows;
  };

  const [registerEditModal, { openModal: openEditModal }] = useModal();
  const actionsBtn = (record: { id: string }): ActionItem[] => {
    if (isEdit.value) {
      return [
        {
          tooltip: {
            title: '编辑',
            placement: 'top',
          },
          icon: 'ant-design:edit-filled',
          onClick: () => {
            state.editModelTitle = '编辑物模型' + (state.functionType == 'properties'?'属性':state.functionType == 'services'?'服务':'事件')
            handleEdit('edit', record);
          },
        },
        {
          tooltip: {
            title: '删除',
            placement: 'top',
          },
          icon: 'material-symbols:delete-outline-rounded',

          popConfirm: {
            title: '是否确认删除？',
            confirm: () => {
              if(state.functionType == 'properties') {
                delPhsyicalProperties(record.id).then(() => {
                  createMessage.success('删除成功');
                  reload();
                });
              } else if(state.functionType == 'services'){
                delPhsyicalService(record.id).then(() => {
                  createMessage.success('删除成功');
                  reload();
                });
              } else if(state.functionType == 'events'){
                delPhsyicalEvent(record.id).then(() => {
                  createMessage.success('删除成功');
                  reload();
                });
              }
            },
          },
        },
      ];
    } else {
      return [
        {
          tooltip: {
            title: '查看',
            placement: 'top',
          },
          icon: 'ant-design:eye-outlined',
          onClick: () => {
            state.editModelTitle = '查看物模型' + (state.functionType == 'properties'?'属性':state.functionType == 'services'?'服务':'事件')
            handleEdit('view', record)
          },
        },
      ];
    }
  };

  //更新物模型功能类型
  const updateFunctionType = (type) => {
    state.functionType = type;
    setColumns(getBasicColumns(state.functionType ?? 'properties'));
    pagination.current = 1;
    reload();
  };

  const handleTypeChange = (e) => {
    updateFunctionType(e?.target?.value ?? e);
  };

  const handleViewSwap = () => {
    viewMode.value = viewMode.value === 'card' ? 'table' : 'card';
  };

  const getCardTitle = (record: any) => {
    if (state.functionType === 'properties') {
      return record.propertyName || record.propertyCode || '--';
    }
    if (state.functionType === 'services') {
      return record.serviceName || record.serviceCode || '--';
    }
    if (state.functionType === 'events') {
      return record.eventName || record.eventCode || '--';
    }
    return '--';
  };

  const getCardCode = (record: any) => {
    if (state.functionType === 'properties') return record.propertyCode || '';
    if (state.functionType === 'services') return record.serviceCode || '';
    if (state.functionType === 'events') return record.eventCode || '';
    return '';
  };

  const getPrimaryValue = (record: any) => {
    if (state.functionType === 'properties') {
      return formatDataType(record.datatype);
    }
    if (state.functionType === 'services') {
      if (record.inputParamCount == null) return '--';
      return record.inputParamCount > 0 ? `${record.inputParamCount} 个入参` : '无参';
    }
    if (state.functionType === 'events') {
      return formatEventType(record.eventType);
    }
    return '--';
  };

  const getSecondaryHint = (record: any) => {
    if (record.description) return record.description;
    if (state.functionType === 'properties' && record.accessMode) {
      return `访问模式：${record.accessMode}`;
    }
    return '';
  };

  // 格式化数据类型
  const formatDataType = (text: string) => {
    if (text === 'TEXT' || text === 'string' || text === 'String' || text === 'text') {
      return 'text（字符串）';
    } else if (text === 'INT' || text === 'int' || text === 'Int' || text === 'int32') {
      return 'int32（整数型）';
    } else if (text === 'DOUBLE' || text === 'double' || text === 'Double') {
      return 'double（双精度浮点型）';
    } else if (text === 'BOOL' || text === 'bool' || text === 'Bool' || text === 'boolean' || text === 'Boolean') {
      return 'bool（布尔型）';
    } else if (text === 'SUBUCT' || text === 'struct' || text === 'Struct') {
      return 'struct（结构体）';
    }
    return text || '--';
  }

  // 格式化事件类型
  const formatEventType = (text: string) => {
    if (text === 'INFO_EVENT_TYPE') {
      return '信息';
    } else if (text === 'ALERT_EVENT_TYPE') {
      return '告警';
    } else if (text === 'ERROR_EVENT_TYPE') {
      return '故障';
    }
    return text || '--';
  }

  // 页面变化处理
  const handlePageChange = (page: number, pageSize: number) => {
    pagination.current = page;
    pagination.pageSize = pageSize;
    reload();
  }

  // 页面大小变化处理
  const handlePageSizeChange = (current: number, size: number) => {
    pagination.current = current;
    pagination.pageSize = size;
    reload();
  }

  // 监听视图模式变化，加载卡片数据
  watch(viewMode, (newMode) => {
    if (newMode === 'card') {
      // 延迟获取数据，确保表格已加载
      setTimeout(() => {
        const data = getDataSource();
        cardData.value = data || [];
        const paginationInfo = getPaginationRef();
        if (paginationInfo && typeof paginationInfo === 'object') {
          pagination.total = paginationInfo.total || 0;
          pagination.current = paginationInfo.current || 1;
          pagination.pageSize = paginationInfo.pageSize || 12;
        }
      }, 100);
    }
  }, { immediate: true });

  //更新物模型编辑功能类型
  const updateEditFunctionType = (type) => {
    state.editFunctionType = type;
  }

  // 新增物模型
  const handleEdit = async (modalType: 'add' | 'edit' | 'view', record?: any) => {
    let params = record ?? {};
    params.functionType = state.functionType ?? 'properties';
    if (record) {
      const functionJson =
        typeof record?.functionJson === 'string'
          ? JSON.parse(record.functionJson)
          : record?.functionJson ?? '';
      params = {
        ...functionJson,
        ...params,
      };
    }
    // 服务编辑/查看：加载入参出参
    if (state.functionType === 'services' && record?.id) {
      try {
        const detail: any = await getPhsyicalServiceDetail(record.id);
        params = {
          ...params,
          ...detail,
          inputParams: detail?.inputParams || [],
          outParams: detail?.outParams || [],
          functionType: 'services',
        };
      } catch (e) {
        console.warn('加载服务详情失败', e);
        params.inputParams = params.inputParams || [];
        params.outParams = params.outParams || [];
      }
    }
    openEditModal(true, { modalType, ...params });
  };

  const mapServiceParams = (list: any[] = []) =>
    (list || []).map((p) => {
      const item = { ...p };
      if (item.datatype === 'BOOL') {
        const tmp: any = {};
        tmp['0'] = item.boolClose ?? '关';
        tmp['1'] = item.boolOpen ?? '开';
        item.enumlist = JSON.stringify(tmp);
      }
      if (item.datatype === 'TEXT' && (item.maxlength == null || item.maxlength === undefined)) {
        item.maxlength = item.length || 10240;
      }
      item.parameterCode = item.parameterCode || item.propertyCode;
      item.parameterName = item.parameterName || item.propertyName;
      item.propertyCode = item.parameterCode;
      item.propertyName = item.parameterName;
      return item;
    });

  // 保存物模型数据到列表
  const handleSubmit = (res) => {
    const { id, datatype, functionJson } = res;
    let text = '新增';
    let enumlist = "";
    if(datatype == 'BOOL') {
      let tmp = {};
      tmp['0'] = functionJson['boolClose'];
      tmp['1'] = functionJson['boolOpen'];
      enumlist = JSON.stringify(tmp);
    }
    let maxlength = "";
    if(datatype == 'TEXT') {
      if(functionJson['maxlength'] == null || functionJson['maxlength'] == undefined) {
        maxlength = '10240';
      } else {
        maxlength = functionJson['maxlength'];
      }
    }
    const params = {
      ...res,
      ...functionJson,
      enumlist: enumlist,
      maxlength: maxlength,
      productIdentification: props.productIdentification,
    };
    delete params.functionJson;

    // 服务：一体保存入参/出参
    if (state.editFunctionType == 'services') {
      const payload = {
        id: id || undefined,
        serviceCode: params.serviceCode,
        serviceName: params.serviceName,
        description: params.description,
        productIdentification: props.productIdentification,
        status: params.status || '0',
        inputParams: mapServiceParams(params.inputParams),
        outParams: mapServiceParams(params.outParams),
      };
      const req = id
        ? updatePhsyicalServiceWithParams({ ...payload, id })
        : savePhsyicalServiceWithParams(payload);
      req
        .then(() => {
          reload();
          createMessage.success(`${id ? '修改' : '新增'}成功`);
        })
        .catch((e) => {
          createMessage.error(e?.message || '保存服务失败');
        });
      return;
    }

    if (id) {
      params.id = id;
      text = '修改';
      if(state.editFunctionType == 'properties') {
        updatePhsyicalProperties(params).then(() => {
          reload();
          createMessage.success(`${text}成功`);
        });
      } else if(state.editFunctionType == 'events') {
        updatePhsyicalEvent(params).then(() => {
          reload();
          createMessage.success(`${text}成功`);
        });
      }
    } else {
      delete params.id;
      if(state.editFunctionType == 'properties') {
        savePhsyicalProperties(params).then(() => {
          reload();
          createMessage.success(`${text}成功`);
        });
      } else if(state.editFunctionType == 'events') {
        savePhsyicalEvent(params).then(() => {
          reload();
          createMessage.success(`${text}成功`);
        });
      }
    }
  };

  // 发布上线
  const handleRelease = () => {
    releasePhsyical(props.productIdentification).then(() => {
      createMessage.success('发布成功');
      reload();
      isEdit.value = false;
    });
  };

  const handleFormatTsl = (obj) => {
    const { name, identifier, datatype, functionJson, functionType, eventType } = obj;

    const { callType, innerJson, accessMode, inputParams, outParams } = functionJson ?? {};

    switch (functionType) {
      case 'properties':
        return {
          functionName: name,
          identifier,
          datatype,
          readWrite: accessMode ?? null,
          specs: {
            type: datatype,
            specs: innerJson.map((e) => {
              return {
                ...handleFormatTsl({ functionType, ...e }),
                accessMode: accessMode ?? null,
              };
            }),
          },
        };
      case 'services':
        return {
          functionName: name,
          identifier,
          callType,
          inputData: inputParams?.map((e) => {
            return {
              ...handleFormatTsl({ functionType, ...e }),
              accessMode: e.accessMode ?? null,
              datatype: {
                type: e.datatype,
                specs: e.innerJson?.map((v) => {
                  return {
                    ...handleFormatTsl({ functionType, ...v }),
                    accessMode: v.accessMode ?? null,
                  };
                }),
              },
            };
          }),
          outData: outParams?.map((e) => {
            return {
              ...handleFormatTsl({ functionType, ...e }),
              accessMode: e.accessMode ?? null,
              datatype: {
                type: e.datatype,
                specs: e.innerJson?.map((v) => {
                  return {
                    ...handleFormatTsl({ functionType, ...v }),
                    accessMode: v.accessMode ?? null,
                  };
                }),
              },
            };
          }),
        };

      case 'events':
        return {
          functionName: name,
          identifier,
          eventType: eventType ?? null,
          outputData: outParams?.map((e) => {
            return {
              ...handleFormatTsl({ functionType, ...e }),
              accessMode: e.accessMode ?? null,
              datatype: {
                type: e.datatype,
                specs: e.innerJson?.map((v) => {
                  return {
                    ...handleFormatTsl({ functionType, ...v }),
                    accessMode: v.accessMode ?? null,
                  };
                }),
              },
            };
          }),
        };
      default:
        return obj;
    }
  };
  onMounted(() => {});
</script>

<style lang="less" scoped>
@primary: #1890ff;
@title: #262626;
@secondary: #8c8c8c;
@border: #e8e8e8;

.phsyical-modal {
  background-color: #ffffff;
  padding: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;

  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-shrink: 0;
    margin-bottom: 16px;
    min-height: 32px;

    .type-radio-group {
      flex-shrink: 0;

      :deep(.ant-radio-button-wrapper) {
        height: 32px;
        line-height: 30px;
        padding: 0 16px;
        font-size: 14px;
      }
    }
  }

  .toolbar-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    flex-wrap: wrap;
    min-width: 0;

    .draft-hint {
      font-size: 13px;
      color: #fa8c16;
      white-space: nowrap;
      margin-right: 4px;
    }
  }

  .table-view {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    min-height: 0;

    :deep(.vben-basic-table-form-container) {
      padding: 0;
      background: transparent;
      margin-bottom: 12px;
    }

    :deep(.ant-table) {
      font-size: 13px;

      .ant-table-thead > tr > th {
        font-size: 13px;
        font-weight: 600;
        color: #333;
        padding: 12px 16px;
        background: #fafafa;
      }

      .ant-table-tbody > tr > td {
        font-size: 13px;
        padding: 12px 16px;
        color: #666;
      }

      .ant-table-tbody > tr:hover > td {
        background: #f5f7fa;
      }
    }
  }

  .card-view {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    overflow: hidden;

    .card-search-form {
      margin-bottom: 8px;
      flex-shrink: 0;

      :deep(.vben-basic-table-form-container) {
        padding: 0;
        background: transparent;
      }

      :deep(.ant-table-wrapper),
      :deep(.ant-pagination) {
        display: none;
      }
    }

    .card-container {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      min-height: 0;

      &::-webkit-scrollbar {
        width: 6px;
      }

      &::-webkit-scrollbar-thumb {
        background: #d9d9d9;
        border-radius: 3px;
      }
    }

    .empty-state {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 240px;
      color: #bfbfbf;
    }

    .card-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 16px;
      padding-bottom: 4px;
    }

    .prop-card {
      height: 156px;
      display: flex;
      flex-direction: column;
      padding: 16px 18px 12px;
      border-radius: 6px;
      border: 1px solid @border;
      background: #fff;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
      transition: box-shadow 0.2s ease, border-color 0.2s ease;
      overflow: hidden;

      &:hover {
        border-color: #91caff;
        box-shadow: 0 2px 8px rgba(24, 144, 255, 0.12);
      }

      .card-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 10px;
        margin-bottom: 8px;

        .title-wrap {
          flex: 1;
          min-width: 0;
        }

        .title {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          line-height: 22px;

          .name {
            font-size: 14px;
            font-weight: 500;
            color: @title;
          }

          .code {
            margin-left: 4px;
            font-size: 13px;
            font-weight: 400;
            color: @secondary;
          }
        }

        .scope-tag {
          flex-shrink: 0;
        }

        :deep(.ant-tag) {
          margin: 0;
          flex-shrink: 0;
        }
      }

      .card-body {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 0;
        padding: 4px 0 8px;
        text-align: center;

        .primary-line {
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 18px;
          font-weight: 500;
          color: @primary;
          line-height: 1.3;
          font-variant-numeric: tabular-nums;
        }

        .secondary-line {
          margin-top: 6px;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 12px;
          color: @secondary;
          line-height: 18px;
        }
      }

      .card-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding-top: 10px;
        border-top: 1px solid #f0f0f0;
        min-width: 0;

        .meta-hint {
          min-width: 0;
          font-size: 12px;
          color: @secondary;
          line-height: 20px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .footer-actions {
          flex-shrink: 0;
        }
      }
    }

    .card-pagination {
      display: flex;
      justify-content: flex-end;
      padding: 12px 0 0;
      flex-shrink: 0;

      :deep(.ant-pagination) {
        font-size: 13px;
      }
    }
  }
}
</style>
