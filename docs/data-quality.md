# Data quality and update procedure

Run `python3 -m etl.helsinki.run` to revalidate local snapshots, or add `--refresh` to fetch current Statistics Finland municipality polygons and HSL GTFS. A run is idempotent and publishes GeoJSON plus `public/data/sources.json`, `public/data/update-report.json` and a date-keyed JSON snapshot.

Checks include expected municipal codes, duplicate IDs, WGS84 coordinate ranges, GTFS schema and service-date syntax, source response validity and point-in-polygon ambiguity. Invalid coordinate and out-of-area counts are reported separately. A failed refresh retains known-good inputs and reports the failure. Review changes in counts, checksum, service period, license and source schema before publishing.

Never replace missing counts with zero. Unknown license stays `Unknown`; source failure remains `failed` or `unavailable`; an old snapshot must be marked stale when it no longer meets the use case. Current test suite: `npm test`; production bundle check: `npm run build`.
