# Data sources

> Unified source catalogue (63 sources tested on 2026-09-21 and 2026-09-28, including failed and rejected sources with the reason for each): [catalogo-fuentes.md](catalogo-fuentes.md), with detailed fichas in [../catalogo/](../catalogo/README.md). The table below lists only what the app currently uses.

The machine-readable registry at `public/data/sources.json` records dataset, provider, source URLs, consultation date, period, geography, license, evidence type, confidence, transformation, limitations and integration state.

| Dataset | Source | Current state | Coverage |
| --- | --- | --- | --- |
| 2025 municipality boundaries | [Statistics Finland](https://stat.fi/en/services/statistical-data-services/geographic-data/statistical-areas/municipality-based-statistical-units) WFS | Integrated | Helsinki, Espoo, Vantaa, Kauniainen; generalized 1:1,000,000 |
| Static GTFS stops | [HSL Open Data](https://www.hsl.fi/en/hsl/open-data) | Integrated snapshot | 6,027 mapped boarding records; feed valid 2026-09-18–2026-11-16 |
| GTFS-Realtime vehicles | [HSL GTFS-RT documentation](https://hsldevcom.github.io/gtfs_rt/) | Integrated after a server-side Node probe: HTTP 200, protobuf v2, real VehiclePosition entities | HSL network; live endpoint, 15-second browser refresh |
| Helsinki 3D | [Helsinki 3D](https://www.hel.fi/en/decision-making/information-on-helsinki/maps-and-geospatial-data/helsinki-3d) | Official remote viewer embedded | Helsinki only |
| Public services | [Service Map API v4](https://www.hel.fi/palvelukarttaws/restpages/ver4.html) | Candidate | Endpoint/license validation pending |
| Basemap | [OpenStreetMap](https://www.openstreetmap.org/copyright) | Live raster tiles | Current viewport; ODbL attribution |
| OSM building footprints | [Overpass](https://overpass-api.de/) | Failed | Query timed out; no geometry ingested |

HSL's documented raw VehiclePosition endpoint accepts GET without parameters. The proxy sends `Accept: application/x-protobuf` and a descriptive User-Agent; no API key or browser CORS exception is used. The successful server probe metadata and retrieval timestamp are checked in at `data/metadata/hsl_gtfsrt_probe.json`. Digitransit production APIs are separate and require registration plus the `digitransit-subscription-key` header; they are not used here and no secret is required by this integration. The GTFS zip URL and exact WFS query are retained in the registry. The checked-in `consulted_at` date means source metadata was reviewed; for observed snapshots, use each dataset's version/period fields to determine freshness.
