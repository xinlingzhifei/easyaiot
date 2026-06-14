export type LivePlayerEngine = 'jessibuca' | 'easywasm' | 'native';
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
const NATIVE_HEVC_CODECS = [
  'video/mp4; codecs="hev1.1.6.L123.B0"',
  'video/mp4; codecs="hvc1.1.6.L123.B0"',
  'video/mp4; codecs="hev1"',
  'video/mp4; codecs="hvc1"',
];

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

export function isFmp4StreamUrl(url?: string | null): boolean {
  const raw = url?.trim();
  if (!raw) return false;
  try {
    return new URL(raw).pathname.toLowerCase().endsWith('.mp4');
  } catch {
    return /\.mp4(?:\?|#|$)/i.test(raw);
  }
}

export function canPlayNativeHevc(): boolean {
  if (typeof document === 'undefined') return false;
  const video = document.createElement('video');
  return NATIVE_HEVC_CODECS.some((codec) => video.canPlayType(codec) !== '');
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
  if (urlCodec === 'h265' && isFmp4StreamUrl(options.url) && canPlayNativeHevc()) return 'native';
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
  const videoCodec = getStreamVideoCodec(streamContent);
  const preferNativeFmp4 = videoCodec === 'h265' && canPlayNativeHevc();
  const candidates = isHttps
    ? preferNativeFmp4
      ? [
          streamContent.https_fmp4,
          streamContent.https_flv,
          streamContent.wss_fmp4,
          streamContent.wss_flv,
          streamContent.fmp4,
          streamContent.flv,
          streamContent.ws_flv,
        ]
      : [
          streamContent.https_flv,
          streamContent.https_fmp4,
          streamContent.wss_flv,
          streamContent.wss_fmp4,
          streamContent.flv,
          streamContent.ws_flv,
          streamContent.fmp4,
        ]
    : preferNativeFmp4
      ? [
          streamContent.fmp4,
          streamContent.ws_fmp4,
          streamContent.flv,
          streamContent.ws_flv,
          streamContent.https_fmp4,
          streamContent.https_flv,
          streamContent.wss_flv,
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
      return {
        url,
        videoCodec,
        playerEngine: pickLivePlayerEngine({ videoCodec, url }),
      };
    }
  }

  const rtmpUrl = toPlayableUrl(streamContent.rtmp);
  if (!rtmpUrl) return null;
  return {
    url: rtmpUrl,
    videoCodec,
    playerEngine: pickLivePlayerEngine({ videoCodec, url: rtmpUrl }),
  };
}
