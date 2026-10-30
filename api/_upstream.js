// Shared by the live endpoints (the underscore keeps Vercel from routing this file).
export const USER_AGENT = 'CerebroHelsinki/0.3 (server-side live-data proxy; EAFIT data governance workshop)'
export const isoNow = () => new Date().toISOString()

export function failureReason(error) {
  if (error?.name === 'TimeoutError' || error?.name === 'AbortError' || error?.cause?.code === 'UND_ERR_CONNECT_TIMEOUT') return 'upstream_timeout'
  const causes = { ENOTFOUND: 'upstream_dns_error', EAI_AGAIN: 'upstream_dns_temporary_failure', ECONNREFUSED: 'upstream_connection_refused', ECONNRESET: 'upstream_connection_reset' }
  if (causes[error?.cause?.code]) return causes[error.cause.code]
  if (error?.name === 'TypeError') return 'upstream_fetch_failed'
  return error?.reason || 'upstream_request_failed'
}

// A failed source is reported, never replaced by a number: the front shows «errata», not a stale value.
export function unavailable(response, source, { reason, httpStatus = 0, retrievedAt = isoNow() }) {
  response.setHeader('Cache-Control', 'public, s-maxage=5, stale-while-revalidate=10')
  const status = reason === 'method_not_allowed' ? 405 : reason.startsWith('upstream_http_') ? 502 : 503
  return response.status(status).json({ status: 'unavailable', reason, http_status: httpStatus, retrieved_at: retrievedAt, source })
}

export async function getFromUpstream(url, { headers = {}, timeoutMs = 8000, maxBytes = 5_000_000, as = 'json' } = {}) {
  const upstream = await fetch(url, { headers: { 'user-agent': USER_AGENT, ...headers }, signal: AbortSignal.timeout(timeoutMs) })
  if (!upstream.ok) throw Object.assign(new Error(`HTTP ${upstream.status}`), { reason: `upstream_http_${upstream.status}`, httpStatus: upstream.status })
  const text = await upstream.text()
  if (text.length > maxBytes) throw Object.assign(new Error('response too large'), { reason: 'feed_exceeds_size_limit' })
  try { return as === 'json' ? JSON.parse(text) : text } catch { throw Object.assign(new Error('undecodable body'), { reason: 'upstream_undecodable' }) }
}

export function methodGuard(request, response, source) {
  if (request.method === 'GET') return false
  response.setHeader('Allow', 'GET')
  unavailable(response, source, { reason: 'method_not_allowed', httpStatus: 405 })
  return true
}
