import { signStreamTicket, type StreamTicketResp } from '@/api/video/camera'

/**
 * 受保护流地址的 secure_link 签名工具（对齐 WEB streamTicket.ts）。
 * 后端为 /ai /live /rtp 签发短期票据，nginx 用 secure_link 校验。
 */

const PROTECTED_PATH_RE = /^\/(ai|live|rtp)\//i
const DEFAULT_TTL = 90
const TICKET_CACHE_TTL_MS = 45_000

interface CacheEntry {
  ticket: StreamTicketResp
  mintedAt: number
  inflight?: Promise<StreamTicketResp>
}

const cache = new Map<string, CacheEntry>()

function parseUrl(url: string): URL | null {
  if (!url)
    return null
  try {
    return new URL(url, typeof window !== 'undefined' ? window.location.href : undefined)
  }
  catch {
    return null
  }
}

/** 该地址是否为需要签名的受保护流地址 */
export function isProtectedStreamUrl(url: string): boolean {
  const u = parseUrl(url)
  return !!u && PROTECTED_PATH_RE.test(u.pathname)
}

async function getTicket(path: string, forceRefresh: boolean): Promise<StreamTicketResp> {
  const cached = cache.get(path)
  if (
    !forceRefresh
    && cached
    && !cached.inflight
    && Date.now() - cached.mintedAt < TICKET_CACHE_TTL_MS
  ) {
    return cached.ticket
  }
  if (!forceRefresh && cached?.inflight)
    return cached.inflight

  const inflight = signStreamTicket(path, DEFAULT_TTL)
    .then((resp) => {
      const ticket: StreamTicketResp = { e: Number(resp.e), st: String(resp.st) }
      cache.set(path, { ticket, mintedAt: Date.now() })
      return ticket
    })
    .catch((err) => {
      cache.delete(path)
      throw err
    })

  cache.set(path, {
    ticket: cached?.ticket ?? { e: 0, st: '' },
    mintedAt: cached?.mintedAt ?? 0,
    inflight,
  })
  return inflight
}

/** 让某地址对应路径的票据失效，下次 signStreamUrl 会强制重新签发 */
export function clearTicketForUrl(url: string): void {
  const u = parseUrl(url)
  if (u)
    cache.delete(u.pathname)
}

/** 给受保护流地址追加 secure_link 票据参数 */
export async function signStreamUrl(
  url: string,
  opts?: { forceRefresh?: boolean },
): Promise<string> {
  const u = parseUrl(url)
  if (!u || !PROTECTED_PATH_RE.test(u.pathname))
    return url

  const ticket = await getTicket(u.pathname, !!opts?.forceRefresh)
  u.searchParams.delete('e')
  u.searchParams.delete('st')
  u.searchParams.set('e', String(ticket.e))
  u.searchParams.set('st', ticket.st)
  return u.toString()
}
