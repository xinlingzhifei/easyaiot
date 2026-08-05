/**
 * 设备接入分类规范
 *
 * 大类：按平台接入协议划分（IP 网络 / 国标 SIP）
 * 小类：具体设备形态（IPC / NVR / GB28181 设备）
 * 厂商：仅 IP 网络接入时用于 RTSP 模板与 NVR 识别
 */

/** 设备小类（后端 device_kind 映射） */
export type DeviceKind = 'camera' | 'nvr' | 'gb28181';

/** 设备大类（接入协议） */
export type DeviceMajorCategory = 'ip_network' | 'gb28181_protocol';

/** 创建方式（第二步） */
export type CreateMethod = 'onvif' | 'segment_scan' | 'manual' | 'rtmp_push' | 'gb_access';

/** 厂商/品牌 */
export type CameraBrand = 'custom' | 'hikvision' | 'dahua' | 'uniview';

export interface DeviceMinorOption {
  value: DeviceKind;
  label: string;
  shortLabel: string;
  description: string;
  keywords: string[];
}

export interface DeviceMajorOption {
  value: DeviceMajorCategory;
  label: string;
  description: string;
  keywords: string[];
  minors: DeviceMinorOption[];
}

export interface CreateMethodOption {
  value: CreateMethod;
  label: string;
  description: string;
  deviceKinds: DeviceKind[];
}

export interface CameraBrandOption {
  value: CameraBrand;
  label: string;
}

/** IP 网络接入 — 小类 */
const IP_NETWORK_MINORS: DeviceMinorOption[] = [
  {
    value: 'camera',
    label: 'IPC 网络摄像机',
    shortLabel: 'IPC',
    description: '单路 RTSP 直连，支持 ONVIF 发现与跨网段扫描',
    keywords: ['ipc', '摄像头', '摄像机', '网络摄像机', 'rtsp', 'onvif', '直连'],
  },
  {
    value: 'nvr',
    label: 'NVR 网络录像机',
    shortLabel: 'NVR',
    description: '登记录像机并自动挂载下属摄像头通道',
    keywords: ['nvr', '录像机', '硬盘录像机', '网络录像机', '挂载'],
  },
];

/** 国标协议接入 — 小类 */
const GB28181_MINORS: DeviceMinorOption[] = [
  {
    value: 'gb28181',
    label: 'GB28181 国标设备',
    shortLabel: 'GB28181',
    description: '设备侧配置 SIP 参数后向平台主动注册',
    keywords: ['gb28181', '国标', 'sip', '28181', 'wvp'],
  },
];

export const DEVICE_MAJOR_CATEGORIES: DeviceMajorOption[] = [
  {
    value: 'ip_network',
    label: 'IP 网络接入',
    description: '通过 RTSP / ONVIF / 跨网段扫描接入摄像头或录像机',
    keywords: ['ip', 'rtsp', 'onvif', '网络', '直连', '扫描'],
    minors: IP_NETWORK_MINORS,
  },
  {
    value: 'gb28181_protocol',
    label: '国标协议接入',
    description: '设备通过 GB28181 SIP 信令注册到平台',
    keywords: ['gb28181', '国标', 'sip', '协议', '28181'],
    minors: GB28181_MINORS,
  },
];

export const CREATE_METHOD_OPTIONS: CreateMethodOption[] = [
  {
    value: 'onvif',
    label: '局域网 ONVIF 扫描',
    description: '同一局域网内 WS-Discovery 自动发现设备',
    deviceKinds: ['camera'],
  },
  {
    value: 'segment_scan',
    label: '跨网段扫描',
    description: '填写网段与 Web 凭证批量扫描注册',
    deviceKinds: ['camera', 'nvr'],
  },
  {
    value: 'manual',
    label: '手动填写',
    description: '直接填写 IP、凭证或 RTSP 地址',
    deviceKinds: ['camera', 'nvr'],
  },
  {
    value: 'rtmp_push',
    label: 'RTMP 公网推流',
    description: '生成设备专属签名推流地址，适合公网主动推流设备',
    deviceKinds: ['camera'],
  },
  {
    value: 'gb_access',
    label: '生成接入配置',
    description: '生成 SIP 参数，复制到设备侧完成注册',
    deviceKinds: ['gb28181'],
  },
];

export const CAMERA_BRAND_OPTIONS: CameraBrandOption[] = [
  { value: 'hikvision', label: '海康威视' },
  { value: 'dahua', label: '大华' },
  { value: 'uniview', label: '宇视' },
  { value: 'custom', label: '其他 / 自定义' },
];

/** 大类图标（添加设备向导） */
export const MAJOR_CATEGORY_ICONS: Record<DeviceMajorCategory, string> = {
  ip_network: 'ant-design:wifi-outlined',
  gb28181_protocol: 'ant-design:cluster-outlined',
};

/** 设备小类图标 */
export const DEVICE_KIND_ICONS: Record<DeviceKind, string> = {
  camera: 'ant-design:video-camera-outlined',
  nvr: 'ant-design:hdd-outlined',
  gb28181: 'ant-design:api-outlined',
};

/** 接入方式图标 */
export const CREATE_METHOD_ICONS: Record<CreateMethod, string> = {
  onvif: 'ant-design:radar-chart-outlined',
  segment_scan: 'ant-design:scan-outlined',
  manual: 'ant-design:edit-outlined',
  rtmp_push: 'ant-design:cloud-upload-outlined',
  gb_access: 'ant-design:key-outlined',
};

/** 快捷接入场景（一步预选类型与方式） */
export interface QuickStartScenario {
  id: string;
  title: string;
  description: string;
  icon: string;
  tag?: string;
  kind: DeviceKind;
  method: CreateMethod;
  brand?: CameraBrand;
}

export const QUICK_START_SCENARIOS: QuickStartScenario[] = [
  {
    id: 'ipc_onvif',
    title: '局域网 IPC',
    description: '同一网段 ONVIF 自动发现，适合批量接入网络摄像机',
    icon: 'ant-design:video-camera-outlined',
    tag: '推荐',
    kind: 'camera',
    method: 'onvif',
    brand: 'dahua',
  },
  {
    id: 'nvr_manual',
    title: 'NVR 录像机',
    description: '填写 Web 凭证，自动挂载下属摄像头通道',
    icon: 'ant-design:hdd-outlined',
    kind: 'nvr',
    method: 'manual',
    brand: 'hikvision',
  },
  {
    id: 'gb28181',
    title: '国标 GB28181',
    description: '生成 SIP 参数，设备侧主动注册到平台',
    icon: 'ant-design:cluster-outlined',
    kind: 'gb28181',
    method: 'gb_access',
  },
  {
    id: 'segment_scan',
    title: '跨网段扫描',
    description: '填写网段批量扫描，适合多网段或未知 IP 场景',
    icon: 'ant-design:scan-outlined',
    kind: 'camera',
    method: 'segment_scan',
    brand: 'dahua',
  },
];

/** 所有小类（扁平列表，供兼容引用） */
export const ALL_DEVICE_MINORS: DeviceMinorOption[] = [
  ...IP_NETWORK_MINORS,
  ...GB28181_MINORS,
];

/** @deprecated 兼容旧引用 */
export const VIDEO_DEVICE_MINORS = ALL_DEVICE_MINORS;

/** @deprecated 兼容旧引用 */
export const DEVICE_KIND_OPTIONS = ALL_DEVICE_MINORS.map((m) => ({
  value: m.value,
  label: m.label,
  description: m.description,
}));

export function getCreateMethodsForKind(kind: DeviceKind): CreateMethodOption[] {
  return CREATE_METHOD_OPTIONS.filter((m) => m.deviceKinds.includes(kind));
}

export function getDefaultMethodForKind(kind: DeviceKind): CreateMethod {
  const methods = getCreateMethodsForKind(kind);
  return methods[0]?.value ?? 'manual';
}

export function getMinorOption(kind: DeviceKind): DeviceMinorOption | undefined {
  return ALL_DEVICE_MINORS.find((m) => m.value === kind);
}

export function getMajorForKind(kind: DeviceKind): DeviceMajorCategory | undefined {
  for (const major of DEVICE_MAJOR_CATEGORIES) {
    if (major.minors.some((m) => m.value === kind)) return major.value;
  }
  return undefined;
}

export function getMethodOption(method: CreateMethod): CreateMethodOption | undefined {
  return CREATE_METHOD_OPTIONS.find((m) => m.value === method);
}

export function getMajorCategory(value: DeviceMajorCategory): DeviceMajorOption | undefined {
  return DEVICE_MAJOR_CATEGORIES.find((m) => m.value === value);
}

export function getDefaultMajorCategory(): DeviceMajorCategory {
  return 'ip_network';
}

/** IP 网络接入才需要选择厂商 */
export function needsVendorSelection(major: DeviceMajorCategory): boolean {
  return major === 'ip_network';
}

/** 按关键词过滤大类/小类 */
export function filterDeviceCategories(keyword: string): {
  majors: DeviceMajorOption[];
  minorMap: Record<string, DeviceMinorOption[]>;
} {
  const q = keyword.trim().toLowerCase();
  if (!q) {
    const minorMap: Record<string, DeviceMinorOption[]> = {};
    for (const major of DEVICE_MAJOR_CATEGORIES) {
      minorMap[major.value] = major.minors;
    }
    return { majors: DEVICE_MAJOR_CATEGORIES, minorMap };
  }

  const majors: DeviceMajorOption[] = [];
  const minorMap: Record<string, DeviceMinorOption[]> = {};

  for (const major of DEVICE_MAJOR_CATEGORIES) {
    const majorHit =
      major.label.toLowerCase().includes(q) ||
      major.description.toLowerCase().includes(q) ||
      major.keywords.some((k) => k.toLowerCase().includes(q));

    const matchedMinors = major.minors.filter(
      (minor) =>
        minor.label.toLowerCase().includes(q) ||
        minor.shortLabel.toLowerCase().includes(q) ||
        minor.description.toLowerCase().includes(q) ||
        minor.keywords.some((k) => k.toLowerCase().includes(q)),
    );

    if (majorHit || matchedMinors.length) {
      majors.push(major);
      minorMap[major.value] = majorHit ? major.minors : matchedMinors;
    }
  }

  return { majors, minorMap };
}

export function parseDeviceCreateQuery(query: Record<string, unknown>): {
  kind: DeviceKind;
  method: CreateMethod;
  brand: CameraBrand;
} {
  const kindRaw = String(query.kind || query.deviceKind || 'camera');
  const kind: DeviceKind = ['camera', 'nvr', 'gb28181'].includes(kindRaw)
    ? (kindRaw as DeviceKind)
    : 'camera';

  const methodRaw = String(query.method || query.createMethod || '');
  const validMethods = getCreateMethodsForKind(kind).map((m) => m.value);
  const method: CreateMethod = validMethods.includes(methodRaw as CreateMethod)
    ? (methodRaw as CreateMethod)
    : getDefaultMethodForKind(kind);

  const brandRaw = String(query.brand || query.cameraBrand || 'dahua');
  const brand: CameraBrand = ['custom', 'hikvision', 'dahua', 'uniview'].includes(brandRaw)
    ? (brandRaw as CameraBrand)
    : 'dahua';

  return { kind, method, brand };
}

/** @deprecated 兼容旧引用 */
export function getKindOption(kind: DeviceKind) {
  return getMinorOption(kind);
}
