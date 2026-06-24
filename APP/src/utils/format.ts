/** 格式化金额：空值（null/undefined/''）显示「-」，否则保留两位小数，非数字也回退「-」 */
export function formatMoney(value: any): string {
  if (value === null || value === undefined || value === '') {
    return '-'
  }
  const amount = Number(value)
  return Number.isNaN(amount) ? '-' : amount.toFixed(2)
}

/** 分转元（数值；空值/非数字回退 0） */
export function fenToYuan(value: any) {
  if (value === undefined || value === null || value === '') {
    return 0
  }
  const amount = Number(value)
  return Number.isNaN(amount) ? 0 : amount / 100
}

/** 元转分（整数；空值/非数字回退 0） */
export function yuanToFen(value: any) {
  if (value === undefined || value === null || value === '') {
    return 0
  }
  const amount = Number(value)
  return Number.isNaN(amount) ? 0 : Math.round(amount * 100)
}

/** 格式化金额展示（分 → ￥x.xx）；空值显示「-」，非数字回退原值 */
export function formatDisplayMoney(value: any) {
  if (value === undefined || value === null || value === '') {
    return '-'
  }
  const amount = Number(value)
  if (Number.isNaN(amount)) {
    return String(value)
  }
  return `￥${(amount / 100).toFixed(2)}`
}
