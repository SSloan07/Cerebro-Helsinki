# Cerebro Helsinki · Urban Intelligence & Digital Twin

An evidence-led urban intelligence MVP for Helsinki, Espoo, Vantaa and Kauniainen. The current functional slice maps official 2025 municipal boundaries and observed HSL GTFS boarding-stop locations, with an optional server-side adapter for HSL's live GTFS-Realtime vehicle feed. Missing layers remain visibly pending or unavailable; no placeholder urban statistics are generated.

## Run locally

Requirements: Node.js 20.19+ (or 22.12+), npm, and Python 3.10+.

```sh
npm install
npm run dev
```

Vite serves the frontend, checked-in `/public/data` snapshots and a same-origin middleware that runs the exact `/api/*` handlers on the Node dev server. If Node can reach HSL, the local app displays the live feed; network errors and timeouts remain explicit. Vercel runs the same handlers in deployment. Static stops fall back to a viewport-filtered snapshot. OpenStreetMap tiles require a browser connection and retain visible attribution.

## Reproducible data update

```sh
python3 -m etl.helsinki.run                 # validate local inputs and publish derived files
python3 -m etl.helsinki.run --refresh       # fetch Statistics Finland boundaries and current HSL GTFS
npm test
npm run build
```

The refresh downloads the complete HSL GTFS archive (about 82 MB zipped, over 1 GB expanded) temporarily, then keeps only `stops.txt` and `feed_info.txt`. It downloads only the four required municipal polygons from Statistics Finland. Failed downloads are recorded; existing snapshots are retained and the resulting report remains partial. Each ETL run writes checksums, counts, source status and a dated snapshot. Review `public/data/update-report.json` and `public/data/sources.json` before publishing.

## Data flow and architecture

```text
Statistics Finland WFS ─┐
HSL daily GTFS ZIP ──────┴→ etl/helsinki/run.py → validated raw tables → normalized GeoJSON + lineage
HSL GTFS-Realtime ─────────→ api/live-mobility.js (Vercel proxy, 5s cache) → MapLibre live layer
Versioned GeoJSON ─────────→ api/stops.js (bbox filter, 1h cache) → MapLibre clustered stop layer
Helsinki official 3D viewer ───────────────────────────────────→ embedded streamed model (Helsinki only)
```

Static files are the current storage adapter. `schema/postgis.sql` defines a Postgres/PostGIS target with source snapshots, spatial entities, observations and realtime event tables. See [architecture](docs/architecture.md), [source catalogue](docs/data-sources.md), [data contract](docs/data-contract.md), [quality](docs/data-quality.md), [licensing](docs/licensing.md), [methodology](docs/methodology.md), and [limitations](docs/limitations.md).

## Implemented and pending

Implemented: Helsinki product identity; responsive perspective navigation; MapLibre, OSM basemap and attribution; official Statistics Finland boundaries; 6,027 HSL boarding-stop records within the four municipalities; municipality and layer filters; stop clustering, popups, bbox retrieval and source lineage; source registry, update report and tests; Vercel same-origin proxies; official Helsinki 3D viewer embed.

Pending: local building geometry and selectable 3D features; reliable live-feed response verification in a deployed runtime; HSL alerts, arrivals and route visualization; public service records pending response/license validation; climate, energy, housing, population, research and innovation datasets; hosted PostGIS and scheduled ETL. These sections communicate their integration status instead of showing empty-looking fake indicators.

## Vercel

The Vite build is static and `api/` contains Vercel Node functions. `api/stops.js` reads `public/data/transit_stops.geojson`; retain that file with the function bundle. No keys are required for the documented HSL raw GTFS-Realtime feed. Digitransit key-protected APIs are not called. Do not commit credentials or `.env` files. Vercel deployment and live production checks have not been performed.
