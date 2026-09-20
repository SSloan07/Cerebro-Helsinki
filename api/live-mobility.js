import { decodeVehiclePositions } from '../src/utils/gtfsRealtime.js'

const HSL_VEHICLE_FEED = 'https://realtime.hsl.fi/realtime/vehicle-positions/v2/hsl'

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    return response.status(405).json({ status: 'unavailable', reason: 'method_not_allowed' })
  }
  const { bbox = '' } = request.query || {}
  let bounds = null
  if (bbox) {
    const values = String(bbox).split(',').map(Number)
    if (values.length !== 4 || values.some(value => !Number.isFinite(value)) || values[0] < -180 || values[2] > 180 || values[1] < -90 || values[3] > 90 || values[0] >= values[2] || values[1] >= values[3]) {
      return response.status(400).json({ status: 'unavailable', reason: 'invalid_bbox' })
    }
    bounds = values
  }
  try {
    const upstream = await fetch(HSL_VEHICLE_FEED, { headers: { accept: 'application/x-protobuf' }, signal: AbortSignal.timeout(10_000) })
    if (!upstream.ok) throw new Error(`HSL HTTP ${upstream.status}`)
    const feed = decodeVehiclePositions(new Uint8Array(await upstream.arrayBuffer()))
    const visible = bounds ? feed.features.filter(feature => {
      const [lon, lat] = feature.geometry.coordinates
      return lon >= bounds[0] && lon <= bounds[2] && lat >= bounds[1] && lat <= bounds[3]
    }) : feed.features
    response.setHeader('Cache-Control', 'public, s-maxage=5, stale-while-revalidate=10')
    response.setHeader('X-Data-Source', 'HSL GTFS-RT')
    return response.status(200).json({ status: 'realtime', fetchedAt: Date.now(), providerTimestamp: feed.providerTimestamp,
      totalVehicleCount: feed.features.length, returnedVehicleCount: visible.length,
      data: { type: 'FeatureCollection', features: visible } })
  } catch (error) {
    response.setHeader('Cache-Control', 'no-store')
    return response.status(503).json({ status: 'unavailable', reason: 'realtime_feed_unavailable', message: String(error.message || error) })
  }
}
