import {
  resolveAlertRecordVideoUrl,
  resolveAlertVideoUrl,
  type AlertRecordLike,
} from '@/utils/alertRecord';

export type AlertRecordModalMethods = {
  openModal: (open?: boolean, data?: any, openOnSet?: boolean) => void;
  closeModal?: () => void;
};

export type AlertRecordPlayInput = AlertRecordLike & {
  device_id?: string | number;
  time?: string;
  seek_time?: string | null;
  record_start_time?: string | null;
  playback_offset_seconds?: number | null;
  video_url?: string | null;
  url?: string | null;
};

/** 每次播放递增，避免 useModal 在快速连续 openModal 时合并/跳过回调 */
let playbackSeq = 0;

function buildModalPayload(
  deviceId: string | number,
  videoUrl: string,
  seq: number,
  pending: boolean,
  seekContext: ReturnType<typeof resolvePlaybackSeekContext>,
) {
  return {
    id: deviceId,
    http_stream: videoUrl,
    ...(seekContext.seekTime ? { seek_time: seekContext.seekTime } : {}),
    ...(seekContext.playbackOffsetSeconds != null
      ? { playback_offset_seconds: seekContext.playbackOffsetSeconds }
      : {}),
    ...(pending ? { _pendingRecord: true as const } : {}),
    _playbackSeq: seq,
  };
}

function parseTimeMs(value?: string | null): number | null {
  if (!value) {
    return null;
  }
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function resolvePlaybackSeekContext(record: AlertRecordPlayInput) {
  const seekTime = record.seek_time || record.time || '';
  const hasExplicitOffset = record.playback_offset_seconds != null;
  const explicitOffset = hasExplicitOffset ? Number(record.playback_offset_seconds) : Number.NaN;
  if (Number.isFinite(explicitOffset) && explicitOffset >= 0) {
    return {
      seekTime,
      playbackOffsetSeconds: Math.round(explicitOffset),
    };
  }

  const seekMs = parseTimeMs(seekTime);
  const startMs = parseTimeMs(record.record_start_time);
  if (seekMs == null || startMs == null || seekMs < startMs) {
    return {
      seekTime,
      playbackOffsetSeconds: null,
    };
  }

  return {
    seekTime,
    playbackOffsetSeconds: Math.round((seekMs - startMs) / 1000),
  };
}

/**
 * 在大屏/告警等场景打开告警录像：先弹出加载态，再解析地址并播放。
 * mini / standard / full 共用，兼容 MinIO 直链与按设备+时间查询。
 */
export async function playAlertRecordInModal(
  modal: AlertRecordModalMethods,
  record: AlertRecordPlayInput,
): Promise<boolean> {
  const { openModal, closeModal } = modal;
  const seq = ++playbackSeq;
  const seekContext = resolvePlaybackSeekContext(record);

  const directRaw = record.video_url || record.url;
  if (directRaw) {
    const videoUrl = resolveAlertVideoUrl(String(directRaw).trim());
    if (videoUrl) {
      openModal(true, buildModalPayload(record.device_id ?? 0, videoUrl, seq, false, seekContext));
      return true;
    }
  }

  const deviceId = record.device_id;
  if (deviceId == null || deviceId === '' || !record.time) {
    return false;
  }

  openModal(true, buildModalPayload(deviceId, '', seq, true, seekContext));

  try {
    const videoUrl = await resolveAlertRecordVideoUrl(record);
    if (videoUrl) {
      openModal(true, buildModalPayload(deviceId, videoUrl, seq, false, seekContext));
      return true;
    }
    closeModal?.();
    openModal(false);
    return false;
  } catch (error) {
    closeModal?.();
    openModal(false);
    throw error;
  }
}
