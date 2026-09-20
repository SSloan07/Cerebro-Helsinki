# Cerebro München

Cerebro München is an open-data territorial intelligence MVP. The first working vertical maps official Munich district boundaries and 2024 population, plus one institution location with publicly published coordinates. The application separates observed, derived and declared evidence and makes source limits visible in the interface.

## Run locally

Requirements: Node.js 20.19+ or 22.12+, npm, and Python 3.10+ for ETL.

```sh
npm install
npm run dev
```

The app is served at the Vite URL shown in the terminal. Map tiles use OpenStreetMap and therefore need a browser connection. Source data are checked into `public/data/`, so the rest of the interface loads offline.

## Data update

```sh
python etl/run.py              # validate local raw data and regenerate normalized GeoJSON/report
python etl/run.py --refresh    # try the published source URLs, then validate and regenerate
npm test
npm run build
```

`--refresh` keeps the previous raw file if a download fails, records the error, and still attempts to normalize the last known-good snapshot. Output is idempotent. Review `public/data/update-report.json` after each run. Do not silently treat a failed source as an empty population or entity layer.

## Data flow

```text
Munich open-data CSV + ArcGIS GeoJSON
        ↓  etl/run.py
validation (schema, 25 unique districts, WGS84 bounds, population keys)
        ↓
versioned raw snapshots + normalized district GeoJSON + institution GeoJSON
        ↓
React static data adapter → MapLibre map → source registry and indicators
```

`schema/postgis.sql` describes the future Postgres/PostGIS storage model. The current data adapter reads static GeoJSON and JSON; Vercel serves the Vite build and checked-in datasets. See [methodology](docs/methodology.md), [limitations report](docs/limitations.md), and [source registry](public/data/sources.json).

## Implemented and pending

Implemented: responsive React/Vite interface; MapLibre map; population by district; 25 administrative units; 1,192 MVV stop points in the city boundary; one TUM campus point; district filtering, stop-name search, clustered markers, layer toggles and provenance popups; source registry; reproducible normalizer; data QA tests; PostGIS schema; Vercel SPA rewrite. The OpenStreetMap raster basemap updates live as users pan and zoom; thematic layers are checked-in source snapshots.

Pending: verified inventories of technology firms/startups, labs and research institutions; transit routes, schedules and accessibility analysis; publications, patents, grants, job postings and housing data; database/API deployment; automated scheduled refresh. MVV realtime departure integration is a candidate only: MVV reports closed-beta access and the production server requires an application request. The project has not accepted terms or received credentials, so it shows no departure estimates. The current evidence does not support missing counts, so the UI reports their status rather than inventing values.
# Cerebro-Helsinki
