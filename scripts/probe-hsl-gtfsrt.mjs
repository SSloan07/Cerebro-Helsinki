#!/usr/bin/env node
// Runs the same server-side handler used by Vite development and Vercel.
// Only transport and count metadata are logged or saved; positions and IDs stay private.
import { writeFile } from 'node:fs/promises'
import mobilityHandler, { realtimeInternals } from '../api/live-mobility.js'

const outputPath = new URL('../data/metadata/hsl_gtfsrt_probe.json', import.meta.url)
const startedAt = performance.now()
const retrievedAt = new Date().toISOString()
const captured = { headers: {}, statusCode: 200, body: null,
  setHeader(name, value) { this.headers[name.toLowerCase()] = value },
  status(code) { this.statusCode = code; return this },
  json(body) { this.body = body; return this },
}

try {
  await mobilityHandler({ method: 'GET', query: {} }, captured)
  const body = captured.body || {}
  const result = {
    status: body.status || 'unavailable', source: body.source || 'HSL GTFS-Realtime', url: realtimeInternals.HSL_VEHICLE_FEED,
    proxy_http_status: captured.statusCode, http_status: body.http_status ?? 0,
    content_type: body.content_type || null, response_bytes: body.response_bytes || 0,
    response_ms: body.response_ms ?? Math.round(performance.now() - startedAt),
    decode_error: body.reason === 'protobuf_decode_error' ? body.reason : null,
    reason: body.reason || null,
    feed_version: body.feed_version || null, entity_count: body.entity_count ?? null,
    vehicle_count: body.vehicle_count ?? null, positioned_vehicle_count: body.positioned_vehicle_count ?? null,
    invalid_position_count: body.invalid_position_count ?? null, feed_timestamp: body.feed_timestamp || null,
    retrieved_at: body.retrieved_at || retrievedAt,
  }
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify(result, null, 2))
  if (result.status !== 'live') process.exitCode = 1
} catch (error) {
  const result = {
    status: 'unavailable', source: 'HSL GTFS-Realtime', url: realtimeInternals.HSL_VEHICLE_FEED,
    proxy_http_status: 500, http_status: 0, content_type: null, response_bytes: 0,
    response_ms: Math.round(performance.now() - startedAt), decode_error: null,
    reason: String(error?.message || error), retrieved_at: new Date().toISOString(),
  }
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify(result, null, 2))
  process.exitCode = 1
}
