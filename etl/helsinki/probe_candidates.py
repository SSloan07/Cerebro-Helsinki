#!/usr/bin/env python3
"""Probe candidate open-data sources and record what actually answered.

A source enters catalogo/ only after a probe opens it ("la IA propone, el enlace
dispone"). This script re-runs every probe and writes the exact outcome (HTTP
status, bytes, WFS numberMatched, error text) to data/metadata/candidate_probes.json.
Nothing here is ingested into the lake; it is evidence for the catalogue fichas.

    python3 -m etl.helsinki.probe_candidates            # stdlib probes
    python3 -m etl.helsinki.probe_candidates --overture # also query Overture via DuckDB (~2 min)
"""
from __future__ import annotations

import argparse
import datetime as dt
import gzip
import json
import re
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "data/metadata/candidate_probes.json"
USER_AGENT = "CerebroHelsinki/0.1 (open-data ETL; contact configured in README)"
CORE = "kunta%20IN%20(%27049%27,%27091%27,%27092%27,%27235%27)"
SF_WFS = "https://geo.stat.fi/geoserver/wfs?service=WFS&version=2.0.0&request=GetFeature&resultType=hits"
HSY_WFS = "https://kartta.hsy.fi/geoserver/wfs?service=WFS&version=2.0.0&request=GetFeature&resultType=hits"
HRI_BLOB = "https://avoidatastr.blob.core.windows.net/avoindata/AvoinData/3_Ilmanlaatu_ja_ilmasto/Ilmasto"
OVERTURE_RELEASE = "2026-08-19.0"
METRO_BBOX = (24.50, 60.10, 25.26, 60.42)  # west, south, east, north; wider than the four municipalities

# (catalogue id, kind, url, extra headers). kind: wfs_hits | http | json_count
PROBES = [
    ("sf-paavo-2026", "wfs_hits", f"{SF_WFS}&typeNames=postialue:pno_tilasto_2026&CQL_FILTER={CORE}", {}),
    ("sf-vaestoruutu-1km-2025", "wfs_hits", f"{SF_WFS}&typeNames=vaestoruutu:vaki2025_1km&CQL_FILTER={CORE}", {}),
    ("hsy-vaestotietoruudukko-2025", "wfs_hits", f"{HSY_WFS}&typeNames=asuminen_ja_maankaytto:Vaestotietoruudukko_2025", {}),
    ("hsy-rakennustietoruudukko-2025", "wfs_hits", f"{HSY_WFS}&typeNames=asuminen_ja_maankaytto:Rakennustietoruudukko_2025", {}),
    ("hsy-tyopaikkaruudukko-2024", "wfs_hits", f"{HSY_WFS}&typeNames=asuminen_ja_maankaytto:Tyopaikkaruudukko_2024", {}),
    ("hsy-rakennukset-paivittyva", "wfs_hits", f"{HSY_WFS}&typeNames=asuminen_ja_maankaytto:pks_rakennukset_paivittyva", {}),
    ("hsy-aurinkosahkopotentiaali", "wfs_hits", f"{HSY_WFS}&typeNames=ilmasto_ja_energia:rakennukset_aurinkosahkopotentiaali", {}),
    ("hsy-rakennukset-polttoaine", "wfs_hits", f"{HSY_WFS}&typeNames=ilmasto_ja_energia:rakennukset_polttoaine", {}),
    ("hsy-ilmanlaatu-nyt", "wfs_hits", f"{HSY_WFS}&typeNames=ilmanlaatu:Ilmanlaatu_nyt", {}),
    ("hsy-energiankulutus-pks", "http", f"{HRI_BLOB}/Energiankulutus/Paakaupunkiseudun_energiankulutus_1990_ja_2000-2025.xlsx", {}),
    ("hsy-sahkonkulutus-pks", "http", f"{HRI_BLOB}/S%C3%A4hkonkulutus/Sahkonkulutus_PKS_1990_2000-2025.xlsx", {}),
    ("hel-energia-ilmastoatlas", "http", "https://www.hel.fi/hel2/tietokeskus/data/helsinki/kaupunginkanslia/3D-malli/data_atlas.xlsx", {}),
    ("hel-3d-citydb-wfs", "http", "https://kartta.hel.fi/3d/citydb-wfs/wfs?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetCapabilities", {}),
    ("hel-3d-citygml-kalasatama", "http", "https://3d.hel.ninja/data/citygml/Helsinki3D_CityGML_Kalasatama_20190326.zip", {"Range": "bytes=0-1023"}),
    ("hel-avoindata-wfs", "http", "https://kartta.hel.fi/ws/geoserver/avoindata/wfs?service=WFS&version=2.0.0&request=GetCapabilities", {}),
    ("hel-nuuka-energia", "json_count", "https://helsinki-openapi.nuuka.cloud/api/v1.0/Property/List", {}),
    ("hel-servicemap-v2", "json_count", "https://api.hel.fi/servicemap/v2/unit/?page_size=1", {}),
    ("prh-ytj-v3", "json_count", "https://avoindata.prh.fi/opendata-ytj-api/v3/companies?location=Helsinki", {}),
    ("fmi-open-data", "http", "https://opendata.fmi.fi/wfs?service=WFS&version=2.0.0&request=getFeature&storedquery_id=fmi::observations::weather::simple&place=helsinki&parameters=t2m&maxlocations=1", {}),
    ("statfin-ashi-13mu", "http", "https://pxdata.stat.fi/PxWeb/api/v1/en/StatFin/ashi/13mu.px", {}),
    ("digitraffic-tms", "json_count", "https://tie.digitraffic.fi/api/tms/v1/stations", {"Accept-Encoding": "gzip", "Digitraffic-User": "CerebroHelsinki/EAFIT"}),
    ("ms-global-ml-buildings", "http", "https://minedbuildings.z5.web.core.windows.net/global-buildings/dataset-links.csv", {}),
    ("google-open-buildings", "http", "https://sites.research.google/gr/open-buildings/", {}),
    ("mml-maastotietokanta", "http", "https://avoin-paikkatieto.maanmittauslaitos.fi/maastotiedot/features/v1/collections/rakennus/items?limit=1", {}),
    ("eubucco", "http", "https://eubucco.com/", {}),
    ("hri-ckan-api", "http", "https://hri.fi/data/api/3/action/package_search?q=energiankulutus&rows=1", {}),
]


def probe(source_id: str, kind: str, url: str, headers: dict) -> dict:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, **headers})
    result = {"id": source_id, "kind": kind, "url": url, "probed_at": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")}
    started = time.monotonic()
    try:
        with urllib.request.urlopen(request, timeout=45) as response:
            body = response.read(12_000_000)
            if response.headers.get("Content-Encoding") == "gzip":
                body = gzip.decompress(body)
            result.update(http_status=response.status, content_type=response.headers.get("Content-Type"), bytes=len(body))
    except urllib.error.HTTPError as error:
        result.update(http_status=error.code, error=f"HTTPError: {error.code} {error.reason}")
        body = b""
    except Exception as error:  # DNS, timeout, TLS: keep the exact text for the ficha
        result.update(http_status=0, error=f"{type(error).__name__}: {error}")
        body = b""
    result["response_ms"] = round((time.monotonic() - started) * 1000)
    if body and kind == "wfs_hits":
        match = re.search(rb'numberMatched="(\d+)"', body)
        result["number_matched"] = int(match.group(1)) if match else None
    elif body and kind == "json_count":
        data = json.loads(body)
        if isinstance(data, list):
            result["record_count"] = len(data)
        else:
            result["record_count"] = data.get("count", data.get("totalResults", len(data.get("features", [])) or None))
    if body and source_id == "ms-global-ml-buildings":
        result["finland_tiles"] = body.decode("utf-8", "replace").count("\nFinland,")
    if body and source_id == "google-open-buildings":
        text = body.decode("utf-8", "replace")
        result["mentions_finland_or_europe"] = bool(re.search(r"Finland|Europe", text))
    return result


def probe_overture() -> dict:
    result = {"id": "overture-buildings", "kind": "duckdb", "release": OVERTURE_RELEASE, "bbox": METRO_BBOX,
              "probed_at": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")}
    try:
        import duckdb
    except ImportError:
        return {**result, "error": "duckdb not installed; run with a Python environment that has duckdb"}
    west, south, east, north = METRO_BBOX
    con = duckdb.connect()
    con.sql("INSTALL httpfs; LOAD httpfs; SET s3_region='us-west-2';")
    row = con.sql(f"""
        SELECT count(*), count(height), count(num_floors), max(height)
        FROM read_parquet('s3://overturemaps-us-west-2/release/{OVERTURE_RELEASE}/theme=buildings/type=building/*', hive_partitioning=1)
        WHERE bbox.xmin > {west} AND bbox.xmax < {east} AND bbox.ymin > {south} AND bbox.ymax < {north}
    """).fetchone()
    return {**result, "buildings_in_bbox": row[0], "with_height": row[1], "with_num_floors": row[2], "max_height_m": row[3]}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--overture", action="store_true", help="also query Overture Maps buildings with DuckDB")
    args = parser.parse_args()
    results = [probe(*spec) for spec in PROBES]
    if args.overture:
        results.append(probe_overture())
    for item in results:
        count = item.get("number_matched", item.get("record_count", item.get("buildings_in_bbox", "")))
        print(f"{item['id']:32} HTTP {item.get('http_status', '-')!s:>3} {count!s:>8} {item.get('error', '')}")
    OUTPUT.write_text(json.dumps({"generated_at": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
                                  "user_agent": USER_AGENT, "probes": results}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
