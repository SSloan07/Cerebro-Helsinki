# HSL GTFS-Realtime diagnosis

## Finding

The official direct vehicle feed is reachable server-side without a credential:

`GET https://realtime.hsl.fi/realtime/vehicle-positions/v2/hsl`

It returned HTTP 200 and `application/x-protobuf`, GTFS-Realtime version 2.0. The latest captured proxy response was 43,644 bytes and took 1,412 ms. It contained 360 feed entities, 360 VehiclePosition entities, 360 valid positions and 0 invalid positions. Feed timestamp: `2026-09-20T20:27:20.000Z`; retrieved at `2026-09-20T20:27:21.876Z`. These values describe that single response only. The full metadata record is `data/metadata/hsl_gtfsrt_probe.json`, and the source registry mirrors it under `last_server_probe`.

## Root cause and correction

The previous hand-written protobuf decoder used the wrong VehiclePosition field numbers for stop ID, current status and timestamp. It read an integer as a UTF-8 string and failed on the first real feed response. The GTFS-RT schema defines `current_status` as field 4, `timestamp` as field 5, `stop_id` as field 7, and `vehicle` as field 8. `Position.latitude` and `.longitude` are fixed32 fields 1 and 2. The decoder now validates the required FeedHeader version, checks string wire types, and reports feed entity count, VehiclePosition count, valid-position count and invalid positions independently.

## Authentication and transport

HSL documents the raw feed as a GET endpoint with no parameters and a one-second vehicle-position update interval. The server proxy sends `Accept: application/x-protobuf` and a descriptive User-Agent. It needs no API key, browser CORS exception or environment variable. CORS is irrelevant to the provider request because it runs server-side. Digitransit production APIs are separate; their documentation requires registration and a `digitransit-subscription-key` header. This project does not use Digitransit, and has no missing credentials.

The Vercel function has an 8-second upstream timeout, a 30 MB response limit, five-second shared cache and structured logs containing only status, response size/time, counts and timestamps. It never logs keys, vehicle IDs or coordinates. Upstream failures include the actual upstream `http_status`; transport failures report `0`. Decoder failures return `status: unavailable`, preserve the successful upstream HTTP code and expose `reason: protobuf_decode_error`. No feed failure falls back to static GTFS positions. Vite development mounts the same handler locally, so plain `npm run dev` can retrieve live data server-side.

## Reproduction

Run from Node 20+ in a server environment with network access:

```sh
node scripts/probe-hsl-gtfsrt.mjs
python3 -m etl.helsinki.run
npm test
npm run build
```

The probe emits safe metadata and writes the latest response summary. The ETL marks the source `integrated` only when the saved probe shows a decoded v2 feed with real VehiclePosition entities and positioned records; failed or empty probes do not become integrated. The endpoint is active through the Vercel proxy after deployment and through the Vite Node middleware during local development. A deployed Vercel request is still required to validate platform runtime, routing and headers.
