import type { IncomingHttpHeaders } from 'node:http'

// Local HTTP is allowed only for an exact same-origin loopback authority.
// Never trust X-Forwarded-* headers to establish a local or public origin.
export function loopbackHttpOrigin(headers: IncomingHttpHeaders): boolean {
  const rawOrigin = headers.origin
  const rawHost = headers.host
  if (typeof rawOrigin !== 'string' || typeof rawHost !== 'string' ||
      rawHost.includes(',') || /[\s/@\\?#]/.test(rawHost)) return false
  try {
    const origin = new URL(rawOrigin)
    if (origin.origin !== rawOrigin || origin.protocol !== 'http:' ||
        origin.username || origin.password ||
        (origin.hostname !== '127.0.0.1' && origin.hostname !== 'localhost')) return false
    const host = new URL('http://' + rawHost)
    return host.host === origin.host && host.pathname === '/' &&
      host.username === '' && host.password === ''
  } catch {
    return false
  }
}

// GET /api/me normally has no Origin header; Host alone selects the
// cookie's transport flag. The server itself listens on loopback only.
export function loopbackHttpHost(headers: IncomingHttpHeaders): boolean {
  const rawHost = headers.host
  if (typeof rawHost !== 'string' || rawHost.includes(',') ||
      /[\s/@\\?#]/.test(rawHost)) return false
  try {
    const host = new URL('http://' + rawHost)
    return (host.hostname === '127.0.0.1' || host.hostname === 'localhost') &&
      host.pathname === '/' && !host.username && !host.password
  } catch {
    return false
  }
}

// Dynamic public HTTPS same-origin validation; local HTTP is a narrow
// exception for browsers connected directly to 127.0.0.1 / localhost.
export function requestOriginAllowed(
  headers: IncomingHttpHeaders,
  secure: boolean,
  fixedOrigin?: string,
): boolean {
  const rawOrigin = headers.origin
  const rawHost = headers.host
  if (!rawOrigin || typeof rawOrigin !== 'string' || rawOrigin === 'null') return false
  try {
    const parsed = new URL(rawOrigin)
    if (parsed.origin !== rawOrigin || parsed.username || parsed.password ||
        (parsed.protocol !== 'https:' && parsed.protocol !== 'http:')) return false
    if (loopbackHttpOrigin(headers)) return true
    if (secure && parsed.protocol !== 'https:') return false
    if (fixedOrigin) return parsed.origin === fixedOrigin
    if (!rawHost || typeof rawHost !== 'string' || rawHost.includes(',') ||
        /[\s/@\\?#]/.test(rawHost)) return false
    const host = new URL(parsed.protocol + '//' + rawHost)
    return host.host === parsed.host && host.pathname === '/' &&
      host.username === '' && host.password === ''
  } catch {
    return false
  }
}
