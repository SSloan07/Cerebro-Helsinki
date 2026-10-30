import test from 'node:test'
import assert from 'node:assert/strict'
import airHandler from '../api/live-air.js'
import trainsHandler from '../api/live-trains.js'
import trafficHandler from '../api/live-traffic.js'
import weatherHandler, { latestObservations } from '../api/live-weather.js'

class Capture {
  headers = {}
  setHeader(name, value) { this.headers[name] = value }
  status(code) { this.statusCode = code; return this }
  json(body) { this.body = body; return this }
}

// Replaces global fetch for one test; `routes` maps a URL fragment to a body (or an Error to reject with).
async function withFetch(routes, run) {
  const original = globalThis.fetch
  globalThis.fetch = async url => {
    const hit = Object.entries(routes).find(([fragment]) => String(url).includes(fragment))
    if (!hit) throw new Error(`unexpected fetch ${url}`)
    if (hit[1] instanceof Error) throw hit[1]
    if (typeof hit[1] === 'number') return new Response('', { status: hit[1] })
    return new Response(typeof hit[1] === 'string' ? hit[1] : JSON.stringify(hit[1]), { status: 200 })
  }
  try { return await run() } finally { globalThis.fetch = original }
}
const call = async (handler, method = 'GET') => { const response = new Capture(); await handler({ method, query: {} }, response); return response }

const airFeature = (id, index, label = '30.10.2026 klo 20') => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [24.9 + id / 100, 60.2] },
  properties: { Mittausasema: `Station ${id}`, Aika: label, Ilmanlaatuindeksi: index, Mittausaseman_osoite: 'Somewhere 1', Mittausaseman_numero: id } })

test('HSY air proxy returns stations with the source hour and converts it to an instant', async () => {
  const response = await withFetch({ 'kartta.hsy.fi': { features: [airFeature(1, 10), airFeature(2, null)] } }, () => call(airHandler))
  assert.equal(response.statusCode, 200)
  assert.equal(response.body.status, 'live')
  assert.equal(response.body.station_count, 2)
  assert.equal(response.body.stations[0].observed_at, '2026-10-30T18:00:00.000Z')
  assert.equal(response.body.stations[1].index, null)
})

test('HSY air proxy reports a failed source as unavailable and never as an empty reading', async () => {
  for (const route of [new Error('boom'), 500, { features: [] }]) {
    const response = await withFetch({ 'kartta.hsy.fi': route }, () => call(airHandler))
    assert.equal(response.body.status, 'unavailable')
    assert.ok(response.statusCode >= 500)
    assert.equal(Object.hasOwn(response.body, 'stations'), false)
  }
  assert.equal((await call(airHandler, 'POST')).statusCode, 405)
})

const fmiMember = (time, name, value) => `<wfs:member><BsWfs:BsWfsElement><BsWfs:Time>${time}</BsWfs:Time><BsWfs:ParameterName>${name}</BsWfs:ParameterName><BsWfs:ParameterValue>${value}</BsWfs:ParameterValue></BsWfs:BsWfsElement></wfs:member>`

test('FMI parser keeps the latest real value of each parameter and skips NaN', () => {
  const xml = [fmiMember('2026-10-30T16:00:00Z', 't2m', '5.0'), fmiMember('2026-10-30T17:00:00Z', 't2m', '6.2'), fmiMember('2026-10-30T17:00:00Z', 'ws_10min', 'NaN'),
    fmiMember('2026-10-30T16:00:00Z', 'ws_10min', '2.8'), fmiMember('2026-10-30T17:00:00Z', 'unknown', '1')].join('')
  const latest = latestObservations(xml)
  assert.deepEqual(latest.t2m, { time: '2026-10-30T17:00:00Z', value: 6.2 })
  assert.deepEqual(latest.ws_10min, { time: '2026-10-30T16:00:00Z', value: 2.8 })
  assert.equal(Object.hasOwn(latest, 'unknown'), false)
})

test('FMI weather proxy returns named observations or an unavailable state', async () => {
  const xml = `<wfs:FeatureCollection>${fmiMember('2026-10-30T18:00:00Z', 't2m', '6.2')}${fmiMember('2026-10-30T18:00:00Z', 'rh', '96')}</wfs:FeatureCollection>`
  const live = await withFetch({ 'opendata.fmi.fi': xml }, () => call(weatherHandler))
  assert.equal(live.body.status, 'live')
  assert.deepEqual(live.body.observations, { temperature_c: 6.2, humidity_pct: 96 })
  const exception = await withFetch({ 'opendata.fmi.fi': '<ExceptionReport/>' }, () => call(weatherHandler))
  assert.equal(exception.body.status, 'unavailable')
  assert.equal(exception.body.reason, 'upstream_exception')
})

test('Digitraffic proxy keeps only gathering stations inside the four municipalities with a fresh hour', async () => {
  const now = Date.now()
  const fresh = new Date(now - 10 * 60_000).toISOString(), stale = new Date(now - 6 * 3_600_000).toISOString()
  const station = (id, lon, lat, status = 'GATHERING') => ({ type: 'Feature', id, geometry: { type: 'Point', coordinates: [lon, lat, 0] }, properties: { id, name: `TMS ${id}`, collectionStatus: status } })
  const sensors = (id, end, flow1, flow2) => ({ id, dataUpdatedTime: end, sensorValues: [
    { name: 'OHITUKSET_60MIN_KIINTEA_SUUNTA1', value: flow1, timeWindowEnd: end }, { name: 'OHITUKSET_60MIN_KIINTEA_SUUNTA2', value: flow2, timeWindowEnd: end },
    { name: 'KESKINOPEUS_60MIN_KIINTEA_SUUNTA1', value: 80, timeWindowEnd: end }, { name: 'KESKINOPEUS_60MIN_KIINTEA_SUUNTA2', value: 90, timeWindowEnd: end }] })
  const routes = {
    '/data': { dataUpdatedTime: fresh, stations: [sensors(1, fresh, 400, 600), sensors(2, fresh, 5, 5), sensors(3, fresh, 5, 5), sensors(4, stale, 9, 9), { id: 5, sensorValues: [] }] },
    '/stations': { features: [station(1, 24.94, 60.17), station(2, 22.0, 60.4), station(3, 24.94, 60.17, 'REMOVED_TEMPORARILY'), station(4, 24.94, 60.17), station(5, 24.94, 60.17)] },
  }
  const response = await withFetch(routes, () => call(trafficHandler))
  assert.equal(response.body.status, 'live')
  assert.equal(response.body.station_count, 1)
  assert.deepEqual(response.body.by_municipality, { '091': { stations: 1, vehicles_per_hour: 1000 } })
  assert.equal(response.body.stations[0].mean_speed_kmh, 85)
  const failed = await withFetch({ '/data': 503, '/stations': routes['/stations'] }, () => call(trafficHandler))
  assert.equal(failed.body.status, 'unavailable')
})

test('Digitraffic trains lists the next commercial departures with delay and cancellation', async () => {
  const at = minutes => new Date(Date.now() + minutes * 60_000).toISOString()
  const row = (minutes, extra = {}) => ({ stationShortCode: 'HKI', type: 'DEPARTURE', commercialStop: true, commercialTrack: '4', scheduledTime: at(minutes), ...extra })
  const train = (number, rows, extra = {}) => ({ trainNumber: number, trainType: 'IC', trainCategory: 'Long-distance', commuterLineID: '', cancelled: false, timeTableRows: rows, ...extra })
  const trains = [train(1, [row(30, { differenceInMinutes: 5 })]), train(2, [row(10, { differenceInMinutes: 0 })], { commuterLineID: 'P', trainType: 'HL' }),
    train(3, [row(20, { cancelled: true })]), train(4, [row(-30)]), train(5, [{ ...row(5), stationShortCode: 'TPE' }])]
  const response = await withFetch({ 'rata.digitraffic.fi': trains }, () => call(trainsHandler))
  assert.equal(response.body.status, 'live')
  assert.deepEqual(response.body.departures.map(item => item.train), ['Cercanías P', 'IC 3', 'IC 1'])
  assert.equal(response.body.delayed_count, 1)
  assert.equal(response.body.cancelled_count, 1)
  const failed = await withFetch({ 'rata.digitraffic.fi': new Error('down') }, () => call(trainsHandler))
  assert.equal(failed.body.status, 'unavailable')
})
