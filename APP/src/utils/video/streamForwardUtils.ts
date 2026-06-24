export function getOutputQualityText(quality?: string): string {
  if (quality === 'low')
    return '低'
  if (quality === 'medium')
    return '中'
  if (quality === 'high')
    return '高'
  return quality || '-'
}

export function getOutputFormatText(format?: string): string {
  return format?.toUpperCase() || 'RTMP'
}

export function formatDeviceNames(names?: string[]): string {
  if (!names?.length)
    return '-'
  if (names.length <= 2)
    return names.join('、')
  return `${names.slice(0, 2).join('、')} 等 ${names.length} 个`
}
