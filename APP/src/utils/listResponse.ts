/** 兼容多种后端分页响应结构 */
export function parseListResponse<T = any>(
  res: any,
  listKeys: string[] = ['list', 'data', 'alert_list', 'items'],
): { list: T[], total: number } {
  if (Array.isArray(res)) {
    return { list: res, total: res.length }
  }
  if (!res || typeof res !== 'object') {
    return { list: [], total: 0 }
  }
  for (const key of listKeys) {
    if (Array.isArray(res[key])) {
      return { list: res[key], total: Number(res.total ?? res[key].length) || 0 }
    }
  }
  return { list: [], total: Number(res.total) || 0 }
}
