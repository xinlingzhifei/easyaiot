export interface ModelDownloadRecord {
  id: number | string;
  model_path?: string | null;
  onnx_model_path?: string | null;
}

function getDefaultApiBase() {
  return import.meta.env?.VITE_GLOB_API_URL || '';
}

export function buildModelDownloadUrl(record: ModelDownloadRecord, apiBase = getDefaultApiBase()) {
  const base = apiBase.replace(/\/+$/, '');

  return `${base}/model/${encodeURIComponent(String(record.id))}/download`;
}
