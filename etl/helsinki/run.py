#!/usr/bin/env python3
"""Reproducibly normalize Helsinki metro boundaries and HSL GTFS stops.

Default mode is offline and reads versioned inputs in data/raw. Pass --refresh to
download Statistics Finland polygons and the HSL GTFS zip (about 82 MB zipped;
only stops.txt and feed_info.txt are retained). Failed refreshes keep snapshots.
"""
from __future__ import annotations

import argparse
import csv
import datetime as dt
import hashlib
import io
import json
import math
import re
import tempfile
import urllib.request
import zipfile
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "data/raw"
PROCESSED = ROOT / "data/processed"
METADATA = ROOT / "data/metadata"
SNAPSHOTS = ROOT / "data/snapshots"
PUBLIC = ROOT / "public/data"
MUNICIPALITIES = {"049": "Espoo", "091": "Helsinki", "092": "Vantaa", "235": "Kauniainen"}
BOUNDARY_URL = "https://geo.stat.fi/geoserver/tilastointialueet/wfs?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=tilastointialueet%3Akunta1000k_2025&OUTPUTFORMAT=application%2Fjson&SRSNAME=EPSG%3A4326&CQL_FILTER=kunta%20IN%20(%27049%27%2C%27091%27%2C%27092%27%2C%27235%27)"
HSL_GTFS_URL = "https://infopalvelut.storage.hsldev.com/gtfs/hsl.zip"
HSL_USER_AGENT = "CerebroHelsinki/0.1 (open-data ETL; contact configured in README)"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def fetch_bytes(url: str, *, limit: int = 180_000_000) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": HSL_USER_AGENT})
    with urllib.request.urlopen(request, timeout=90) as response:
        if response.status != 200:
            raise ValueError(f"HTTP {response.status} from {url}")
        body = response.read(limit + 1)
    if not body or len(body) > limit:
        raise ValueError(f"Empty or over-limit response ({len(body)} bytes): {url}")
    return body


def refresh_sources() -> list[str]:
    failures = []
    for url, target in ((BOUNDARY_URL, RAW / "municipalities.geojson"),):
        try:
            body = fetch_bytes(url, limit=20_000_000)
            json.loads(body)
            target.write_bytes(body)
        except Exception as error:  # preserve latest known-good input
            failures.append(f"{url}: {type(error).__name__}: {error}")
    try:
        archive_bytes = fetch_bytes(HSL_GTFS_URL)
        with zipfile.ZipFile(io.BytesIO(archive_bytes)) as archive:
            bad = archive.testzip()
            if bad:
                raise ValueError(f"GTFS ZIP CRC failure at {bad}")
            for name in ("stops.txt", "feed_info.txt"):
                if name not in archive.namelist():
                    raise ValueError(f"HSL GTFS package missing required {name}")
            stops = archive.read("stops.txt")
            feed_info = archive.read("feed_info.txt")
            list(csv.DictReader(io.StringIO(stops.decode("utf-8-sig"))))
        (RAW / "hsl_stops.txt").write_bytes(stops)
        (RAW / "hsl_feed_info.txt").write_bytes(feed_info)
        (METADATA / "hsl_gtfs_archive.json").write_text(json.dumps({
            "url": HSL_GTFS_URL, "retrieved_at": dt.datetime.now(dt.timezone.utc).isoformat(),
            "archive_bytes": len(archive_bytes), "archive_sha256": hashlib.sha256(archive_bytes).hexdigest(),
            "retained_members": ["stops.txt", "feed_info.txt"],
            "omitted_members": ["stop_times.txt", "shapes.txt", "trips.txt", "other feed tables"],
        }, indent=2) + "\n", encoding="utf-8")
    except Exception as error:
        failures.append(f"{HSL_GTFS_URL}: {type(error).__name__}: {error}")
    return failures


def coord_rings(geometry: dict):
    """Yield polygon rings from Polygon or MultiPolygon GeoJSON."""
    kind, coordinates = geometry.get("type"), geometry.get("coordinates", [])
    polygons = [coordinates] if kind == "Polygon" else coordinates if kind == "MultiPolygon" else []
    for polygon in polygons:
        yield from polygon


def point_in_ring(lon: float, lat: float, ring: list) -> bool:
    inside = False
    for start, end in zip(ring, ring[1:]):
        x1, y1 = start[:2]
        x2, y2 = end[:2]
        if (y1 > lat) != (y2 > lat) and lon < (x2 - x1) * (lat - y1) / (y2 - y1) + x1:
            inside = not inside
    return inside


def point_in_feature(lon: float, lat: float, feature: dict) -> bool:
    geometry = feature.get("geometry", {})
    kind, coordinates = geometry.get("type"), geometry.get("coordinates", [])
    polygons = [coordinates] if kind == "Polygon" else coordinates if kind == "MultiPolygon" else []
    for polygon in polygons:
        if polygon and point_in_ring(lon, lat, polygon[0]) and not any(point_in_ring(lon, lat, ring) for ring in polygon[1:]):
            return True
    return False


def validate_boundaries(raw: dict) -> dict:
    if raw.get("type") != "FeatureCollection":
        raise ValueError("Statistics Finland response is not GeoJSON FeatureCollection")
    by_code = {}
    for feature in raw.get("features", []):
        properties = feature.get("properties", {})
        code = str(properties.get("kunta", "")).zfill(3)
        if code in by_code:
            raise ValueError(f"Duplicate municipality boundary {code}")
        if code not in MUNICIPALITIES:
            continue
        if not list(coord_rings(feature.get("geometry", {}))):
            raise ValueError(f"Missing geometry for municipality {code}")
        for ring in coord_rings(feature["geometry"]):
            if len(ring) < 4:
                raise ValueError(f"Invalid boundary ring for {code}")
            for lon, lat, *_ in ring:
                if not (-180 <= lon <= 180 and -90 <= lat <= 90):
                    raise ValueError(f"Invalid WGS84 vertex in municipality {code}")
        by_code[code] = feature
    missing = set(MUNICIPALITIES) - set(by_code)
    if missing:
        raise ValueError(f"Missing required metro municipality geometries: {sorted(missing)}")
    normalized = []
    names_by_code = {"049": ("Espoo", "Espoo", "Esbo"), "091": ("Helsinki", "Helsinki", "Helsingfors"),
                     "092": ("Vantaa", "Vantaa", "Vanda"), "235": ("Kauniainen", "Kauniainen", "Grankulla")}
    for code in sorted(MUNICIPALITIES):
        feature = by_code[code]
        name, name_fi, name_sv = names_by_code[code]
        normalized.append({"type": "Feature", "id": code, "geometry": feature["geometry"], "properties": {
            "municipality_code": code, "name": name, "name_fi": name_fi, "name_sv": name_sv,
            "reference_year": int(feature["properties"].get("vuosi", 2025)),
            "source_ids": ["fi-municipal-boundaries"], "evidence_type": "observed",
            "method": "Filtered Statistics Finland municipality polygon layer by official municipal code; source coordinates requested in EPSG:4326.",
        }})
    return {"type": "FeatureCollection", "name": "Helsinki metropolitan core municipalities", "features": normalized}


def normalize_stops(boundaries: dict) -> tuple[dict, dict]:
    feed_rows = list(csv.DictReader((RAW / "hsl_feed_info.txt").open(encoding="utf-8-sig", newline="")))
    if len(feed_rows) != 1:
        raise ValueError(f"Expected one HSL feed_info row; got {len(feed_rows)}")
    feed = feed_rows[0]
    if not re.fullmatch(r"\d{8}", feed.get("feed_start_date", "")) or not re.fullmatch(r"\d{8}", feed.get("feed_end_date", "")):
        raise ValueError("HSL GTFS feed_info has invalid service dates")
    with (RAW / "hsl_stops.txt").open(encoding="utf-8-sig", newline="") as source:
        reader = csv.DictReader(source)
        required = {"stop_id", "stop_name", "stop_lat", "stop_lon", "location_type"}
        if not required.issubset(reader.fieldnames or []):
            raise ValueError(f"HSL stops.txt schema changed: expected {sorted(required)}")
        rows = list(reader)
    ids = [row["stop_id"].strip() for row in rows]
    if any(not stop_id for stop_id in ids) or len(ids) != len(set(ids)):
        raise ValueError("GTFS stop_id values are missing or duplicated")
    features, invalid, outside, by_city = [], 0, 0, Counter()
    for row in rows:
        # Only boarding locations: GTFS location_type 0. Parent stations/entrances are
        # intentionally excluded from the stop marker count.
        if row.get("location_type", "0").strip() not in ("", "0"):
            continue
        try:
            lat, lon = float(row["stop_lat"]), float(row["stop_lon"])
        except (TypeError, ValueError):
            invalid += 1
            continue
        if not (math.isfinite(lat) and math.isfinite(lon) and -90 <= lat <= 90 and -180 <= lon <= 180):
            invalid += 1
            continue
        matches = [feature for feature in boundaries["features"] if point_in_feature(lon, lat, feature)]
        if len(matches) > 1:
            raise ValueError(f"HSL stop intersects multiple municipalities: {row['stop_id']}")
        if not matches:
            outside += 1
            continue
        municipality = matches[0]["properties"]
        by_city[municipality["municipality_code"]] += 1
        features.append({"type": "Feature", "id": row["stop_id"], "geometry": {"type": "Point", "coordinates": [lon, lat]},
            "properties": {"stop_id": row["stop_id"], "stop_code": row.get("stop_code", ""),
                "name": " ".join(row.get("stop_name", "").split()), "municipality_code": municipality["municipality_code"],
                "municipality": municipality["name"], "zone_id": row.get("zone_id", ""),
                "location_type": 0, "wheelchair_boarding": row.get("wheelchair_boarding", ""),
                "parent_station": row.get("parent_station", "").strip(), "source_id": "hsl-gtfs-stops"}})
    return {"type": "FeatureCollection", "name": "HSL boarding stop records in Helsinki, Espoo, Vantaa and Kauniainen", "features": features}, {
        "source_record_count": len(rows), "boarding_record_count": sum(row.get("location_type", "0").strip() in ("", "0") for row in rows),
        "mapped_stop_count": len(features), "invalid_coordinate_records": invalid, "outside_metro_records": outside,
        "stops_by_municipality": dict(sorted(by_city.items())), "service_period_start": feed["feed_start_date"],
        "service_period_end": feed["feed_end_date"], "feed_version": feed.get("feed_version", ""),
        "provider": feed.get("feed_publisher_name", "HSL"),
    }


def source_registry(consulted_at: str, boundaries_sha: str, stops_sha: str, counts: dict, refresh_failures: list[str]) -> dict:
    sources = [
        {"id": "fi-municipal-boundaries", "dataset_name": "Kunnat 2025 (1:1,000,000)", "provider": "Statistics Finland",
         "url": "https://stat.fi/en/services/statistical-data-services/geographic-data/statistical-areas/municipality-based-statistical-units",
         "resource_url": BOUNDARY_URL, "consulted_at": consulted_at, "period_covered": "Municipal division reference year 2025",
         "geographic_coverage": "Helsinki (091), Espoo (049), Vantaa (092), Kauniainen (235)", "license": "Creative Commons Attribution 4.0 International (CC BY 4.0)",
         "evidence_type": "observed", "confidence": "high", "transformation": "Official polygons filtered by municipal code and requested in EPSG:4326; four municipality names normalized to English display names.",
         "limitations": "This is a 1:1,000,000 generalized national statistical boundary product (not the city-scale survey boundary). It is not a neighborhood/district layer.",
         "integration_status": "integrated", "record_count": 4, "sha256": boundaries_sha},
        {"id": "hsl-gtfs-stops", "dataset_name": "HSL public transport static GTFS feed — boarding stops", "provider": "Helsinki Region Transport (HSL)",
         "url": "https://www.hsl.fi/en/hsl/open-data", "resource_url": HSL_GTFS_URL, "consulted_at": consulted_at,
         "period_covered": f"GTFS validity {counts['service_period_start']}–{counts['service_period_end']}; feed version {counts['feed_version']}",
         "geographic_coverage": "HSL source network; map subset within four core municipal polygons", "license": "Creative Commons Attribution 4.0 International (CC BY 4.0)",
         "evidence_type": "observed", "confidence": "high", "transformation": "Extracted stops.txt and feed_info.txt only from HSL GTFS ZIP; retained GTFS location_type=0 boarding points inside the four municipal polygons; converted coordinates to GeoJSON longitude/latitude.",
         "limitations": f"The complete source archive is about 82 MB zipped and more than 1 GB expanded. It is downloaded only by ETL; only the 1.1 MB stops table is versioned. Mapped {counts['mapped_stop_count']} boarding stop records; excluded {counts['outside_metro_records']} outside the four municipalities and {counts['invalid_coordinate_records']} invalid coordinates. This static feed is refreshed daily by HSL, but a local checked-in snapshot is not live.",
         "integration_status": "integrated", "record_count": counts["mapped_stop_count"], "sha256": stops_sha,
         "counts_by_municipality": counts["stops_by_municipality"]},
        {"id": "hsl-gtfs-realtime-vehicles", "dataset_name": "HSL GTFS-Realtime vehicle positions", "provider": "Helsinki Region Transport (HSL)",
         "url": "https://hsldevcom.github.io/gtfs_rt/", "resource_url": "https://realtime.hsl.fi/realtime/vehicle-positions/v2/hsl",
         "consulted_at": consulted_at, "period_covered": "Live feed; feed timestamp returned with each response",
         "geographic_coverage": "HSL region; client filters visible positions to the four municipal polygons",
         "license": "Creative Commons Attribution 4.0 International (HSL open-data terms)", "evidence_type": "observed", "confidence": "high",
         "transformation": "Serverless same-origin proxy fetches the official GTFS-RT protobuf feed, decodes VehiclePosition entities and caches responses for 5 seconds.",
         "limitations": "HSL documents vehicle position feeds at 1-second update intervals. Browser refresh is throttled to 15 seconds. Feed availability can vary; no positions are returned as zero when the endpoint fails.",
         "integration_status": "candidate", "record_count": None},
        {"id": "helsinki-3d-model", "dataset_name": "Helsinki 3D Urban Data Model and 3D Mesh", "provider": "City of Helsinki, City Survey Services",
         "url": "https://www.hel.fi/en/decision-making/information-on-helsinki/maps-and-geospatial-data/helsinki-3d",
         "resource_url": "https://kartta.hel.fi/3d/", "consulted_at": consulted_at,
         "period_covered": "City model updated by Helsinki; viewer exposes model vintage, not a live operational feed",
         "geographic_coverage": "Helsinki municipality only; not Espoo, Vantaa or Kauniainen",
         "license": "Creative Commons Attribution 4.0 International (CC BY 4.0)", "evidence_type": "observed", "confidence": "high",
         "transformation": "Official City of Helsinki 3D viewer embedded as a streamed external viewer; no model is copied or rehosted by this app.",
         "limitations": "The 3D model covers Helsinki only. The official viewer is a separate external application and may be unavailable. Local building feature selection and CityGML/3D Tiles ingestion are pending. The separate WFS query timed out during this phase.",
         "integration_status": "integrated", "record_count": None},
        {"id": "helsinki-service-map", "dataset_name": "Helsinki Service Map API v4 units and accessibility", "provider": "City of Helsinki", "url": "https://www.hel.fi/palvelukarttaws/restpages/ver4.html",
         "resource_url": "https://www.hel.fi/palvelukarttaws/rest/v4/unit/", "consulted_at": consulted_at,
         "period_covered": "Current API response; source does not declare a statistical period",
         "geographic_coverage": "API includes Helsinki, Espoo, Vantaa and Kauniainen", "license": "Unknown for redistribution through this application",
         "evidence_type": "declared", "confidence": "medium", "transformation": "No records ingested; API documented as a candidate for public services and unit accessibility.",
         "limitations": "Bulk unit endpoint exceeded the research browser's response limit and the local network timed out. API reuse license and stable per-municipality query response still require validation.",
         "integration_status": "candidate", "record_count": None},
        {"id": "osm-basemap", "dataset_name": "OpenStreetMap raster tile basemap", "provider": "OpenStreetMap contributors / OpenStreetMap Foundation",
         "url": "https://www.openstreetmap.org/copyright", "resource_url": "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
         "consulted_at": consulted_at, "period_covered": "Tiles requested for current visible map extent", "geographic_coverage": "Global raster coverage",
         "license": "Open Database License (ODbL); attribution required", "evidence_type": "observed", "confidence": "high",
         "transformation": "Requested dynamically by MapLibre for the visible viewport; not stored in the repository.",
         "limitations": "Best-effort public tile service with no SLA. Keep visible attribution and follow the tile usage policy; production scale may require another provider.",
         "integration_status": "integrated", "record_count": None},
        {"id": "osm-building-footprints", "dataset_name": "OpenStreetMap building footprints — central Helsinki candidate", "provider": "OpenStreetMap contributors",
         "url": "https://www.openstreetmap.org/copyright", "resource_url": "https://overpass.private.coffee/api/interpreter",
         "consulted_at": consulted_at, "period_covered": "Snapshot request failed; no building features ingested",
         "geographic_coverage": "Requested Helsinki core bounding box 24.90–24.98 E, 60.16–60.19 N",
         "license": "Open Database License (ODbL); attribution and share-alike apply to database derivatives",
         "evidence_type": "observed", "confidence": "low", "transformation": "None; request timed out without a response.",
         "limitations": "No OSM building geometries or heights are present in the application. A partial extrusion layer remains pending a responsive official or OSM source.",
         "integration_status": "failed", "record_count": None},
    ]
    return {"consulted_at": consulted_at, "sources": sources, "refresh_failures": refresh_failures}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--refresh", action="store_true", help="Download new official snapshots")
    args = parser.parse_args()
    for directory in (RAW, PROCESSED, METADATA, SNAPSHOTS, PUBLIC):
        directory.mkdir(parents=True, exist_ok=True)
    refresh_failures = refresh_sources() if args.refresh else []
    consulted = dt.datetime.now(dt.timezone.utc).date().isoformat()
    errors, warnings = [], []
    counts = None
    try:
        raw_municipalities = json.loads((RAW / "municipalities.geojson").read_text(encoding="utf-8"))
        municipalities = validate_boundaries(raw_municipalities)
        stops, counts = normalize_stops(municipalities)
        if counts["invalid_coordinate_records"]:
            warnings.append(f"HSL stops with invalid coordinates excluded: {counts['invalid_coordinate_records']}")
        if counts["outside_metro_records"]:
            warnings.append(f"HSL boarding stops outside the four selected municipalities excluded: {counts['outside_metro_records']}")
        (PROCESSED / "municipalities.geojson").write_text(json.dumps(municipalities, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
        (PROCESSED / "transit_stops.geojson").write_text(json.dumps(stops, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
        for name in ("municipalities.geojson", "transit_stops.geojson"):
            (PUBLIC / name).write_bytes((PROCESSED / name).read_bytes())
    except Exception as error:
        errors.append(f"normalization: {type(error).__name__}: {error}")
    if refresh_failures:
        warnings.extend(f"Source refresh failed; retained the previous snapshot: {failure}" for failure in refresh_failures)
    registry = source_registry(consulted, sha256(RAW / "municipalities.geojson"), sha256(RAW / "hsl_stops.txt"), counts or {
        "service_period_start": "unknown", "service_period_end": "unknown", "feed_version": "unknown", "mapped_stop_count": 0,
        "outside_metro_records": 0, "invalid_coordinate_records": 0, "stops_by_municipality": {},
    }, refresh_failures)
    (PUBLIC / "sources.json").write_text(json.dumps(registry, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    report = {"generated_at": dt.datetime.now(dt.timezone.utc).isoformat(),
              "status": "failed" if counts is None else "partial" if errors or refresh_failures or any(s["integration_status"] in ("candidate", "failed", "not_available") for s in registry["sources"]) else "ok",
              "counts": counts, "errors": errors, "warnings": warnings,
              "notes": ["Population, buildings, local 3D tiles, services, climate, energy, innovation institutions and research are not counted unless integrated from verified sources.",
                        "HSL GTFS stop snapshots are static. The vehicle-position API adapter is implemented separately and depends on deployment runtime."],
              "source_statuses": {source["id"]: source["integration_status"] for source in registry["sources"]}}
    (PUBLIC / "update-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    snapshot_path = SNAPSHOTS / f"{consulted}.json"
    prior_paths = sorted(path for path in SNAPSHOTS.glob("*.json") if path != snapshot_path)
    prior = json.loads(prior_paths[-1].read_text(encoding="utf-8")) if prior_paths else None
    municipality_output = PROCESSED / "municipalities.geojson"
    stops_output = PROCESSED / "transit_stops.geojson"
    outputs = {
        "municipalities.geojson": {"sha256": sha256(municipality_output), "record_count": len(municipalities["features"]) if counts else None},
        "transit_stops.geojson": {"sha256": sha256(stops_output), "record_count": counts["mapped_stop_count"] if counts else None,
                                  "invalid_record_count": counts["invalid_coordinate_records"] if counts else None},
    }
    snapshot = {"generated_at": report["generated_at"], "status": report["status"],
                "inputs": {"municipalities.geojson": {"sha256": sha256(RAW / "municipalities.geojson"), "bytes": (RAW / "municipalities.geojson").stat().st_size},
                           "hsl_stops.txt": {"sha256": sha256(RAW / "hsl_stops.txt"), "bytes": (RAW / "hsl_stops.txt").stat().st_size}},
                "outputs": outputs,
                "change_from_previous_snapshot": None if not prior else {
                    "snapshot_date": prior.get("generated_at", "unknown")[:10],
                    "municipality_count_delta": (outputs["municipalities.geojson"]["record_count"] or 0) - (prior.get("outputs", {}).get("municipality_count") or prior.get("outputs", {}).get("municipalities.geojson", {}).get("record_count") or 0),
                    "hsl_stop_count_delta": (outputs["transit_stops.geojson"]["record_count"] or 0) - (prior.get("outputs", {}).get("hsl_stop_count") or prior.get("outputs", {}).get("transit_stops.geojson", {}).get("record_count") or 0),
                    "municipality_geometry_changed": outputs["municipalities.geojson"]["sha256"] != prior.get("outputs", {}).get("municipalities.geojson", {}).get("sha256"),
                    "stops_dataset_changed": outputs["transit_stops.geojson"]["sha256"] != prior.get("outputs", {}).get("transit_stops.geojson", {}).get("sha256"),
                }}
    (SNAPSHOTS / f"{consulted}.json").write_text(json.dumps(snapshot, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if errors:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
