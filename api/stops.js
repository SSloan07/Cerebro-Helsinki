import { readFile } from 'node:fs/promises'
import path from 'node:path'

const SOURCE_FILE = path.join(process.cwd(), 'public', 'data', 'transit_stops.geojson')
let cachedData

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    return response.status(405).json({ status: 'unavailable', reason: 'method_not_allowed' })
  }
  const { bbox = '' } = request.query || {}
  const values = String(bbox).split(',').map(Number)
  if (values.length !== 4 || values.some(value => !Number.isFinite(value)) || values[0] < -180 || values[2] > 180 || values[1] < -90 || values[3] > 90 || values[0] >= values[2] || values[1] >= values[3]) {
    return response.status(400).json({ status: 'unavailable', reason: 'invalid_bbox' })
  }
  try {
    cachedData ||= JSON.parse(await readFile(SOURCE_FILE, 'utf8'))
    const [west, south, east, north] = values
    const features = cachedData.features.filter(feature => {
      const [lon, lat] = feature.geometry.coordinates
      return lon >= west && lon <= east && lat >= south && lat <= north
    })
    response.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
    response.setHeader('X-Data-Source', 'Versioned HSL GTFS snapshot')
    return response.status(200).json({ type: 'FeatureCollection', features, returnedFeatureCount: features.length,
      snapshotGeneratedAt: JSON.parse(await readFile(path.join(process.cwd(), 'public', 'data', 'update-report.json'), 'utf8')).generated_at })
  } catch (error) {
    return response.status(503).json({ status: 'unavailable', reason: 'snapshot_unavailable', message: String(error.message || error) })
  }
}
