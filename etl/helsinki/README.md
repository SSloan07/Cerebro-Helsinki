# Helsinki ETL

`python3 -m etl.helsinki.run` is the reproducible entry point. It currently orchestrates download, validation, transformation, publication, source registry, checksums and report generation in one auditable module for the initial two-source vertical. The following package boundaries are reserved for splitting provider-specific adapters as integrations grow:

* `sources/`: endpoint definitions, license and source metadata
* `download/`: bounded, validated downloads
* `validate/`: schema, geometry, duplicate and temporal checks
* `transform/`: normalization, spatial joins and indicators
* `publish/`: versioned GeoJSON, snapshots and reports

The raw archive is not retained: only HSL `stops.txt`, `feed_info.txt`, and the filtered Statistics Finland polygons are versioned. Refresh may temporarily download the complete HSL ZIP; checksum and retrieval metadata are written under `data/metadata/`.
