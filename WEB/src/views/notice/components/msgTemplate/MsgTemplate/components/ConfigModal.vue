<!-- eslint-disable vue/v-on-event-hyphenation -->
<template>
  <BasicModal
    @register="registerModal"
    @cancel="handleCancel"
    @ok="handleOk"
    width="1100px"
    :canFullscreen="false"
  >
    <div class="config-modal-box">
      <BasicForm
        @register="registerForm"
        :showAdvancedButton="false"
        :showActionButtonGroup="false"
      >
        <template #agentId="{ model, field }">
          <FormItemRest>
            <Select
              v-model:value="model[field]"
              :options="formData.agent"
              @focus="getMessageConfigQuery"
              placeholder="请选择"
            />
          </FormItemRest>
        </template>
        <template #userGroupId="{ model, field }">
          <FormItemRest>
            <Select
              v-model:value="model[field]"
              :options="formData.userGroupList"
              @focus="getUserGroupQueryByMsgType"
              placeholder="请选择"
              allow-clear
            />
          </FormItemRest>
        </template>
        <template #templateDataList>
          <FormItemRest>
            <EditTable :columns="templateColumns" v-model:list="formData.templateDataList" />
          </FormItemRest>
        </template>
        <template #attachments>
          <FormItemRest>
            <UploadAttachment v-model:attachment="formData.attachments" />
          </FormItemRest>
        </template>
        <template #tabActive="{ model, field }">
          <FormItemRest>
            <HttpParams
              ref="httpParamsRef"
              v-model:value="model[field]"
              :requestType="getFieldsValue()?.method"
            />
          </FormItemRest>
        </template>
        <template #message="{ model, field }">
          <Textarea v-model:value="model[field]" :rows="3" />
        </template>
        <template #variableDefinitions>
          <FormItemRest>
            <VariableDefinitions v-model:variableDefinitions="formData.variableDefinitions" />
          </FormItemRest>
        </template>
      </BasicForm>
      <Describe ref="describeRef" />
    </div>
  </BasicModal>
</template>
<script lang="ts" setup>
  import { computed, ref } from 'vue';
  import { BasicModal, useModalInner } from '/@/components/Modal';
  import { BasicForm, useForm } from '/@/components/Form';
  import { useMessage } from '/@/hooks/web/useMessage';
  import {
    templateFormSchemas,
    emailSchemas,
    smsSchemas,
    weixinSchemas,
    dindinSchemas,
    httpSchemas,
    feishuSchemas,
    templateColumns,
  } from '../Data';
  import VariableDefinitions from './VariableDefinitions.vue';
  import Describe from './Describe.vue';
  import {
    messageTemplateAdd,
    messageTemplateUpdate,
    messageConfigQuery,
  } from '/@/api/modules/notice';
  import { userGroupQueryByMsgType } from '/@/api/modules/user';
  import { Select, Textarea, FormItemRest } from 'ant-design-vue';
  import UploadAttachment from './UploadAttachment.vue';
  import HttpParams from './HttpParams.vue';
  import EditTable from './EditTable.vue';

  const emits = defineEmits(['success']);
  const { createMessage } = useMessage();
  const httpParamsRef = ref(null);
  const describeRef = ref(null);
  const opertionType = ref('add');

  const DESCRIBE_TYPE_MAP: Record<string, string> = {
    sms: 'sms',
    email: 'email',
    weixin: 'weixin',
    http: 'webhook',
    ding: 'ding',
    feishu: 'feishu',
  };

  const formData = ref({
    variableDefinitions: [],
    attachments: [],
    templateDataList: [],
    userGroupList: [],
    agent: [],
  });

  const isVariable = computed(() => formData.value?.variableDefinitions?.length > 0);

  const [registerModal, { setModalProps, closeModal }] = useModalInner((data) => {
    handleNoticeType(data.pushType);
    if (data.type == 'edit') {
      editConfigModal(data?.record);
    }
    setModalProps({ title: data.type == 'add' ? '新增模板' : '编辑模板' });
    opertionType.value = data.type;
  });

  const [
    registerForm,
    {
      appendSchemaByField,
      removeSchemaByField,
      getFieldsValue,
      validate,
      setFieldsValue,
      resetFields,
    },
  ] = useForm({
    schemas: templateFormSchemas({ isVariable }),
    labelWidth: '100px',
    layout: 'vertical',
    baseColProps: { span: 24 },
  });

  function editConfigModal(record) {
    const { files, templateDataList, cookies, params, headers, ...ret } = record;
    const _msgType = +ret.msgType;
    if ([3].includes(_msgType) && files) {
      let _file = JSON.parse(files) || [];
      if (!Array.isArray(_file)) _file = [{ id: '0', ..._file }];
      formData.value.attachments = _file;
      ret.cc = ret.cc ? ret.cc?.split(',') : '';
    }
    if ([1, 2].includes(_msgType)) {
      formData.value.templateDataList = templateDataList || [];
    }
    setTimeout(() => {
      setFieldsValue({ ...ret });
      if ([5].includes(_msgType)) {
        httpParamsRef.value?.setTabList({ cookies, params, headers });
      }
      getUserGroupQueryByMsgType();
    });
  }

  function handleNoticeType(type) {
    const msgType = { sms: 1, email: 3, weixin: 4, http: 5, ding: 6, feishu: 7 };
    changeNoticeType(type);
    describeRef.value?.setNoticeType(DESCRIBE_TYPE_MAP[type] || 'email');
    setTimeout(() => {
      setFieldsValue({
        msgType: msgType[type],
        method: 'GET',
        bodyType: 'text/plain',
        tabActive: 'Params',
        radioType: type === 'ding' ? '工作通知方式' : type === 'feishu' ? '群机器人消息' : '工作通知方式',
      });
    });
    reset();
  }

  function changeNoticeType(type) {
    const config = {
      email: emailSchemas,
      sms: smsSchemas,
      weixin: weixinSchemas,
      ding: dindinSchemas,
      http: httpSchemas,
      feishu: feishuSchemas,
    };
    const fields = Object.keys(config)
      .map((c) => config[c]({}))
      .reduce((p, c) => [...p, ...c], [])
      .map((item) => item.field);
    const schemas = config[type]({ getFieldsValue, setFieldsValue });
    removeSchemaByField(fields);
    appendSchemaByField(schemas, 'userGroupId');
  }

  const reset = () => {
    formData.value.variableDefinitions = [];
    formData.value.attachments = [];
    formData.value.templateDataList = [];
    if (getFieldsValue().msgType == 5) httpParamsRef.value?.reset();
  };

  const handleCancel = () => {
    resetFields();
    reset();
  };

  const handleOk = () => {
    validate()
      .then(async () => {
        const { attachments } = formData.value;
        const configKey = {
          1: 't_Msg_Sms', 2: 't_Msg_Sms', 3: 't_Msg_Mail', 4: 't_Msg_Wx_Cp',
          5: 't_Msg_Http', 6: 't_Msg_Ding', 7: 't_Msg_Feishu',
        };
        const { id, msgType, ...t_Msg } = getFieldsValue();
        const _msgType = +msgType;
        t_Msg.msgType = _msgType;
        if (t_Msg.btnText !== undefined) {
          t_Msg.btnTxt = t_Msg.btnText;
          delete t_Msg.btnText;
        }
        if (opertionType.value == 'edit') t_Msg.id = id;
        if ([3].includes(_msgType)) {
          const cc = t_Msg.cc || [];
          t_Msg.cc = cc.length > 0 ? t_Msg.cc.join(',') : '';
          t_Msg.files = attachments.length > 0 ? JSON.stringify({ ...attachments[0] }) : '';
        }
        if ([5].includes(_msgType)) {
          const allFields = getFieldsValue();
          let bodyValue = allFields.body !== undefined ? allFields.body : t_Msg.body;
          let bodyTypeValue = allFields.bodyType !== undefined ? allFields.bodyType : (t_Msg.bodyType || 'application/json');
          if (bodyValue === undefined || bodyValue === null) bodyValue = '';
          const httpParams = httpParamsRef.value.getParams();
          Object.keys(httpParams).forEach((key) => {
            if (key !== 'body' && key !== 'bodyType') t_Msg[key] = httpParams[key];
          });
          if (t_Msg.method != 'GET') {
            t_Msg.body = bodyValue;
            t_Msg.bodyType = bodyTypeValue || 'application/json';
          } else {
            delete t_Msg.bodyType;
            delete t_Msg.body;
          }
        }
        const templateDataList = formData.value.templateDataList.map((item) => {
          item.msgType = _msgType;
          return item;
        });
        const params = {
          msgType: _msgType,
          [configKey[_msgType]]: t_Msg,
          templateDataList,
        };
        opertionType.value == 'add'
          ? await messageTemplateAdd(params)
          : await messageTemplateUpdate(params);
        createMessage.success(opertionType.value == 'add' ? '添加成功' : '编辑成功');
        closeModal();
        emits('success');
        handleCancel();
      })
      .catch(() => createMessage.error('操作失败'));
  };

  async function getUserGroupQueryByMsgType() {
    try {
      const { msgType } = getFieldsValue();
      const ret = await userGroupQueryByMsgType({ msgType: +msgType });
      formData.value.userGroupList = ret.map((item) => ({
        label: item.userGroupName,
        value: item.id,
      }));
    } catch (e) {
      console.error(e);
    }
  }

  async function getMessageConfigQuery() {
    try {
      const { msgType } = getFieldsValue();
      const ret = await messageConfigQuery({ msgType: +msgType });
      const configKey = { 4: 'wxCpApp', 6: 'dingdingApp' };
      formData.value.agent = ret.data[0]?.configurationMap[configKey[msgType]]?.map((item) => ({
        label: item.appName,
        value: item.agentId,
      })) || [];
    } catch (e) {
      console.error(e);
    }
  }
</script>
<style lang="less" scoped>
  .config-modal-box {
    display: flex;
    form, .describe-wapper { flex: 1; }
    .describe-wapper { margin-left: 20px; }
  }
</style>
