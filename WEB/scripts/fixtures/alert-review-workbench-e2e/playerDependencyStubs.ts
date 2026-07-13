export function copyText() {}
export function controlPTZ() {}
export function controlGbPtz() {}
export async function queryAlertRecord() {
  return null
}
export async function playByDeviceAndChannel() {
  return { data: { data: {} } }
}
export function getGb28181PlayIds() {
  return null
}
export function shouldPlayViaGb28181() {
  return false
}
export function pickWvpPlaySources() {
  return []
}
export function rewriteStreamHostToPageHost(url: string) {
  return url
}
export function isProtectedStreamUrl() {
  return false
}
export async function signStreamUrl(url: string) {
  return url
}
export function clearTicketForUrl() {}
export function detectVideoCodecFromUrl() {
  return 'unknown'
}
export function normalizeVideoCodec(value?: string) {
  return value || 'unknown'
}
export function shouldUseWasmLivePlayer() {
  return false
}
