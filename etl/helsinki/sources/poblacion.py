"""StatFin 11ra: population of each municipality on 31 December (Statistics Finland).

Raw input: data/raw/statfin_11ra.json (PxWeb json-stat2). Output: public/data/population.json.
The query is the one recorded in docs/catalogo/fuentes.json (statfin-population-11ra).
"""
from __future__ import annotations

import json
import urllib.request
from pathlib import Path

SOURCE_ID = "statfin-population-11ra"
URL = "https://pxdata.stat.fi/PxWeb/api/v1/en/StatFin/vaerak/11ra.px"
YEAR = "2025"
CODES = {"KU091": "091", "KU049": "049", "KU092": "092", "KU235": "235"}
QUERY = {"query": [
    {"code": "alue_23_20260101", "selection": {"filter": "item", "values": list(CODES)}},
    {"code": "contentscode", "selection": {"filter": "item", "values": ["vaerak-vaesto"]}},
    {"code": "timeperiod_y", "selection": {"filter": "item", "values": [YEAR]}},
], "response": {"format": "json-stat2"}}
RAW_NAME = "statfin_11ra.json"
OUTPUT_NAME = "population.json"


def refresh(raw_dir: Path, user_agent: str) -> None:
    request = urllib.request.Request(URL, data=json.dumps(QUERY).encode(), method="POST",
                                     headers={"Content-Type": "application/json", "User-Agent": user_agent})
    with urllib.request.urlopen(request, timeout=90) as response:
        if response.status != 200:
            raise ValueError(f"HTTP {response.status} from {URL}")
        body = response.read(2_000_000)
    json.loads(body)
    (raw_dir / RAW_NAME).write_bytes(body)


def build(raw_dir: Path) -> tuple[dict, dict, dict]:
    raw = json.loads((raw_dir / RAW_NAME).read_text(encoding="utf-8"))
    areas = raw["dimension"]["alue_23_20260101"]["category"]["index"]
    order = sorted(areas, key=areas.get) if isinstance(areas, dict) else areas
    if set(order) != set(CODES) or len(raw["value"]) != len(order):
        raise ValueError(f"StatFin 11ra returned unexpected areas: {order}")
    values = {}
    for area, value in zip(order, raw["value"]):
        if not isinstance(value, int) or value <= 0:
            raise ValueError(f"StatFin 11ra population for {area} is not a positive integer: {value!r}")
        values[CODES[area]] = value
    output = {"source_id": SOURCE_ID, "reference_date": f"{YEAR}-12-31", "updated": raw.get("updated"),
              "population_by_municipality": dict(sorted(values.items()))}
    counts = {"population_reference_date": output["reference_date"], "population_by_municipality": output["population_by_municipality"]}
    registry = {
        "id": SOURCE_ID, "dataset_name": "StatFin 11ra — key figures on population by area", "provider": "Statistics Finland",
        "url": "https://stat.fi/en/statistics/vaerak", "resource_url": URL,
        "period_covered": f"Population on 31 December {YEAR}; table updated {str(raw.get('updated', 'unknown'))[:10]}",
        "geographic_coverage": "Helsinki (091), Espoo (049), Vantaa (092), Kauniainen (235)",
        "license": "Creative Commons Attribution 4.0 International (CC BY 4.0)", "evidence_type": "observed", "confidence": "high",
        "transformation": "PxWeb json-stat2 query for the four municipal codes; values keyed by municipal code.",
        "limitations": "Official end-of-year population. Paavo postal-area population refers to 2024 and will not add up to these 2025 totals.",
        "integration_status": "integrated", "record_count": len(values),
        "periodo": f"Población al 31-12-{YEAR}; tabla actualizada el {str(raw.get('updated', 'sin fecha'))[:10]}.",
        "limitaciones": "Población oficial a fin de año. La población de Paavo por área postal es de 2024 y no suma estos totales de 2025.",
    }
    return output, counts, registry
