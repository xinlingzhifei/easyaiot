import {defHttp} from '@/utils/http/axios';

enum API {
  Devices = '/device',
  DevicethingModels = '/deviceThingModel',
  DevicethingmodelsHistory = '/tdengine/dataOperation/deviceInfo/history',
  DevicesBatch = '/device/batch',
  DevicesBatchDetail = '/device/batch/detail',
  DevicesLog = '/device/log',
  Shadow = '/shadow',
  DeviceExcelExportExcel = '-template/leapfive/template/import_device_template.xlsx',
  DeviceExcelImport = '/device/excel/import',
  DevicesList = '/tenant/deviceInfos',
  OperateDevices = '/customer/device/',
  PublicDevice = '/customer/public/device/',
  DeviceCustomers = '/customers',
  OperateCustomers = '/customer',
  OperateDevice = '/device/',
  DeviceCredentials = '/device/credentials',
  DeviceProfile = '/deviceProfile',
  DeviceProfileInfo = '/deviceProfileInfo/',
  QueuesList = '/queues',
  DeviceInfo = '/device/info/',
  ResourceLwm2m = '/resource/lwm2m/page',
  DeviceOtaPackages = '/otaPackages/',
}

const commonApi = (method: 'get' | 'post' | 'delete' | 'put', url, params) => {
  defHttp.setHeader({ 'X-Authorization': 'Bearer ' + localStorage.getItem('jwt_token') });

  return defHttp[method](
    {
      url,
      params,
      headers: {
        // @ts-ignore
        ignoreCancelToken: true,
      },
    },
    {
      isTransformResponse: true,
    },
  );
};

export async function isExist(params) {
  return commonApi('post', API.Devices + '/isExist', params);
}

export const getDevicesList = (params) => {
  return commonApi('get', API.Devices + '/list', params);
};

export const saveDevices = (params) => {
  return commonApi('post', API.Devices, params);
};

export const updateDeviceFile = (params) => {
  defHttp.setHeader({ 'X-Authorization': 'Bearer ' + localStorage.getItem('jwt_token') });
  return defHttp.post(
    {
      url: API.Devices + '/add/batch/upload',
      params,
      headers: {
        // @ts-ignore
        ignoreCancelToken: true,
        'content-type': 'application/x-www-form-urlencoded',
      },
    },
    { isTransformResponse: true },
  );
};

export const batchSaveDevices = (params) => {
  defHttp.setHeader({ 'X-Authorization': 'Bearer ' + localStorage.getItem('jwt_token') });
  return defHttp.post(
    {
      url: API.Devices + '/add/batch',
      params,
      headers: {
        // @ts-ignore
        ignoreCancelToken: true,
        'content-type': 'application/x-www-form-urlencoded',
      },
    },
    { isTransformResponse: true },
  );
};

export const updateDevices = (params) => {
  return commonApi('put', API.Devices, params);
};

/** 工业协议测试连接（Modbus TCP/RTU / OPC UA） */
export const testModbusConnection = (params) => {
  defHttp.setHeader({ 'X-Authorization': 'Bearer ' + localStorage.getItem('jwt_token') });
  return defHttp.post(
    {
      url: '/sink/modbus/test-connection',
      data: params,
      timeout: 8 * 1000,
      headers: {
        // @ts-ignore
        ignoreCancelToken: true,
      },
    },
    {
      isTransformResponse: true,
      errorMessageMode: 'none',
    },
  );
};

export const getDevicesInfo = (id) => {
  return commonApi('get', API.Devices + '/' + id, {});
};

export const deleteDevices = (ids) => {
  defHttp.setHeader({ 'X-Authorization': 'Bearer ' + localStorage.getItem('jwt_token') });
  return defHttp.delete(
    {
      url: `${API.Devices}/${ids}`,
    },
    { isTransformResponse: true },
  );
};

/**
 *
 * @description: 获取物模型数据列表
 */
export const getDevicethingModels = (_params) => {
  const { ...params } = _params;
  defHttp.setHeader({ 'X-Authorization': 'Bearer ' + localStorage.getItem('jwt_token') });
  // debugger;
  return defHttp.get(
    {
      url: API.DevicethingModels + '/runtimeStatus',
      params,
      headers: {
        // @ts-ignore
        ignoreCancelToken: true,
      },
    },
    { isTransformResponse: true },
  );
};

/** 调用设备服务（MQTT 下行 thing.service.invoke） */
export const invokeDeviceService = (deviceId: string | number, serviceIdentifier: string, data?: any) => {
  defHttp.setHeader({ 'X-Authorization': 'Bearer ' + localStorage.getItem('jwt_token') });
  return defHttp.post(
    {
      url: `${API.Devices}/${deviceId}/invokeService`,
      params: { serviceIdentifier },
      data: data || {},
      headers: {
        // @ts-ignore
        ignoreCancelToken: true,
      },
    },
    { isTransformResponse: true },
  );
};

/** 下发设备属性期望值（MQTT 下行 thing.property.set） */
export const setDeviceProperties = (deviceId: string | number, data: Record<string, any>) => {
  defHttp.setHeader({ 'X-Authorization': 'Bearer ' + localStorage.getItem('jwt_token') });
  return defHttp.post(
    {
      url: `${API.Devices}/${deviceId}/setProperties`,
      data: data || {},
      headers: {
        // @ts-ignore
        ignoreCancelToken: true,
      },
    },
    { isTransformResponse: true },
  );
};

export const getDevicethingmodelsHistory = (params) => {
  defHttp.setHeader({ 'X-Authorization': 'Bearer ' + localStorage.getItem('jwt_token') });
  // debugger;
  return defHttp.post(
    {
      url: API.DevicethingmodelsHistory,
      params,
      headers: {
        // @ts-ignore
        ignoreCancelToken: true,
      },
    },
   { isTransformResponse: true },
  );
};

/**
 * @description: 设备公开
 */
export const postPublicDevice = (id) => {
  defHttp.setHeader({ 'X-Authorization': 'Bearer ' + localStorage.getItem('jwt_token') });
  return defHttp.post(
    {
      url: API.PublicDevice + id,
      headers: {
        // @ts-ignore
        ignoreCancelToken: true,
      },
    },
    { isReturnNativeResponse: true },
  );
};
/**
 * @description: 设备私有、取消分配客户
 */
export const deletePrivateDevice = (id) => {
  defHttp.setHeader({ 'X-Authorization': 'Bearer ' + localStorage.getItem('jwt_token') });
  return defHttp.delete(
    {
      url: API.OperateDevices + id,
      headers: {
        // @ts-ignore
        ignoreCancelToken: true,
      },
    },
    { isReturnNativeResponse: true },
  );
};
/**
 * @description: 客户列表
 */
export const getDeviceCustomList = (params) => {
  defHttp.setHeader({ 'X-Authorization': 'Bearer ' + localStorage.getItem('jwt_token') });
  return defHttp.get(
    {
      url: API.DeviceCustomers,
      params,
      headers: {
        // @ts-ignore
        ignoreCancelToken: true,
      },
    },
    { isTransformResponse: true },
  );
};
/**
 * @description: 分配客户
 */
export const postAssignDeviceCustom = (deviceId, customId) => {
  defHttp.setHeader({ 'X-Authorization': 'Bearer ' + localStorage.getItem('jwt_token') });
  return defHttp.post(
    {
      url: API.OperateCustomers + `/${customId}/device/${deviceId}`,
      headers: {
        // @ts-ignore
        ignoreCancelToken: true,
      },
    },
    { isReturnNativeResponse: true },
  );
};
/**
 * @description: 删除设备
 */
export const deleteDevice = (id) => {
  defHttp.setHeader({ 'X-Authorization': 'Bearer ' + localStorage.getItem('jwt_token') });
  return defHttp.delete(
    {
      url: API.OperateDevice + id,
      headers: {
        // @ts-ignore
        ignoreCancelToken: true,
      },
    },
    { isReturnNativeResponse: true },
  );
};
/**
 * @description: 获取管理凭证
 */
export const getDeviceCredentials = (id) => {
  defHttp.setHeader({ 'X-Authorization': 'Bearer ' + localStorage.getItem('jwt_token') });
  return defHttp.get(
    {
      url: API.OperateDevice + id + '/credentials',
      headers: {
        // @ts-ignore
        ignoreCancelToken: true,
      },
    },
    { isTransformResponse: true },
  );
};
/**
 * @description: 设置管理凭证
 */
export const postDeviceCredentials = (params) => {
  defHttp.setHeader({ 'X-Authorization': 'Bearer ' + localStorage.getItem('jwt_token') });
  return defHttp.post(
    {
      url: API.DeviceCredentials,
      params,
      headers: {
        // @ts-ignore
        ignoreCancelToken: true,
      },
    },
    { isReturnNativeResponse: true },
  );
};
/**
 * @description: 添加新设备(选择已有设备配置)
 */
export const postDevice = (params) => {
  defHttp.setHeader({ 'X-Authorization': 'Bearer ' + localStorage.getItem('jwt_token') });
  return defHttp.post(
    {
      url: API.OperateDevice,
      params,
      headers: {
        // @ts-ignore
        ignoreCancelToken: true,
      },
    },
    { isTransformResponse: true },
  );
};
/**
 * @description: 添加新设备（新建设备配置）
 */
export const postProfile = (params) => {
  defHttp.setHeader({ 'X-Authorization': 'Bearer ' + localStorage.getItem('jwt_token') });
  return defHttp.post(
    {
      url: API.DeviceProfile,
      params,
      headers: {
        // @ts-ignore
        ignoreCancelToken: true,
      },
    },
    { isTransformResponse: true },
  );
};
/**
 * @description: 添加新设备第二个接口
 */
export const getDeviceInfo = (id: string) => {
  defHttp.setHeader({ 'X-Authorization': 'Bearer ' + localStorage.getItem('jwt_token') });
  return defHttp.get(
    {
      url: API.DeviceInfo + id,
      headers: {
        // @ts-ignore
        ignoreCancelToken: true,
      },
    },
    { isTransformResponse: true },
  );
};
/**
 * @description: TODO:不知道具体逻辑
 */
export const getDeviceProfileInfo = (id) => {
  defHttp.setHeader({ 'X-Authorization': 'Bearer ' + localStorage.getItem('jwt_token') });
  return defHttp.get(
    {
      url: API.DeviceProfileInfo + id,
      headers: {
        // @ts-ignore
        ignoreCancelToken: true,
      },
    },
    { isReturnNativeResponse: true },
  );
};
/**
 * @description: 获得Object列表
 */
export const getLwmInfosList = (params) => {
  defHttp.setHeader({ 'X-Authorization': 'Bearer ' + localStorage.getItem('jwt_token') });
  // debugger;
  return defHttp.get(
    {
      url: API.ResourceLwm2m,
      params,
      headers: {
        // @ts-ignore
        ignoreCancelToken: true,
      },
    },
    { isTransformResponse: true },
  );
};
/**
 * @description: 获得固件列表
 */
export const getDeviceOtaPackages = (id, params, type) => {
  defHttp.setHeader({ 'X-Authorization': 'Bearer ' + localStorage.getItem('jwt_token') });
  // debugger;
  return defHttp.get(
    {
      url: API.DeviceOtaPackages + id + type,
      params,
      headers: {
        // @ts-ignore
        ignoreCancelToken: true,
      },
    },
    { isTransformResponse: true },
  );
};
/**
 * @description: 获取设备连接状态统计
 */
export const getConnectStatusStatistics = () => {
  defHttp.setHeader({ 'X-Authorization': 'Bearer ' + localStorage.getItem('jwt_token') });
  // debugger;
  return defHttp.get(
    {
      url: API.Devices + '/getConnectStatusStatistics',
      headers: {
        // @ts-ignore
        ignoreCancelToken: true,
      },
    },
    { isTransformResponse: true },
  );
};
/**
 * @description: 获取设备统计
 */
export const getDeviceStatistics = () => {
  defHttp.setHeader({ 'X-Authorization': 'Bearer ' + localStorage.getItem('jwt_token') });
  // debugger;
  return defHttp.get(
    {
      url: API.Devices + '/getDeviceStatistics',
      headers: {
        // @ts-ignore
        ignoreCancelToken: true,
      },
    },
    { isTransformResponse: true },
  );
};
/**
 * @description: 获取设备激活状态统计
 */
export const getDeviceStatusStatistics = () => {
  defHttp.setHeader({ 'X-Authorization': 'Bearer ' + localStorage.getItem('jwt_token') });
  // debugger;
  return defHttp.get(
    {
      url: API.Devices + '/getDeviceStatusStatistics',
      headers: {
        // @ts-ignore
        ignoreCancelToken: true,
      },
    },
    { isTransformResponse: true },
  );
};

/** 查询网关下已绑定的子设备 */
export const getGatewaySubDevices = (params: {
  gatewayIdentification: string;
  pageNum?: number;
  pageSize?: number;
}) => {
  return commonApi('get', API.Devices + '/subDevices', params);
};

/** 查询可绑定的未关联子设备 */
export const getUnboundSubDevices = (params?: { pageNum?: number; pageSize?: number; deviceName?: string }) => {
  return commonApi('get', API.Devices + '/unboundSubDevices', params || {});
};

/** 关联网关子设备 */
export const associateGatewayDevices = (idList: Array<string | number>, targetDeviceIdentification: string) => {
  defHttp.setHeader({ 'X-Authorization': 'Bearer ' + localStorage.getItem('jwt_token') });
  return defHttp.post(
    {
      url: API.Devices + '/associateGateway',
      data: { idList, targetDeviceIdentification },
      headers: {
        // @ts-ignore
        ignoreCancelToken: true,
      },
    },
    { isTransformResponse: true },
  );
};

/** 解绑网关子设备 */
export const disassociateGatewayDevices = (idList: Array<string | number>) => {
  defHttp.setHeader({ 'X-Authorization': 'Bearer ' + localStorage.getItem('jwt_token') });
  return defHttp.post(
    {
      url: API.Devices + '/disassociateGateway',
      data: idList,
      headers: {
        // @ts-ignore
        ignoreCancelToken: true,
      },
    },
    { isTransformResponse: true },
  );
};

export interface DeviceCameraLink {
  id: number;
  iotDeviceId: number;
  cameraDeviceId: string;
  createTime?: string;
  updateTime?: string;
}

/** 查询 IoT 设备已关联的流媒体摄像头 */
export const getDeviceCameraLinks = (params: {
  iotDeviceId: string | number;
  pageNum?: number;
  pageSize?: number;
}) => {
  return commonApi('get', API.Devices + '/cameraLinks', params);
};

/** 查询已被绑定的流媒体摄像头 ID */
export const getBoundCameraIds = () => {
  return commonApi('get', API.Devices + '/boundCameraIds');
};

/** 关联流媒体摄像头 */
export const associateDeviceCameras = (
  iotDeviceId: string | number,
  cameraDeviceIds: string[],
) => {
  defHttp.setHeader({ 'X-Authorization': 'Bearer ' + localStorage.getItem('jwt_token') });
  return defHttp.post(
    {
      url: API.Devices + '/associateCameras',
      data: { iotDeviceId, cameraDeviceIds },
      headers: {
        // @ts-ignore
        ignoreCancelToken: true,
      },
    },
    { isTransformResponse: true },
  );
};

/** 解绑流媒体摄像头 */
export const disassociateDeviceCameras = (linkIds: Array<string | number>) => {
  defHttp.setHeader({ 'X-Authorization': 'Bearer ' + localStorage.getItem('jwt_token') });
  return defHttp.post(
    {
      url: API.Devices + '/disassociateCameras',
      data: linkIds,
      headers: {
        // @ts-ignore
        ignoreCancelToken: true,
      },
    },
    { isTransformResponse: true },
  );
};
