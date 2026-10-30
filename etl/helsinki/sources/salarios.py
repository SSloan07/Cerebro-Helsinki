"""StatFin 15b2: earnings of full-time wage and salary earners, Uusimaa, 2024 (Statistics Finland).

Raw input: data/raw/statfin_15b2.json. Output: public/data/earnings.json. Region level (MK01 Uusimaa),
whole economy plus the three employer sectors the table splits out. This is a wage, unlike Paavo income.
"""
from __future__ import annotations

import json
from pathlib import Path

from ._http import jsonstat_cells, post_px

SOURCE_ID = "statfin-earnings-15b2"
URL = "https://pxdata.stat.fi/PxWeb/api/v1/en/StatFin/pra/15b2.px"
YEAR = "2024"
CONTENTS = {"koko_psaaja_lkm": "earners", "koko_psaaja_kans_ka": "mean", "koko_psaaja_kans_p10": "p10",
            "koko_psaaja_kans_med": "median", "koko_psaaja_kans_p90": "p90"}
SEXES = {"SSS": "total", "1": "men", "2": "women"}
QUERY = {"query": [
    {"code": "timeperiod_y", "selection": {"filter": "item", "values": [YEAR]}},
    {"code": "alue_23_20240101", "selection": {"filter": "item", "values": ["MK01"]}},
    {"code": "sektoriluokitus_7_20230101", "selection": {"filter": "item", "values": ["S0"]}},
    {"code": "sukupuoli_9_20180101", "selection": {"filter": "item", "values": list(SEXES)}},
    {"code": "contentscode", "selection": {"filter": "item", "values": list(CONTENTS)}},
], "response": {"format": "json-stat2"}}
RAW_NAME = "statfin_15b2.json"
OUTPUT_NAME = "earnings.json"


def refresh(raw_dir: Path, user_agent: str) -> None:
    (raw_dir / RAW_NAME).write_bytes(post_px(URL, QUERY, user_agent))


def build(raw_dir: Path) -> tuple[dict, dict, dict]:
    raw = json.loads((raw_dir / RAW_NAME).read_text(encoding="utf-8"))
    values: dict[str, dict] = {name: {} for name in SEXES.values()}
    for row in jsonstat_cells(raw):
        sex, field, value = SEXES[row["sukupuoli_9_20180101"]], CONTENTS[row["contentscode"]], row["value"]
        if value is not None and (not isinstance(value, (int, float)) or value <= 0):
            raise ValueError(f"StatFin 15b2 {sex}/{field}={value!r} is not a positive number")
        values[sex][field] = value
    if values["total"].get("median") is None:
        raise ValueError("StatFin 15b2 has no median for the Uusimaa total")
    output = {"source_id": SOURCE_ID, "region": "MK01 Uusimaa", "year": int(YEAR), "unit": "EUR/month, full-time, gross total earnings",
              "updated": raw.get("updated"), "earnings": values}
    counts = {"earnings_year": int(YEAR), "earnings_median_uusimaa": values["total"]["median"]}
    registry = {
        "id": SOURCE_ID, "dataset_name": "StatFin 15b2 — earnings of full-time wage and salary earners by sector, region and sex", "provider": "Statistics Finland",
        "url": "https://stat.fi/en/statistics/pra", "resource_url": URL,
        "period_covered": f"Year {YEAR}; table updated {str(raw.get('updated', 'unknown'))[:10]}",
        "geographic_coverage": "Region MK01 Uusimaa (includes the four municipalities and 22 others)",
        "license": "Creative Commons Attribution 4.0 International (CC BY 4.0)", "evidence_type": "observed", "confidence": "high",
        "transformation": "PxWeb json-stat2 query: Uusimaa, all sectors, by sex; earner count, mean, deciles 1 and 9, median.",
        "limitations": "Region level, not municipality or postal area. Full-time wage earners only, measured by workplace region.",
        "integration_status": "integrated", "record_count": len(SEXES),
        "periodo": f"Año {YEAR}; tabla actualizada el {str(raw.get('updated', 'sin fecha'))[:10]}.",
        "limitaciones": "Nivel región (Uusimaa), no municipio ni área postal. Solo asalariados de jornada completa, medidos por región del lugar de trabajo.",
    }
    return output, counts, registry
