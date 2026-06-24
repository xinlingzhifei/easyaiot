/**
 * 商品 SPU 状态枚举
 */
export const ProductSpuStatusEnum = {
  RECYCLE: -1, // 回收站
  DISABLE: 0, // 仓库中（下架）
  ENABLE: 1, // 出售中（上架）
}

/**
 * 交易订单状态枚举
 */
export const TradeOrderStatusEnum = {
  UNPAID: 0, // 待付款
  UNDELIVERED: 10, // 待发货
  DELIVERED: 20, // 待收货
  COMPLETED: 30, // 已完成
  CANCELED: 40, // 已取消
}

/**
 * 配送方式枚举
 */
export const DeliveryTypeEnum = {
  EXPRESS: 1, // 快递发货
  PICK_UP: 2, // 到店自提
}

/**
 * 交易售后状态枚举
 */
export const TradeAfterSaleStatusEnum = {
  APPLY: 10, // 申请中
  WAIT_BUYER_RETURN: 20, // 商品待退货
  WAIT_RETURN: 30, // 待买家退货 / 卖家待收货
  WAIT_REFUND: 40, // 待退款
  COMPLETE: 50, // 已完成
  BUYER_CANCEL: 61, // 买家取消
  SELLER_DISAGREE: 62, // 商家拒绝
  SELLER_REFUSE_RECEIVE: 63, // 商家拒收货
}

/**
 * 佣金提现状态枚举
 */
export const BrokerageWithdrawStatusEnum = {
  AUDITING: 0, // 审核中
  AUDIT_SUCCESS: 10, // 审核通过
  WITHDRAW_SUCCESS: 11, // 提现成功
  AUDIT_FAIL: 20, // 审核不通过
  WITHDRAW_FAIL: 21, // 提现失败
}

/**
 * 快递运费模板计费方式枚举
 */
export const DeliveryExpressChargeModeEnum = {
  COUNT: 1, // 按件
  WEIGHT: 2, // 按重量
  VOLUME: 3, // 按体积
}

/**
 * 营销优惠类型枚举
 */
export const PromotionDiscountTypeEnum = {
  PRICE: 1, // 满减（具体金额）
  PERCENT: 2, // 折扣（百分比）
}
