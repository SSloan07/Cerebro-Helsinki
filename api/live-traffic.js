import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { failureReason, getFromUpstream, isoNow, methodGuard, unavailable } from './_upstream.js'

const SOURCE = 'Fintraffic Digitraffic — road traffic measurement stations (TMS)'
const BASE = 'https://tie.digitraffic.fi/api/tms/v1/stations'
const HEADERS = { 'Digitraffic-User': 'CerebroHelsinki/EAFIT', 'Accept-Encoding': 'gzip' }
const MAX_AGE_MS = 3 * 3_600_000
let municipalities

const inRing = (lon, lat, ring) => {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j]
    if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}
const inGeometry = (lon, lat, geometry) => (geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates)
  .some(([outer, ...holes]) => inRing(lon, lat, outer) && !holes.some(hole => inRing(lon, lat, hole)))

// Sensor names are Finnish: OHITUKSET = vehicles passing, KESKINOPEUS = mean speed, 60MIN = last full hour, SUUNTA1/2 = direction.
const sensor = (values, name) => values.find(item => item.name === name)

export default async function handler(request, response) {
  if (methodGuard(request, response, SOURCE)) return
  let retrievedAt = isoNow()
  try {
    municipalities ||= JSON.parse(await readFile(path.join(process.cwd(), 'public', 'data', 'municipalities.geojson'), 'utf8'))
    const [stationList, measurements] = await Promise.all([
      getFromUpstream(BASE, { headers: HEADERS }), getFromUpstream(`${BASE}/data`, { headers: HEADERS, maxBytes: 15_000_000 })])
    retrievedAt = isoNow()
    const located = new Map()
    for (const feature of stationList.features || []) {
      if (feature.properties?.collectionStatus !== 'GATHERING') continue
      const [lon, lat] = feature.geometry?.coordinates || []
      const home = municipalities.features.find(item => inGeometry(lon, lat, item.geometry))
      if (home) located.set(feature.id, { name: feature.properties.name, lon, lat, municipality_code: home.properties.municipality_code })
    }
    const stations = []
    for (const item of measurements.stations || []) {
      const place = located.get(item.id)
      if (!place) continue
      const values = item.sensorValues || []
      const flows = ['OHITUKSET_60MIN_KIINTEA_SUUNTA1', 'OHITUKSET_60MIN_KIINTEA_SUUNTA2'].map(name => sensor(values, name)).filter(Boolean)
      if (!flows.length) continue
      const windowEnd = flows[0].timeWindowEnd
      if (!windowEnd || Date.now() - Date.parse(windowEnd) > MAX_AGE_MS) continue
      const speeds = ['KESKINOPEUS_60MIN_KIINTEA_SUUNTA1', 'KESKINOPEUS_60MIN_KIINTEA_SUUNTA2'].map(name => sensor(values, name)?.value).filter(Number.isFinite)
      stations.push({ id: item.id, ...place, vehicles_per_hour: flows.reduce((sum, flow) => sum + flow.value, 0),
        mean_speed_kmh: speeds.length ? Math.round((speeds.reduce((a, b) => a + b, 0) / speeds.length) * 10) / 10 : null, window_end: windowEnd })
    }
    if (!stations.length) return unavailable(response, SOURCE, { reason: 'upstream_empty', httpStatus: 200, retrievedAt })
    const byMunicipality = {}
    for (const station of stations) {
      const entry = (byMunicipality[station.municipality_code] ||= { stations: 0, vehicles_per_hour: 0 })
      entry.stations += 1
      entry.vehicles_per_hour += station.vehicles_per_hour
    }
    response.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120')
    return response.status(200).json({ status: 'live', source: SOURCE, retrieved_at: retrievedAt, data_updated: measurements.dataUpdatedTime || null,
      station_count: stations.length, by_municipality: byMunicipality, stations })
  } catch (error) {
    return unavailable(response, SOURCE, { reason: failureReason(error), httpStatus: error.httpStatus || 0, retrievedAt })
  }
}
