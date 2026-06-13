export type LivePlayerEngine = 'jessibuca' | 'easywasm';
export type NormalizedVideoCodec =
  | 'h265'
  | 'h264'
  | 'mpeg4'
  | 'mjpeg'
  | 'unknown';

export interface WvpPlaySource {
  url: string;
  videoCodec: NormalizedVideoCodec;
  playerEngine: LivePlayerEngine;
}

const WASM_VIDEO_CODECS = new Set<NormalizedVideoCodec>(['h265', 'h264', 'mpeg4', 'mjpeg']);

export function normalizeVideoCodec(codec?: string | null): NormalizedVideoCodec {
  const normalized = String(codec ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

  if (!normalized) return 'unknown';
  if (normalized === 'h265' || normalized === 'hevc' || normalized === 'hvc1') return 'h265';
  if (normalized === 'h264' || normalized === 'avc' || normalized === 'avc1') return 'h264';
  if (normalized === 'mpeg4' || normalized === 'mp4v') return 'mpeg4';
  if (normalized === 'mjpeg' || normalized === 'jpeg' || normalized === 'jpg') return 'mjpeg';
  return 'unknown';
}

export function detectVideoCodecFromUrl(url?: string | null): NormalizedVideoCodec {
  const raw = url?.trim();
  if (!raw) return 'unknown';
  try {
    const parsed = new URL(raw);
    return normalizeVideoCodec(
      parsed.searchParams.get('videoCodec') ??
        parsed.searchParams.get('codec') ??
        parsed.searchParams.get('vcodec'),
    );
  } catch {
    return 'unknown';
  }
}

export function getStreamVideoCodec(streamContent?: Record<string, any> | null): NormalizedVideoCodec {
  if (!streamContent) return 'unknown';

  const directCodec = normalizeVideoCodec(
    streamContent.videoCodec ??
      streamContent.video_codec ??
      streamContent.mediaInfo?.videoCodec ??
      streamContent.mediaInfo?.video_codec,
  );
  if (directCodec !== 'unknown') return directCodec;

  const tracks = streamContent.tracks ?? streamContent.mediaInfo?.tracks;
  if (Array.isArray(tracks)) {
    const videoTrack = tracks.find((track) => Number(track?.codec_type) === 0);
    return normalizeVideoCodec(videoTrack?.codec_id_name ?? videoTrack?.codecName);
  }

  return 'unknown';
}

export function pickLivePlayerEngine(options: {
  videoCodec?: string | null;
  url?: string | null;
}): LivePlayerEngine {
  const codec = normalizeVideoCodec(options.videoCodec);
  const urlCodec = codec === 'unknown' ? detectVideoCodecFromUrl(options.url) : codec;
  return WASM_VIDEO_CODECS.has(urlCodec) ? 'easywasm' : 'jessibuca';
}

export function shouldUseWasmLivePlayer(options: {
  playerEngine?: string | null;
  videoCodec?: string | null;
  url?: string | null;
}): boolean {
  if (options.playerEngine === 'easywasm') return true;
  if (options.playerEngine === 'jessibuca') return false;
  return pickLivePlayerEngine(options) === 'easywasm';
}

export function pickWvpPlaySource(
  streamContent: Record<string, any> | null | undefined,
  options?: {
    isHttps?: boolean;
    toBrowserPlayUrl?: (url?: string | null) => string | null;
  },
): WvpPlaySource | null {
  if (!streamContent) return null;
  const isHttps =
    options?.isHttps ??
    (typeof window !== 'undefined' && window.location.protocol === 'https:');
  const toPlayableUrl =
    options?.toBrowserPlayUrl ??
    ((url?: string | null) => {
      const trimmed = url?.trim();
      return trimmed || null;
    });
  const candidates = isHttps
    ? [
        streamContent.wss_flv,
        streamContent.https_flv,
        streamContent.wss_fmp4,
        streamContent.https_fmp4,
        streamContent.ws_flv,
        streamContent.flv,
        streamContent.fmp4,
      ]
    : [
        streamContent.ws_flv,
        streamContent.flv,
        streamContent.ws_fmp4,
        streamContent.fmp4,
        streamContent.https_flv,
        streamContent.wss_flv,
      ];

  for (const raw of candidates) {
    const url = toPlayableUrl(raw);
    if (url) {
      const videoCodec = getStreamVideoCodec(streamContent);
      return {
        url,
        videoCodec,
        playerEngine: pickLivePlayerEngine({ videoCodec, url }),
      };
    }
  }

  const rtmpUrl = toPlayableUrl(streamContent.rtmp);
  if (!rtmpUrl) return null;
  const videoCodec = getStreamVideoCodec(streamContent);
  return {
    url: rtmpUrl,
    videoCodec,
    playerEngine: pickLivePlayerEngine({ videoCodec, url: rtmpUrl }),
  };
}
