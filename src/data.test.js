import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { decodeVehiclePositions } from './utils/gtfsRealtime.js'
import mobilityHandler from '../api/live-mobility.js'
import stopsHandler from '../api/stops.js'

const readJson = path => readFile(new URL(path, import.meta.url), 'utf8').then(JSON.parse)
const fieldVarint = (number, value) => [...encodeVarint((number << 3) | 0), ...encodeVarint(value)]
const fieldBytes = (number, value) => [...encodeVarint((number << 3) | 2), ...encodeVarint(value.length), ...value]
function encodeVarint(value) {
  let remaining = BigInt(value)
  const bytes = []
  while (remaining > 127n) { bytes.push(Number(remaining & 127n) | 128); remaining >>= 7n }
  bytes.push(Number(remaining))
  return bytes
}
const utf8 = value => [...new TextEncoder().encode(value)]
const floatField = (number, value) => {
  const buffer = new ArrayBuffer(4)
  new DataView(buffer).setFloat32(0, value, true)
  return [...encodeVarint((number << 3) | 5), ...new Uint8Array(buffer)]
}
function sampleVehicleFeed() {
  const header = fieldVarint(3, 1_790_000_000)
  const position = [...floatField(1, 60.171), ...floatField(2, 24.941)]
  const trip = fieldBytes(5, utf8('HSL:101'))
  const descriptor = fieldBytes(1, utf8('test-vehicle-1'))
  const vehicle = [...fieldBytes(1, trip), ...fieldBytes(2, position), ...fieldBytes(4, utf8('stop-1')),
    ...fieldVarint(6, 1_790_000_000), ...fieldBytes(8, descriptor)]
  const entity = [...fieldBytes(1, utf8('entity-1')), ...fieldBytes(4, vehicle)]
  return new Uint8Array([...fieldBytes(1, header), ...fieldBytes(2, entity)])
}

test('Helsinki metro polygons contain four real Statistics Finland units in WGS84', async () => {
  const data = await readJson('../public/data/municipalities.geojson')
  assert.equal(data.features.length, 4)
  assert.deepEqual(data.features.map(f => f.properties.municipality_code).sort(), ['049', '091', '092', '235'])
  for (const feature of data.features) {
    assert.ok(feature.properties.source_ids.includes('fi-municipal-boundaries'))
    assert.equal(feature.properties.reference_year, 2025)
    assert.ok(feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon')
    for (const ring of feature.geometry.type === 'Polygon' ? feature.geometry.coordinates : feature.geometry.coordinates.flat()) {
      for (const [lon, lat] of ring) assert.ok(lon >= 24.4 && lon <= 25.4 && lat >= 59.8 && lat <= 60.6)
    }
  }
})

test('HSL static GTFS snapshot contains unique in-area boarding stops with valid lineage', async () => {
  const [stops, report, registry] = await Promise.all([
    readJson('../public/data/transit_stops.geojson'), readJson('../public/data/update-report.json'), readJson('../public/data/sources.json'),
  ])
  const source = registry.sources.find(item => item.id === 'hsl-gtfs-stops')
  assert.equal(stops.features.length, 6027)
  assert.equal(new Set(stops.features.map(item => item.id)).size, stops.features.length)
  assert.equal(report.counts.mapped_stop_count, stops.features.length)
  assert.deepEqual(Object.keys(report.counts.stops_by_municipality).sort(), ['049', '091', '092', '235'])
  assert.equal(source.integration_status, 'integrated')
  assert.match(source.period_covered, /20260918–20261116/)
  for (const feature of stops.features) {
    const [lon, lat] = feature.geometry.coordinates
    assert.ok(lon > 24 && lon < 26 && lat > 59 && lat < 61)
    assert.ok(['049', '091', '092', '235'].includes(feature.properties.municipality_code))
    assert.equal(feature.properties.source_id, 'hsl-gtfs-stops')
  }
})

test('source registry is complete and missing urban layers have explicit non-success states', async () => {
  const registry = await readJson('../public/data/sources.json')
  const acceptedStatuses = new Set(['integrated', 'candidate', 'failed', 'not_available', 'pending_integration', 'partial_coverage', 'stale', 'unavailable'])
  const evidenceTypes = new Set(['observed', 'derived', 'estimated', 'modelled', 'proxy', 'declared'])
  for (const source of registry.sources) {
    for (const field of ['dataset_name', 'provider', 'url', 'consulted_at', 'period_covered', 'geographic_coverage', 'license', 'evidence_type', 'confidence', 'transformation', 'limitations', 'integration_status']) {
      assert.ok(Object.hasOwn(source, field), `${source.id} missing ${field}`)
    }
    assert.ok(source.url.startsWith('https://'))
    assert.ok(evidenceTypes.has(source.evidence_type))
    assert.ok(acceptedStatuses.has(source.integration_status))
  }
  assert.equal(registry.sources.find(source => source.id === 'helsinki-3d-model').integration_status, 'integrated')
  assert.equal(registry.sources.find(source => source.id === 'hsl-gtfs-realtime-vehicles').integration_status, 'candidate')
  assert.equal(registry.sources.find(source => source.id === 'osm-building-footprints').integration_status, 'failed')
  assert.equal(reportHasNoInventedCounts(await readJson('../public/data/update-report.json')), true)
  const [snapshot, archive] = await Promise.all([
    readJson('../data/snapshots/2026-09-20.json'), readJson('../data/metadata/hsl_gtfs_archive.json'),
  ])
  assert.match(snapshot.inputs['hsl_stops.txt'].sha256, /^[a-f\d]{64}$/)
  assert.match(snapshot.outputs['transit_stops.geojson'].sha256, /^[a-f\d]{64}$/)
  assert.match(archive.archive_sha256, /^[a-f\d]{64}$/)
  assert.deepEqual(archive.retained_members, ['stops.txt', 'feed_info.txt'])
})

function reportHasNoInventedCounts(report) {
  return ['population', 'buildings', 'live_vehicles'].every(metric => !Object.hasOwn(report.counts, metric) || report.counts[metric] === null)
}

test('GTFS-RT protobuf decoder returns observed vehicle position and provider time', () => {
  const decoded = decodeVehiclePositions(sampleVehicleFeed())
  assert.equal(decoded.features.length, 1)
  assert.ok(Math.abs(decoded.features[0].geometry.coordinates[0] - 24.941) < 0.00001)
  assert.ok(Math.abs(decoded.features[0].geometry.coordinates[1] - 60.171) < 0.00001)
  assert.equal(decoded.features[0].properties.route_id, 'HSL:101')
  assert.equal(decoded.providerTimestamp, 1_790_000_000_000)
})

test('HSL live proxy applies bounding-box filtering and represents a feed failure as unavailable', async () => {
  const originalFetch = globalThis.fetch
  class ResponseCapture {
    headers = {}
    statusCode = 200
    setHeader(name, value) { this.headers[name] = value }
    status(value) { this.statusCode = value; return this }
    json(value) { this.body = value; return this }
  }
  try {
    globalThis.fetch = async () => new Response(sampleVehicleFeed(), { status: 200 })
    const response = new ResponseCapture()
    await mobilityHandler({ method: 'GET', query: { bbox: '24.9,60.16,25,60.18' } }, response)
    assert.equal(response.statusCode, 200)
    assert.equal(response.body.status, 'realtime')
    assert.equal(response.body.returnedVehicleCount, 1)
    assert.match(response.headers['Cache-Control'], /s-maxage=5/)

    globalThis.fetch = async () => { throw new Error('simulated source outage') }
    const unavailable = new ResponseCapture()
    await mobilityHandler({ method: 'GET', query: {} }, unavailable)
    assert.equal(unavailable.statusCode, 503)
    assert.equal(unavailable.body.status, 'unavailable')
    assert.equal(Object.hasOwn(unavailable.body, 'totalVehicleCount'), false)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('static HSL stop endpoint rejects invalid extents and returns only the requested viewport', async () => {
  class ResponseCapture {
    headers = {}
    statusCode = 200
    setHeader(name, value) { this.headers[name] = value }
    status(value) { this.statusCode = value; return this }
    json(value) { this.body = value; return this }
  }
  const invalid = new ResponseCapture()
  await stopsHandler({ method: 'GET', query: { bbox: '25,61,24,60' } }, invalid)
  assert.equal(invalid.statusCode, 400)
  assert.equal(invalid.body.status, 'unavailable')

  const response = new ResponseCapture()
  await stopsHandler({ method: 'GET', query: { bbox: '24.94,60.16,24.95,60.18' } }, response)
  assert.equal(response.statusCode, 200)
  assert.ok(response.body.returnedFeatureCount > 0)
  assert.ok(response.body.features.every(feature => {
    const [lon, lat] = feature.geometry.coordinates
    return lon >= 24.94 && lon <= 24.95 && lat >= 60.16 && lat <= 60.18
  }))
  assert.match(response.headers['Cache-Control'], /s-maxage=3600/)
})
