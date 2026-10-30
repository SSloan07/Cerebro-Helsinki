# Helsinki data contract

## Static files

* `/data/municipalities.geojson`: four Feature records keyed by Statistics Finland municipal code (`049`, `091`, `092`, `235`), WGS84 geometry, reference year, normalized names and source lineage.
* `/data/transit_stops.geojson`: HSL GTFS `location_type=0` records within those municipal polygons. Stable GTFS `stop_id` is the feature id; coordinates remain WGS84 longitude/latitude. Stops outside the four municipalities are excluded.
* `/data/postal_areas.geojson`: 167 Paavo 2026 postal code areas (reference year 2024) in the four municipalities, keyed by 5-digit postal code. Fields: `postal_code`, `name_fi`, `name_sv`, `municipality_code`, `area_km2`, `residents`, `income_mean`, `income_median` (disposable monetary income of residents aged 18+, EUR/year), `household_income_mean`, `households`, `rented_households`, `rented_share` (%), `adults`, `higher_education`, `higher_education_share` (%), `employed`, `unemployed`, `unemployment_rate` (%), `jobs_total`, `jobs_by_sector` (TOL 2008 sections A–X; workplaces located in the area), `reference_year`, `source_id`. Suppressed values (-1 at source) and income in areas without residents are `null`, never 0. Built by `etl/helsinki/sources/paavo.py`.
* `/data/population.json`: StatFin 11ra population on 31 December 2025 by municipal code (`population_by_municipality`), with `reference_date`, `updated` and `source_id`. Built by `etl/helsinki/sources/poblacion.py`.
* `/data/rents.json`: StatFin 15fa average rent per m² (EUR/month, non-subsidised, all room counts) by quarter for Helsinki (`091`), Espoo-Kauniainen (`049`, published jointly), Vantaa (`092`) and Greater Helsinki (`pks`), with the number of observations. Missing cells are `null`. Built by `etl/helsinki/sources/alquiler.py`.
* `/data/earnings.json`: StatFin 15b2 earnings of full-time wage and salary earners in Uusimaa (region, not municipality), 2024: earners, mean, deciles 1 and 9, median, for total, men and women. Built by `salarios.py`.
* `/data/employment_nationality.json`: StatFin 115f population aged 18-64 in Uusimaa by citizenship group: population, employed, unemployed and derived rates. Citizenship, not mother tongue. Built by `nacionalidad.py`.
* `/data/education.json`: StatFin 11c4 students, foreign students and foreign-language students by municipal code and education sector (location of the institution), 2025. Built by `educacion.py`.
* `/data/companies.json`: PRH/YTJ company counts by municipal code (address municipality) and TOL 2008 section. Counts only: no record, name or address is stored. Cells under `min_cell` (5) are `null`. `without_activity` counts companies with no declared main business line. Built by `empresas.py`.
* `/data/land_cover.json`: HSY impermeable surface (buildings + paved roads + other impermeable surface) in km² by municipal code for the 2016, 2018, 2020, 2022 and 2024 editions. Municipality is matched by HSY's name field (the layer has no code). Built by `suelo.py`.
* `/data/sources.json`: complete source registry. Every dataset has a provider, source URLs, consultation date, period, coverage, license, evidence type, confidence, transformation, limitations and integration status.
* `/data/update-report.json`: UTC generation time, status, counts, errors, warnings and source statuses. Missing metrics are omitted or null; they must never be interpreted as zero.

## Verification

`python3 verificar.py [--lago path]` checks every published file (codes, lineage, null suppression, 0–100 shares, sector sums equal to totals, registry entries) and exits 1 on any failure. Fix the ingestion, never relax a check.

## API

* `GET /api/stops?bbox=west,south,east,north`: bbox-filtered static stop FeatureCollection, response count and snapshot time.
* `GET /api/live-mobility?bbox=west,south,east,north`: HSL GTFS-Realtime positions decoded server-side. Success returns `status: live`, feed timestamp, entity count, VehiclePosition count, positioned count, retrieval time, source, HTTP/content metadata and a GeoJSON FeatureCollection. Source or decoder failure returns `status: unavailable`, a reason, upstream HTTP status (0 means no HTTP response), retrieval time and source without a vehicle count.

* `GET /api/live-weather`: latest FMI observation at Helsinki Kaisaniemi (temperature, wind, humidity, rain, pressure) with the observation time.
* `GET /api/live-air`: HSY air quality index per measuring station (13) with HSY's own hour label and an ISO instant.
* `GET /api/live-traffic`: Digitraffic road traffic stations (collecting, inside the four municipalities, last hour fresher than 3 h): vehicles per hour and mean speed per station, plus sums per municipal code.
* `GET /api/live-trains`: next commercial departures from Helsinki Central with scheduled time, estimate, delay in minutes and cancellation.

The four live endpoints return `status: live` with `retrieved_at`, or `status: unavailable` with a `reason` and no readings. The front never keeps the previous value when a call fails.

API geometry is EPSG:4326. Vercel caches stop snapshots for one hour and live responses for five seconds. Browser refresh is 15 seconds. The live response timestamp and fetch timestamp remain separate.

## Evidence and status vocabulary

Evidence: `observed`, `derived`, `estimated`, `modelled`, `proxy`, `declared`. Integration states: `integrated`, `candidate`, `failed`, `not_available`, `pending_integration`, `partial_coverage`, `stale`, `unavailable`. `integrated` means an actual product path exists; it does not imply real-time freshness. Each displayed aggregate should point to a registry dataset and expose its transformation and limitations.

## PostGIS mapping

Use `dataset_registry` and `source_snapshot` for lineage; spatial entities have stable provider IDs and EPSG:4326 geometry. Time-dependent values belong in observations/events with source timestamps. See `schema/postgis.sql`.
