import { failureReason, getFromUpstream, isoNow, methodGuard, unavailable } from './_upstream.js'

const SOURCE = 'FMI open data — Helsinki Kaisaniemi weather station (fmisid 100971)'
const PARAMETERS = { t2m: 'temperature_c', ws_10min: 'wind_ms', rh: 'humidity_pct', r_1h: 'rain_mm_1h', p_sea: 'pressure_hpa' }
const url = since => 'https://opendata.fmi.fi/wfs?' + new URLSearchParams({ service: 'WFS', version: '2.0.0', request: 'getFeature',
  storedquery_id: 'fmi::observations::weather::simple', fmisid: '100971', parameters: Object.keys(PARAMETERS).join(','), timestep: '60', starttime: since })

// The simple feature format is a flat list of (Time, ParameterName, ParameterValue); keep the latest real value of each.
export function latestObservations(xml) {
  const latest = {}
  for (const member of xml.match(/<BsWfs:BsWfsElement[\s\S]*?<\/BsWfs:BsWfsElement>/g) || []) {
    const time = /<BsWfs:Time>([^<]+)</.exec(member)?.[1]
    const name = /<BsWfs:ParameterName>([^<]+)</.exec(member)?.[1]
    const value = Number(/<BsWfs:ParameterValue>([^<]+)</.exec(member)?.[1])
    if (!time || !PARAMETERS[name] || !Number.isFinite(value)) continue
    if (!latest[name] || time > latest[name].time) latest[name] = { time, value }
  }
  return latest
}

export default async function handler(request, response) {
  if (methodGuard(request, response, SOURCE)) return
  let retrievedAt = isoNow()
  try {
    const xml = await getFromUpstream(url(new Date(Date.now() - 4 * 3_600_000).toISOString().replace(/\.\d+Z$/, 'Z')), { as: 'text' })
    retrievedAt = isoNow()
    const latest = latestObservations(xml)
    if (!latest.t2m) return unavailable(response, SOURCE, { reason: xml.includes('ExceptionReport') ? 'upstream_exception' : 'upstream_empty', httpStatus: 200, retrievedAt })
    const observations = Object.fromEntries(Object.entries(latest).map(([name, item]) => [PARAMETERS[name], item.value]))
    response.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
    return response.status(200).json({ status: 'live', source: SOURCE, retrieved_at: retrievedAt, observed_at: latest.t2m.time,
      station: { name: 'Helsinki Kaisaniemi', fmisid: 100971 }, observations })
  } catch (error) {
    return unavailable(response, SOURCE, { reason: failureReason(error), httpStatus: error.httpStatus || 0, retrievedAt })
  }
}
