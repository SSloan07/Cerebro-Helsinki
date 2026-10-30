"""StatFin 15fa: average rent per square metre by city, quarterly (Statistics Finland).

Raw input: data/raw/statfin_15fa.json (PxWeb json-stat2). Output: public/data/rents.json.
Areas: Helsinki (091), Espoo-Kauniainen (049, published jointly by Statistics Finland), Vantaa (092)
and the Greater Helsinki total (pks). Non-subsidised dwellings, all room counts.
A missing cell is null, never zero.
"""
from __future__ import annotations

import json
from pathlib import Path

from ._http import jsonstat_cells, post_px

SOURCE_ID = "statfin-rents-15fa"
URL = "https://pxdata.stat.fi/PxWeb/api/v1/en/StatFin/asvu/15fa.px"
AREAS = {"091": "Helsinki", "049": "Espoo-Kauniainen", "092": "Vantaa", "pks": "Greater Helsinki"}
QUARTERS = ["2025Q1", "2025Q2", "2025Q3", "2025Q4", "2026Q1", "2026Q2", "2026Q3"]
QUERY = {"query": [
    {"code": "alue_44_20260101", "selection": {"filter": "item", "values": list(AREAS)}},
    {"code": "rahoitus_2_20260101", "selection": {"filter": "item", "values": ["1"]}},
    {"code": "huoneluku_5_20260101", "selection": {"filter": "item", "values": ["SSS"]}},
    {"code": "timeperiod_q", "selection": {"filter": "item", "values": QUARTERS}},
    {"code": "contentscode", "selection": {"filter": "item", "values": ["asvu_keskineliovuokra", "asvu_keskineliovuokra_lkm"]}},
], "response": {"format": "json-stat2"}}
RAW_NAME = "statfin_15fa.json"
OUTPUT_NAME = "rents.json"


def refresh(raw_dir: Path, user_agent: str) -> None:
    (raw_dir / RAW_NAME).write_bytes(post_px(URL, QUERY, user_agent))


def build(raw_dir: Path) -> tuple[dict, dict, dict]:
    raw = json.loads((raw_dir / RAW_NAME).read_text(encoding="utf-8"))
    series: dict[str, dict[str, dict]] = {code: {} for code in AREAS}
    for row in jsonstat_cells(raw):
        area, quarter, content, value = row["alue_44_20260101"], row["timeperiod_q"], row["contentscode"], row["value"]
        if area not in series:
            raise ValueError(f"StatFin 15fa returned unexpected area {area}")
        if value is not None and (not isinstance(value, (int, float)) or value <= 0):
            raise ValueError(f"StatFin 15fa {area} {quarter} {content}={value!r} is not a positive number")
        cell = series[area].setdefault(quarter, {"eur_per_m2": None, "observations": None})
        cell["eur_per_m2" if content == "asvu_keskineliovuokra" else "observations"] = value
    latest = max((quarter for cells in series.values() for quarter, cell in cells.items() if cell["eur_per_m2"] is not None), default=None)
    if latest is None:
        raise ValueError("StatFin 15fa has no rent value")
    output = {"source_id": SOURCE_ID, "unit": "EUR/m2/month", "funding": "non-subsidised", "rooms": "all",
              "updated": raw.get("updated"), "latest_quarter": latest,
              "area_names": AREAS, "series": {area: dict(sorted(cells.items())) for area, cells in series.items()}}
    counts = {"rent_latest_quarter": latest, "rent_areas": len(AREAS)}
    registry = {
        "id": SOURCE_ID, "dataset_name": "StatFin 15fa — rent index and average rents per square metre", "provider": "Statistics Finland",
        "url": "https://stat.fi/en/statistics/asvu", "resource_url": URL,
        "period_covered": f"Quarterly, {QUARTERS[0]} to {latest}; table updated {str(raw.get('updated', 'unknown'))[:10]}",
        "geographic_coverage": "Helsinki (091), Espoo-Kauniainen (049, joint), Vantaa (092), Greater Helsinki",
        "license": "Creative Commons Attribution 4.0 International (CC BY 4.0)", "evidence_type": "observed", "confidence": "high",
        "transformation": "PxWeb json-stat2 query: non-subsidised dwellings, all room counts; average rent per m2 and number of observations.",
        "limitations": "City level, not postal area. Espoo and Kauniainen are published together. Free-market contracts only; it is the average of existing contracts, not an asking price.",
        "integration_status": "integrated", "record_count": sum(len(cells) for cells in series.values()),
        "periodo": f"Trimestral, {QUARTERS[0]} a {latest}; tabla actualizada el {str(raw.get('updated', 'sin fecha'))[:10]}.",
        "limitaciones": "Nivel ciudad, no área postal. Espoo y Kauniainen se publican juntas. Solo vivienda de mercado libre; es el promedio de contratos vigentes, no el precio de oferta.",
    }
    return output, counts, registry

