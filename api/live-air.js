import { failureReason, getFromUpstream, isoNow, methodGuard, unavailable } from './_upstream.js'

const SOURCE = 'HSY Ilmanlaatu_nyt (air quality index, measuring stations)'
const URL_AIR = 'https://kartta.hsy.fi/geoserver/wfs?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=ilmanlaatu:Ilmanlaatu_nyt&OUTPUTFORMAT=application/json&SRSNAME=EPSG:4326'

// «30.10.2026 klo 20» is Helsinki local time; keep HSY's own label and add an ISO instant.
function observedAt(label) {
  const match = /^(\d{1,2})\.(\d{1,2})\.(\d{4}) klo (\d{1,2})$/.exec(label || '')
  if (!match) return null
  const [, day, month, year, hour] = match.map(Number)
  const guess = Date.UTC(year, month - 1, day, hour)
  const offset = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Helsinki', timeZoneName: 'shortOffset' }).formatToParts(new Date(guess)).find(part => part.type === 'timeZoneName')?.value
  const hours = Number(/GMT([+-]\d+)/.exec(offset || '')?.[1] ?? 2)
  return new Date(guess - hours * 3_600_000).toISOString()
}

export default async function handler(request, response) {
  if (methodGuard(request, response, SOURCE)) return
  let retrievedAt = isoNow()
  try {
    const document = await getFromUpstream(URL_AIR)
    retrievedAt = isoNow()
    const stations = (document.features || []).map(feature => {
      const p = feature.properties || {}
      const [lon, lat] = feature.geometry?.coordinates || []
      return { id: p.Mittausaseman_numero, name: p.Mittausasema, address: p.Mittausaseman_osoite, index: Number.isFinite(p.Ilmanlaatuindeksi) ? p.Ilmanlaatuindeksi : null,
        observed_label: p.Aika || null, observed_at: observedAt(p.Aika), lon, lat }
    }).filter(station => Number.isFinite(station.lon) && Number.isFinite(station.lat))
    if (!stations.length) return unavailable(response, SOURCE, { reason: 'upstream_empty', httpStatus: 200, retrievedAt })
    response.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120')
    return response.status(200).json({ status: 'live', source: SOURCE, retrieved_at: retrievedAt,
      observed_at: stations.map(station => station.observed_at).filter(Boolean).sort().at(-1) || null, station_count: stations.length, stations })
  } catch (error) {
    return unavailable(response, SOURCE, { reason: failureReason(error), httpStatus: error.httpStatus || 0, retrievedAt })
  }
}
