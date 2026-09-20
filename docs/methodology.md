# Methodology

## Spatial coverage and transit snapshot

Statistics Finland's WFS municipality layer `kunta1000k_2025` is queried for municipal codes 049 (Espoo), 091 (Helsinki), 092 (Vantaa) and 235 (Kauniainen), with output requested in EPSG:4326. The ETL validates the four required geometries, unique codes and coordinate ranges, then normalizes English display names while preserving the source codes and Finnish/Swedish names.

HSL's public GTFS ZIP is downloaded as a source snapshot. ETL extracts `stops.txt` and `feed_info.txt` only, validates schema, unique stop IDs, coordinate validity and feed dates. Only `location_type=0` records (boarding locations) are selected. A point-in-polygon join assigns a municipality; boundary ambiguity is rejected; outside points are counted and excluded. No geocoding or interpolation is used. GeoJSON coordinates are longitude, latitude.

The displayed count (6,027) is a derived count of observed GTFS boarding-stop records inside the four polygons for this snapshot. It is not a station count, population statistic, ridership measure or accessibility score.

## Realtime adapter

The same-origin Vercel function fetches HSL's documented raw GTFS-Realtime protobuf vehicle-position feed. A small decoder reads the feed header timestamp and vehicle entities, then the function filters by requested bounding box and returns the provider and retrieval timestamps separately. It caches for five seconds. The browser refresh is limited to 15 seconds. Invalid bounding boxes, source errors and decode errors return `unavailable`; no fallback to scheduled or cached points is labelled as live. A running deployed API response is still required before status changes from `candidate`.

## 3D and evidence classes

The Digital Twin page embeds Helsinki's official viewer and links back to the city model source. This is an external city application rather than locally ingested geometry. No building-level indicator is derived from it.

`observed` is directly published source content; `derived` is a reproducible transformation/count; `estimated` and `modelled` require disclosed model assumptions; `proxy` is an indirect measurement; `declared` is provider metadata or a published service description. A dataset status describes integration, not truth or quality by itself. No composite score is calculated.

## Quality and refresh

The ETL can validate the checked-in snapshot offline or fetch current boundaries and GTFS with `--refresh`. It writes raw input metadata, processed GeoJSON, Vercel-served copies, checksums, source registry, report and dated snapshot. Failed refresh retains last known-good raw data and records the error. Tests cover municipal codes, coordinate ranges, stop IDs, source lineage, missing indicator behavior, protobuf decoding, bbox filtering and unavailable live-feed behavior.
