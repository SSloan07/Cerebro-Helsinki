import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { decodeVehiclePositions } from './utils/gtfsRealtime.js'
import mobilityHandler from '../api/live-mobility.js'
import stopsHandler from '../api/stops.js'
import { createApiDevMiddleware } from '../api/devMiddleware.js'

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
  const header = [...fieldBytes(1, utf8('2.0')), ...fieldVarint(3, 1_790_000_000)]
  const position = [...floatField(1, 60.171), ...floatField(2, 24.941)]
  const trip = fieldBytes(5, utf8('HSL:101'))
  const descriptor = fieldBytes(1, utf8('test-vehicle-1'))
  const vehicle = [...fieldBytes(1, trip), ...fieldBytes(2, position), ...fieldVarint(4, 1),
    ...fieldVarint(5, 1_790_000_000), ...fieldBytes(7, utf8('stop-1')), ...fieldBytes(8, descriptor)]
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
  const realtime = registry.sources.find(source => source.id === 'hsl-gtfs-realtime-vehicles')
  assert.equal(realtime.integration_status, 'integrated')
  assert.equal(registry.sources.find(source => source.id === 'osm-building-footprints').integration_status, 'failed')
  assert.equal(reportHasNoInventedCounts(await readJson('../public/data/update-report.json')), true)
  const [snapshot, archive, probe] = await Promise.all([
    readJson('../data/snapshots/2026-09-20.json'), readJson('../data/metadata/hsl_gtfs_archive.json'), readJson('../data/metadata/hsl_gtfsrt_probe.json'),
  ])
  assert.match(snapshot.inputs['hsl_stops.txt'].sha256, /^[a-f\d]{64}$/)
  assert.match(snapshot.outputs['transit_stops.geojson'].sha256, /^[a-f\d]{64}$/)
  assert.match(archive.archive_sha256, /^[a-f\d]{64}$/)
  assert.deepEqual(archive.retained_members, ['stops.txt', 'feed_info.txt'])
  assert.equal(probe.status, 'live')
  assert.equal(probe.http_status, 200)
  assert.equal(probe.content_type, 'application/x-protobuf')
  assert.equal(probe.decode_error, null)
  assert.equal(probe.feed_version, '2.0')
  assert.ok(probe.vehicle_count > 0)
  assert.ok(probe.positioned_vehicle_count > 0)
  assert.equal(realtime.record_count, probe.vehicle_count)
  assert.equal(realtime.last_server_probe.feed_timestamp, probe.feed_timestamp)
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
  assert.equal(decoded.features[0].properties.stop_id, 'stop-1')
  assert.equal(decoded.features[0].properties.current_status, 1)
  assert.equal(decoded.features[0].properties.observed_at, 1_790_000_000_000)
  assert.equal(decoded.feedVersion, '2.0')
  assert.equal(decoded.entityCount, 1)
  assert.equal(decoded.vehicleEntityCount, 1)
  assert.equal(decoded.invalidPositionCount, 0)
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
    globalThis.fetch = async () => new Response(sampleVehicleFeed(), { status: 200, headers: { 'content-type': 'application/x-protobuf' } })
    const response = new ResponseCapture()
    await mobilityHandler({ method: 'GET', query: { bbox: '24.9,60.16,25,60.18' } }, response)
    assert.equal(response.statusCode, 200)
    assert.equal(response.body.status, 'live')
    assert.equal(response.body.entity_count, 1)
    assert.equal(response.body.vehicle_count, 1)
    assert.equal(response.body.positioned_vehicle_count, 1)
    assert.equal(response.body.returned_vehicle_count, 1)
    assert.equal(response.body.feed_version, '2.0')
    assert.equal(response.body.feed_timestamp, '2026-09-21T14:13:20.000Z')
    assert.equal(response.body.source, 'HSL GTFS-Realtime')
    assert.match(response.headers['Cache-Control'], /s-maxage=5/)

    const localApi = createApiDevMiddleware()
    const localResponse = new ResponseCapture()
    localResponse.end = body => { localResponse.body = JSON.parse(body); localResponse.headersSent = true }
    await localApi({ method: 'GET', url: '/api/live-mobility?bbox=24.9,60.16,25,60.18' }, localResponse, () => assert.fail('local API route was not handled'))
    assert.equal(localResponse.statusCode, 200)
    assert.equal(localResponse.body.status, 'live')
    assert.equal(localResponse.body.vehicle_count, 1)
    assert.match(localResponse.headers['Cache-Control'], /s-maxage=5/)

    globalThis.fetch = async () => new Response(Uint8Array.from([0xff]), { status: 200, headers: { 'content-type': 'application/x-protobuf' } })
    const undecodable = new ResponseCapture()
    await mobilityHandler({ method: 'GET', query: {} }, undecodable)
    assert.equal(undecodable.statusCode, 503)
    assert.equal(undecodable.body.status, 'unavailable')
    assert.equal(undecodable.body.reason, 'protobuf_decode_error')
    assert.equal(undecodable.body.http_status, 200)

    globalThis.fetch = async () => { throw new Error('simulated source outage') }
    const unavailable = new ResponseCapture()
    await mobilityHandler({ method: 'GET', query: {} }, unavailable)
    assert.equal(unavailable.statusCode, 503)
    assert.equal(unavailable.body.status, 'unavailable')
    assert.equal(unavailable.body.http_status, 0)
    assert.equal(unavailable.body.source, 'HSL GTFS-Realtime')
    assert.equal(Object.hasOwn(unavailable.body, 'vehicle_count'), false)
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

test('Paavo postal areas keep lineage, null suppression and sector totals', async () => {
  const [areas, report, registry] = await Promise.all([
    readJson('../public/data/postal_areas.geojson'), readJson('../public/data/update-report.json'), readJson('../public/data/sources.json'),
  ])
  assert.equal(areas.features.length, report.counts.postal_area_count)
  assert.ok(registry.sources.some(source => source.id === 'stat-fi-postal-areas-paavo' && source.integration_status === 'integrated'))
  for (const { id, properties: p } of areas.features) {
    assert.match(id, /^\d{5}$/)
    assert.ok(['049', '091', '092', '235'].includes(p.municipality_code))
    for (const field of ['income_mean', 'income_median', 'jobs_total', 'residents']) assert.ok(p[field] === null || p[field] >= 0, `${id} ${field}`)
    if (!p.residents) assert.equal(p.income_mean, null, `${id} has income without residents`)
    const sectors = Object.values(p.jobs_by_sector)
    if (p.jobs_total !== null && !sectors.includes(null)) assert.equal(sectors.reduce((a, b) => a + b, 0), p.jobs_total)
  }
})

test('StatFin population covers the four municipalities with positive totals', async () => {
  const population = await readJson('../public/data/population.json')
  assert.deepEqual(Object.keys(population.population_by_municipality).sort(), ['049', '091', '092', '235'])
  assert.ok(Object.values(population.population_by_municipality).every(value => Number.isInteger(value) && value > 0))
  assert.equal(population.source_id, 'statfin-population-11ra')
})

test('New lake files keep lineage, suppression and internal consistency', async () => {
  const [rents, earnings, nationality, education, registry] = await Promise.all([
    readJson('../public/data/rents.json'), readJson('../public/data/earnings.json'), readJson('../public/data/employment_nationality.json'),
    readJson('../public/data/education.json'), readJson('../public/data/sources.json'),
  ])
  for (const id of ['statfin-rents-15fa', 'statfin-earnings-15b2', 'statfin-employment-nationality-115f', 'statfin-education-11c4']) {
    const entry = registry.sources.find(source => source.id === id)
    assert.ok(entry && entry.integration_status === 'integrated' && entry.license && entry.consulted_at && entry.period_covered, id)
  }
  assert.ok(Object.values(rents.series).every(quarters => quarters[rents.latest_quarter].eur_per_m2 > 5))
  assert.ok(earnings.earnings.total.p10 < earnings.earnings.total.median && earnings.earnings.total.median < earnings.earnings.total.p90)
  for (const group of Object.values(nationality.groups)) assert.ok(group.employed + group.unemployed <= group.population_18_64)
  for (const sectors of Object.values(education.by_municipality)) for (const cell of Object.values(sectors)) assert.ok(cell.foreign_language_students === null || cell.foreign_language_students <= cell.students)
})

test('Company counts never carry records and hide small cells; land cover sums its classes', async () => {
  const [companies, landCover] = await Promise.all([readJson('../public/data/companies.json'), readJson('../public/data/land_cover.json')])
  for (const entry of Object.values(companies.by_municipality)) {
    assert.deepEqual(Object.keys(entry).sort(), ['classified', 'name', 'sections', 'total', 'without_activity'])
    assert.ok(Object.values(entry.sections).every(count => count === null || count >= companies.min_cell))
    assert.equal(entry.classified + entry.without_activity, entry.total)
  }
  for (const years of Object.values(landCover.by_municipality)) for (const cell of Object.values(years)) {
    assert.ok(Math.abs(cell.buildings + cell.paved_roads + cell.other_impermeable - cell.impermeable_km2) < 0.01)
  }
})
