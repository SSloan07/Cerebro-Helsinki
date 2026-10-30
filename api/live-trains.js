import { failureReason, getFromUpstream, isoNow, methodGuard, unavailable } from './_upstream.js'

const SOURCE = 'Fintraffic Digitraffic — live trains at Helsinki Central station (HKI)'
const URL_TRAINS = 'https://rata.digitraffic.fi/api/v1/live-trains/station/HKI?arrived_trains=0&arriving_trains=0&departed_trains=0&departing_trains=12&include_nonstopping=false'
const HEADERS = { 'Digitraffic-User': 'CerebroHelsinki/EAFIT', 'Accept-Encoding': 'gzip' }
const DELAY_MINUTES = 3

export default async function handler(request, response) {
  if (methodGuard(request, response, SOURCE)) return
  let retrievedAt = isoNow()
  try {
    const trains = await getFromUpstream(URL_TRAINS, { headers: HEADERS })
    retrievedAt = isoNow()
    if (!Array.isArray(trains)) return unavailable(response, SOURCE, { reason: 'upstream_undecodable', httpStatus: 200, retrievedAt })
    const departures = trains.flatMap(train => train.timeTableRows
      .filter(row => row.stationShortCode === 'HKI' && row.type === 'DEPARTURE' && row.commercialStop && Date.parse(row.scheduledTime) >= Date.now() - 60_000)
      .map(row => ({ train: train.commuterLineID ? `Cercanías ${train.commuterLineID}` : `${train.trainType} ${train.trainNumber}`, category: train.trainCategory, track: row.commercialTrack || null,
        scheduled: row.scheduledTime, estimated: row.liveEstimateTime || null, delay_minutes: Number.isFinite(row.differenceInMinutes) ? row.differenceInMinutes : null,
        cancelled: Boolean(train.cancelled || row.cancelled) })))
      .sort((a, b) => Date.parse(a.scheduled) - Date.parse(b.scheduled)).slice(0, 8)
    if (!departures.length) return unavailable(response, SOURCE, { reason: 'upstream_empty', httpStatus: 200, retrievedAt })
    response.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60')
    return response.status(200).json({ status: 'live', source: SOURCE, retrieved_at: retrievedAt, station: 'Helsinki Central (HKI)', delay_threshold_minutes: DELAY_MINUTES,
      departures, delayed_count: departures.filter(item => (item.delay_minutes ?? 0) >= DELAY_MINUTES).length, cancelled_count: departures.filter(item => item.cancelled).length })
  } catch (error) {
    return unavailable(response, SOURCE, { reason: failureReason(error), httpStatus: error.httpStatus || 0, retrievedAt })
  }
}
