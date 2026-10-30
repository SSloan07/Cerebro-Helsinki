"""StatFin 115f: main activity of people aged 18-64 by citizenship, Uusimaa, 2024 (Statistics Finland).

Raw input: data/raw/statfin_115f.json. Output: public/data/employment_nationality.json.
Region level. It is citizenship, not mother tongue: the language table (115g) has no regional split.
"""
from __future__ import annotations

import json
from pathlib import Path

from ._http import jsonstat_cells, post_px

SOURCE_ID = "statfin-employment-nationality-115f"
URL = "https://pxdata.stat.fi/PxWeb/api/v1/en/StatFin/tyokay/115f.px"
YEAR = "2024"
GROUPS = {"246": "Finland", "EUR": "Europe (excluding Finland)", "AFR": "Africa", "AME": "America", "AAS": "Asia", "MUU": "Other or unknown"}
ACTIVITIES = {"SSS": "population", "11": "employed", "12": "unemployed"}
QUERY = {"query": [
    {"code": "alue_28_20250101", "selection": {"filter": "item", "values": ["MK01"]}},
    {"code": "paaasial_toimin_3_20180101", "selection": {"filter": "item", "values": list(ACTIVITIES)}},
    {"code": "kansalaisuus_26_20170101", "selection": {"filter": "item", "values": list(GROUPS)}},
    {"code": "sukupuoli_9_20180101", "selection": {"filter": "item", "values": ["SSS"]}},
    {"code": "ikaryhma_10_20180101", "selection": {"filter": "item", "values": ["18-64"]}},
    {"code": "timeperiod_y", "selection": {"filter": "item", "values": [YEAR]}},
], "response": {"format": "json-stat2"}}
RAW_NAME = "statfin_115f.json"
OUTPUT_NAME = "employment_nationality.json"


def refresh(raw_dir: Path, user_agent: str) -> None:
    (raw_dir / RAW_NAME).write_bytes(post_px(URL, QUERY, user_agent))


def _rate(part: int | None, whole: int | None) -> float | None:
    if part is None or not whole:
        return None
    return round(100 * part / whole, 1)


def build(raw_dir: Path) -> tuple[dict, dict, dict]:
    raw = json.loads((raw_dir / RAW_NAME).read_text(encoding="utf-8"))
    cube: dict[str, dict] = {group: {} for group in GROUPS}
    for row in jsonstat_cells(raw):
        value = row["value"]
        if value is not None and (not isinstance(value, int) or value < 0):
            raise ValueError(f"StatFin 115f has an invalid count {value!r}")
        cube[row["kansalaisuus_26_20170101"]][ACTIVITIES[row["paaasial_toimin_3_20180101"]]] = value
    groups = {}
    for code, cells in cube.items():
        population, employed, unemployed = cells.get("population"), cells.get("employed"), cells.get("unemployed")
        labour = None if employed is None or unemployed is None else employed + unemployed
        groups[code] = {"name": GROUPS[code], "population_18_64": population, "employed": employed, "unemployed": unemployed,
                        "employment_rate": _rate(employed, population), "unemployment_rate": _rate(unemployed, labour)}
    if groups["246"]["employment_rate"] is None:
        raise ValueError("StatFin 115f has no employment rate for Finnish citizens")
    output = {"source_id": SOURCE_ID, "region": "MK01 Uusimaa", "year": int(YEAR), "age": "18-64", "updated": raw.get("updated"), "groups": groups}
    counts = {"nationality_year": int(YEAR), "nationality_groups": len(groups)}
    registry = {
        "id": SOURCE_ID, "dataset_name": "StatFin 115f — population by area, main type of activity, citizenship, sex and age", "provider": "Statistics Finland",
        "url": "https://stat.fi/en/statistics/tyokay", "resource_url": URL,
        "period_covered": f"Year {YEAR} (end of year); table updated {str(raw.get('updated', 'unknown'))[:10]}",
        "geographic_coverage": "Region MK01 Uusimaa (includes the four municipalities and 22 others)",
        "license": "Creative Commons Attribution 4.0 International (CC BY 4.0)", "evidence_type": "observed", "confidence": "high",
        "transformation": "PxWeb json-stat2 query: ages 18-64, both sexes, by citizenship group; derived employment rate (employed / population) and unemployment rate (unemployed / labour force).",
        "limitations": "Region level, not municipality. Citizenship, not mother tongue or origin: people who naturalised count as Finnish. Statistics Finland's language table has no regional split.",
        "integration_status": "integrated", "record_count": len(groups),
        "periodo": f"Año {YEAR} (fin de año); tabla actualizada el {str(raw.get('updated', 'sin fecha'))[:10]}.",
        "limitaciones": "Nivel región (Uusimaa), no municipio. Es nacionalidad, no lengua materna ni origen: quien se naturalizó cuenta como finlandés. La tabla por lengua de StatFin no tiene desglose regional.",
    }
    return output, counts, registry
