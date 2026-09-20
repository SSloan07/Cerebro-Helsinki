# Helsinki data contract

## Static files

* `/data/municipalities.geojson`: four Feature records keyed by Statistics Finland municipal code (`049`, `091`, `092`, `235`), WGS84 geometry, reference year, normalized names and source lineage.
* `/data/transit_stops.geojson`: HSL GTFS `location_type=0` records within those municipal polygons. Stable GTFS `stop_id` is the feature id; coordinates remain WGS84 longitude/latitude. Stops outside the four municipalities are excluded.
* `/data/sources.json`: complete source registry. Every dataset has a provider, source URLs, consultation date, period, coverage, license, evidence type, confidence, transformation, limitations and integration status.
* `/data/update-report.json`: UTC generation time, status, counts, errors, warnings and source statuses. Missing metrics are omitted or null; they must never be interpreted as zero.

## API

* `GET /api/stops?bbox=west,south,east,north`: bbox-filtered static stop FeatureCollection, response count and snapshot time.
* `GET /api/live-mobility?bbox=west,south,east,north`: HSL GTFS-Realtime positions decoded server-side. Success returns `status: live`, feed timestamp, entity count, VehiclePosition count, positioned count, retrieval time, source, HTTP/content metadata and a GeoJSON FeatureCollection. Source or decoder failure returns `status: unavailable`, a reason, upstream HTTP status (0 means no HTTP response), retrieval time and source without a vehicle count.

API geometry is EPSG:4326. Vercel caches stop snapshots for one hour and live responses for five seconds. Browser refresh is 15 seconds. The live response timestamp and fetch timestamp remain separate.

## Evidence and status vocabulary

Evidence: `observed`, `derived`, `estimated`, `modelled`, `proxy`, `declared`. Integration states: `integrated`, `candidate`, `failed`, `not_available`, `pending_integration`, `partial_coverage`, `stale`, `unavailable`. `integrated` means an actual product path exists; it does not imply real-time freshness. Each displayed aggregate should point to a registry dataset and expose its transformation and limitations.

## PostGIS mapping

Use `dataset_registry` and `source_snapshot` for lineage; spatial entities have stable provider IDs and EPSG:4326 geometry. Time-dependent values belong in observations/events with source timestamps. See `schema/postgis.sql`.
