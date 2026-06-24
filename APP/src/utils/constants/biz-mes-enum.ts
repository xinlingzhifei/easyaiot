/** MES 点检保养方案状态 */
export const MesDvCheckPlanStatusEnum = {
  PREPARE: 0,
  ENABLED: 1,
} as const

/** MES 点检保养项目类型 */
export const MesDvSubjectTypeEnum = {
  CHECK: 1,
  MAINTENANCE: 2,
} as const

/** MES 设备点检记录状态 */
export const MesDvCheckRecordStatusEnum = {
  DRAFT: 10,
  FINISHED: 20,
} as const

/** MES 设备保养记录状态 */
export const MesDvMaintenRecordStatusEnum = {
  PREPARE: 0,
  SUBMITTED: 4,
} as const

/** MES 设备保养明细结果 */
export const MesDvMaintenStatusEnum = {
  NORMAL: 1,
  ABNORMAL: 2,
} as const

/** MES 设备点检结果 */
export const MesDvCheckResultEnum = {
  NORMAL: 1,
  ABNORMAL: 2,
} as const

/** MES 维修工单状态 */
export const MesDvRepairStatusEnum = {
  PREPARE: 0,
  CONFIRMED: 1,
  APPROVING: 2,
  FINISHED: 4,
} as const

/** MES 维修结果 */
export const MesDvRepairResultEnum = {
  PASS: 1,
  FAIL: 2,
} as const

/** MES 工单类型 */
export const MesProWorkOrderTypeEnum = {
  SELF: 1,
  OUTSOURCE: 2,
  PURCHASE: 3,
} as const

/** MES 安灯级别 */
export const MesProAndonLevelEnum = {
  LEVEL1: 1,
  LEVEL2: 2,
  LEVEL3: 3,
} as const

/** MES 到货通知单状态 */
export const MesWmArrivalNoticeStatusEnum = {
  PREPARE: 0,
  PENDING_QC: 2,
  PENDING_RECEIPT: 3,
  FINISHED: 4,
} as const

/** MES 采购入库单状态 */
export const MesWmItemReceiptStatusEnum = {
  PREPARE: 0,
  APPROVING: 2,
  APPROVED: 3,
  FINISHED: 4,
  CANCELED: 5,
} as const

/** MES 产品入库单状态 */
export const MesWmProductReceiptStatusEnum = {
  PREPARE: 0,
  APPROVING: 2,
  APPROVED: 3,
  FINISHED: 4,
  CANCELED: 5,
} as const

/** MES 生产领料出库单状态 */
export const MesWmProductIssueStatusEnum = {
  PREPARE: 0,
  APPROVING: 2,
  APPROVED: 3,
  FINISHED: 4,
  CANCELED: 5,
} as const

/** MES 外协发料单状态 */
export const MesWmOutsourceIssueStatusEnum = {
  PREPARE: 0,
  APPROVING: 2,
  APPROVED: 3,
  FINISHED: 4,
  CANCELED: 5,
} as const

/** MES 外协入库单状态 */
export const MesWmOutsourceReceiptStatusEnum = {
  PREPARE: 0,
  CONFIRMED: 1,
  APPROVING: 2,
  APPROVED: 3,
  FINISHED: 4,
  CANCELED: 5,
} as const

/** MES 生产退料单状态 */
export const MesWmReturnIssueStatusEnum = {
  PREPARE: 0,
  CONFIRMED: 1,
  APPROVING: 2,
  APPROVED: 3,
  FINISHED: 4,
  CANCELED: 5,
} as const

/** MES 供应商退货单状态 */
export const MesWmReturnVendorStatusEnum = {
  PREPARE: 0,
  APPROVING: 2,
  APPROVED: 3,
  FINISHED: 4,
  CANCELED: 5,
} as const

/** MES 发货通知单状态 */
export const MesWmSalesNoticeStatusEnum = {
  PREPARE: 0,
  APPROVED: 3,
} as const

/** MES 销售出库单状态 */
export const MesWmProductSalesStatusEnum = {
  PREPARE: 0,
  CONFIRMED: 1,
  APPROVING: 2,
  SHIPPING: 10,
  APPROVED: 3,
  FINISHED: 4,
  CANCELED: 5,
} as const

/** MES 销售退货单状态 */
export const MesWmReturnSalesStatusEnum = {
  PREPARE: 0,
  CONFIRMED: 1,
  APPROVING: 2,
  APPROVED: 3,
  FINISHED: 4,
  CANCELED: 5,
} as const

/** MES 杂项出库单状态 */
export const MesWmMiscIssueStatusEnum = {
  PREPARE: 0,
  APPROVED: 3,
  FINISHED: 4,
  CANCELED: 5,
} as const

/** MES 杂项入库单状态 */
export const MesWmMiscReceiptStatusEnum = {
  PREPARE: 0,
  APPROVED: 3,
  FINISHED: 4,
  CANCELED: 5,
} as const

/** MES 转移单状态 */
export const MesWmTransferStatusEnum = {
  PREPARE: 0,
  UNCONFIRMED: 1,
  APPROVING: 2,
  APPROVED: 3,
  FINISHED: 4,
  CANCELED: 5,
} as const

/** MES 装箱单状态 */
export const MesWmPackageStatusEnum = {
  PREPARE: 0,
  FINISHED: 4,
} as const

/** MES 盘点类型 */
export const MesWmStockTakingTypeEnum = {
  STATIC: 1,
  DYNAMIC: 2,
} as const

/** MES 盘点方案参数类型 */
export const MesWmStockTakingParamTypeEnum = {
  WAREHOUSE: 102,
  LOCATION: 103,
  AREA: 104,
  ITEM: 600,
  BATCH: 107,
  QUALITY_STATUS: 900,
} as const

/** MES 条码业务类型 */
export const BarcodeBizTypeEnum = {
  WAREHOUSE: 102,
  LOCATION: 103,
  AREA: 104,
  PACKAGE: 105,
  STOCK: 106,
  BATCH: 107,
  SN: 109,
  PROCARD: 300,
  WORKORDER: 301,
  TRANSORDER: 302,
  TASK: 303,
  MACHINERY: 400,
  TOOL: 500,
  ITEM: 600,
  VENDOR: 601,
  WORKSTATION: 602,
  WORKSHOP: 603,
  USER: 604,
  CLIENT: 605,
} as const

/** MES 自动编码规则 */
export const MesAutoCodePartTypeEnum = {
  INPUT_CHAR: 1,
  DATE: 2,
  FIXED_CHAR: 3,
  SERIAL_NUMBER: 4,
} as const

/** MES 自动编码循环方式 */
export const MesAutoCodeCycleMethodEnum = {
  YEAR: 1,
  MONTH: 2,
  DAY: 3,
  HOUR: 4,
  MINUTE: 5,
  INPUT_CHAR: 10,
} as const

/** MES 自动编码规则 */
export const MesAutoCodeRuleCode = {
  DV_CHECK_PLAN_CODE: 'DV_CHECK_PLAN_CODE',
  DV_SUBJECT_CODE: 'DV_SUBJECT_CODE',
  DV_REPAIR_CODE: 'DV_REPAIR_CODE',
  WM_ARRIVAL_NOTICE_CODE: 'WM_ARRIVAL_NOTICE_CODE',
  WM_ITEM_RECEIPT_CODE: 'WM_ITEM_RECEIPT_CODE',
  PRODUCTRECPT_CODE: 'PRODUCTRECPT_CODE',
  WM_PRODUCT_ISSUE_CODE: 'WM_PRODUCT_ISSUE_CODE',
  WM_OUTSOURCE_ISSUE_CODE: 'WM_OUTSOURCE_ISSUE_CODE',
  WM_OUTSOURCE_RECEIPT_CODE: 'WM_OUTSOURCE_RECEIPT_CODE',
  WM_RETURN_ISSUE_CODE: 'WM_RETURN_ISSUE_CODE',
  WM_RETURN_VENDOR_CODE: 'WM_RETURN_VENDOR_CODE',
  WM_SALES_NOTICE_CODE: 'WM_SALES_NOTICE_CODE',
  WM_PRODUCT_SALES_CODE: 'WM_PRODUCT_SALES_CODE',
  WM_RETURN_SALES_CODE: 'WM_RETURN_SALES_CODE',
  WM_MISC_ISSUE_CODE: 'WM_MISC_ISSUE_CODE',
  WM_MISC_RECEIPT_CODE: 'WM_MISC_RECEIPT_CODE',
  WM_PACKAGE_CODE: 'WM_PACKAGE_CODE',
  WM_STOCK_TAKING_PLAN_CODE: 'WM_STOCK_TAKING_PLAN_CODE',
  WM_STOCK_TAKING_CODE: 'WM_STOCK_TAKING_CODE',
  TRANSFER_CODE: 'TRANSFER_CODE',
} as const

/** MES 盘点任务状态 */
export const MesWmStockTakingTaskStatusEnum = {
  PREPARE: 0,
  APPROVING: 2,
  FINISHED: 4,
  CANCELED: 5,
} as const

/** MES 盘点任务行状态 */
export const MesWmStockTakingTaskLineStatusEnum = {
  UNCOUNTED: 0,
  NORMAL: 1,
  GAIN: 2,
  LOSS: 3,
} as const
