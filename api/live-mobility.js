import { decodeVehiclePositions } from '../src/utils/gtfsRealtime.js'

const HSL_VEHICLE_FEED = 'https://realtime.hsl.fi/realtime/vehicle-positions/v2/hsl'
const SOURCE_NAME = 'HSL GTFS-Realtime'
const MAX_FEED_BYTES = 30_000_000
const isoNow = () => new Date().toISOString()
function upstreamFailureReason(error) {
  if (error?.name === 'TimeoutError' || error?.name === 'AbortError' || error?.cause?.code === 'UND_ERR_CONNECT_TIMEOUT') return 'upstream_timeout'
  const causes = {
    ENOTFOUND: 'upstream_dns_error', EAI_AGAIN: 'upstream_dns_temporary_failure',
    ECONNREFUSED: 'upstream_connection_refused', ECONNRESET: 'upstream_connection_reset',
  }
  if (causes[error?.cause?.code]) return causes[error.cause.code]
  if (error?.name === 'TypeError') return 'upstream_fetch_failed'
  return 'upstream_request_failed'
}

function unavailable(response, { reason, httpStatus = 0, retrievedAt, contentType = null, responseBytes = 0, responseMs = 0 }) {
  response.setHeader('Cache-Control', 'public, s-maxage=2, stale-while-revalidate=3')
  const proxyStatus = reason.startsWith('upstream_http_') || reason.startsWith('upstream_access_denied_') ? 502
    : httpStatus >= 400 && httpStatus < 500 ? httpStatus : 503
  return response.status(proxyStatus).json({
    status: 'unavailable', reason, http_status: httpStatus, content_type: contentType,
    response_bytes: responseBytes, response_ms: responseMs, retrieved_at: retrievedAt, source: SOURCE_NAME,
  })
}

export default async function handler(request, response) {
  const startedAt = performance.now()
  let retrievedAt = isoNow()
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    return unavailable(response, { reason: 'method_not_allowed', httpStatus: 405, retrievedAt })
  }
  const { bbox = '' } = request.query || {}
  let bounds = null
  if (bbox) {
    const values = String(bbox).split(',').map(Number)
    if (values.length !== 4 || values.some(value => !Number.isFinite(value)) || values[0] < -180 || values[2] > 180 || values[1] < -90 || values[3] > 90 || values[0] >= values[2] || values[1] >= values[3]) {
      return unavailable(response, { reason: 'invalid_bbox', httpStatus: 400, retrievedAt })
    }
    bounds = values
  }

  let httpStatus = 0
  let contentType = null
  let responseBytes = 0
  try {
    const upstream = await fetch(HSL_VEHICLE_FEED, {
      method: 'GET',
      headers: { accept: 'application/x-protobuf', 'user-agent': 'CerebroHelsinki/0.2 (server-side GTFS-RT proxy)' },
      signal: AbortSignal.timeout(8_000),
    })
    httpStatus = upstream.status
    contentType = upstream.headers.get('content-type')
    retrievedAt = isoNow()
    const declaredLength = Number(upstream.headers.get('content-length'))
    if (Number.isFinite(declaredLength) && declaredLength > MAX_FEED_BYTES) {
      await upstream.body?.cancel()
      return unavailable(response, { reason: 'feed_exceeds_size_limit', httpStatus, retrievedAt, contentType, responseBytes: declaredLength, responseMs: Math.round(performance.now() - startedAt) })
    }
    if (!upstream.ok) {
      await upstream.body?.cancel()
      const reason = httpStatus === 401 || httpStatus === 403 ? `upstream_access_denied_${httpStatus}` : `upstream_http_${httpStatus}`
      console.warn(JSON.stringify({ event: 'hsl_gtfsrt_unavailable', reason, http_status: httpStatus, response_ms: Math.round(performance.now() - startedAt), source: SOURCE_NAME }))
      return unavailable(response, { reason, httpStatus, retrievedAt, contentType, responseBytes: Number.isFinite(declaredLength) ? declaredLength : 0, responseMs: Math.round(performance.now() - startedAt) })
    }
    if (!contentType?.toLowerCase().includes('protobuf')) {
      await upstream.body?.cancel()
      const reason = 'unexpected_content_type'
      console.warn(JSON.stringify({ event: 'hsl_gtfsrt_unavailable', reason, http_status: httpStatus, content_type: contentType, response_ms: Math.round(performance.now() - startedAt), source: SOURCE_NAME }))
      return unavailable(response, { reason, httpStatus, retrievedAt, contentType, responseMs: Math.round(performance.now() - startedAt) })
    }
    const bytes = new Uint8Array(await upstream.arrayBuffer())
    retrievedAt = isoNow()
    responseBytes = bytes.byteLength
    if (responseBytes > MAX_FEED_BYTES) {
      return unavailable(response, { reason: 'feed_exceeds_size_limit', httpStatus, retrievedAt, contentType, responseBytes, responseMs: Math.round(performance.now() - startedAt) })
    }
    let feed
    try {
      feed = decodeVehiclePositions(bytes)
    } catch (error) {
      const responseMs = Math.round(performance.now() - startedAt)
      console.warn(JSON.stringify({ event: 'hsl_gtfsrt_unavailable', reason: 'protobuf_decode_error', http_status: httpStatus,
        response_bytes: responseBytes, response_ms: responseMs, source: SOURCE_NAME }))
      return unavailable(response, { reason: 'protobuf_decode_error', httpStatus, retrievedAt, contentType, responseBytes, responseMs })
    }
    const visible = bounds ? feed.features.filter(feature => {
      const [lon, lat] = feature.geometry.coordinates
      return lon >= bounds[0] && lon <= bounds[2] && lat >= bounds[1] && lat <= bounds[3]
    }) : feed.features
    const responseMs = Math.round(performance.now() - startedAt)
    const payload = {
      status: 'live',
      feed_timestamp: feed.providerTimestamp == null ? null : new Date(feed.providerTimestamp).toISOString(),
      feed_version: feed.feedVersion,
      entity_count: feed.entityCount,
      vehicle_count: feed.vehicleEntityCount,
      positioned_vehicle_count: feed.features.length,
      invalid_position_count: feed.invalidPositionCount,
      returned_vehicle_count: visible.length,
      retrieved_at: retrievedAt,
      source: SOURCE_NAME,
      http_status: httpStatus,
      content_type: contentType,
      response_bytes: responseBytes,
      response_ms: responseMs,
      data: { type: 'FeatureCollection', features: visible },
    }
    response.setHeader('Cache-Control', 'public, s-maxage=5, stale-while-revalidate=5')
    response.setHeader('X-Data-Source', SOURCE_NAME)
    console.info(JSON.stringify({ event: 'hsl_gtfsrt_live', http_status: httpStatus, response_bytes: responseBytes,
      response_ms: responseMs, entity_count: feed.entityCount, vehicle_count: feed.vehicleEntityCount,
      positioned_vehicle_count: feed.features.length, feed_timestamp: payload.feed_timestamp, source: SOURCE_NAME }))
    return response.status(200).json(payload)
  } catch (error) {
    const responseMs = Math.round(performance.now() - startedAt)
    retrievedAt = isoNow()
    const reason = upstreamFailureReason(error)
    console.warn(JSON.stringify({ event: 'hsl_gtfsrt_unavailable', reason, http_status: httpStatus,
      response_bytes: responseBytes, response_ms: responseMs, source: SOURCE_NAME }))
    return unavailable(response, { reason, httpStatus, retrievedAt, contentType, responseBytes, responseMs })
  }
}

export const realtimeInternals = { HSL_VEHICLE_FEED, MAX_FEED_BYTES }
