# Architecture

React 19 and Vite provide the single-page application. MapLibre GL JS renders the viewport map, clustered stop points, municipality polygons and optional realtime point entities. The OSM raster base layer is requested by visible map extent with persistent attribution.

Versioned GeoJSON is the initial storage layer. `etl/helsinki/run.py` handles downloads, validation, transformations, lineage and publishing. The static stop API filters by bounding box and caches for one hour; the Vercel live-mobility function fetches and decodes the provider protobuf feed server-side and caches for five seconds. Digitransit key-based APIs are not used, so no private key is exposed.

The Digital Twin view embeds Helsinki's remote 3D viewer; it does not download a massive model into the browser. Local CityGML/3D Tiles ingestion is pending. For future scale, retain viewport/bbox queries and move large geometry to simplified vector tiles or 3D Tiles with zoom-based loading. The target relational storage, lineage and event tables are in `schema/postgis.sql`.

Vercel hosts the Vite static output and `api/` Node functions. Local Vite development only serves static assets; use a Vercel runtime (or `vercel dev`) to exercise serverless endpoints. No backend deployment, PostGIS instance or scheduled ETL is provisioned yet.
