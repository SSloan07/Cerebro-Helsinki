"""StatFin 11c4: students by location of the institution and sector (Statistics Finland).

Raw input: data/raw/statfin_11c4.json. Output: public/data/education.json. Replaces Vipunen for
municipal figures: Vipunen's datasets carry the institution's name, not a municipality code.
"""
from __future__ import annotations

import json
from pathlib import Path

from ._http import jsonstat_cells, post_px

SOURCE_ID = "statfin-education-11c4"
URL = "https://pxdata.stat.fi/PxWeb/api/v1/en/StatFin/opiskt/11c4.px"
YEAR = "2025"
CODES = {"KU091": "091", "KU049": "049", "KU092": "092", "KU235": "235"}
SECTORS = {"10": "comprehensive", "20": "upper_secondary", "30": "vocational", "40": "applied_sciences", "50": "university"}
CONTENTS = {"op_4a": "students", "ulko_4": "foreign_students", "vko_4": "foreign_language_students"}
QUERY = {"query": [
    {"code": "timeperiod_y", "selection": {"filter": "item", "values": [YEAR]}},
    {"code": "alue_23_20250101", "selection": {"filter": "item", "values": list(CODES)}},
    {"code": "ksektori_4_20150101", "selection": {"filter": "item", "values": list(SECTORS)}},
    {"code": "contentscode", "selection": {"filter": "item", "values": list(CONTENTS)}},
], "response": {"format": "json-stat2"}}
RAW_NAME = "statfin_11c4.json"
OUTPUT_NAME = "education.json"


def refresh(raw_dir: Path, user_agent: str) -> None:
    (raw_dir / RAW_NAME).write_bytes(post_px(URL, QUERY, user_agent))


def build(raw_dir: Path) -> tuple[dict, dict, dict]:
    raw = json.loads((raw_dir / RAW_NAME).read_text(encoding="utf-8"))
    by_municipality: dict[str, dict] = {code: {sector: {} for sector in SECTORS.values()} for code in CODES.values()}
    for row in jsonstat_cells(raw):
        value = row["value"]
        if value is not None and (not isinstance(value, int) or value < 0):
            raise ValueError(f"StatFin 11c4 has an invalid count {value!r}")
        by_municipality[CODES[row["alue_23_20250101"]]][SECTORS[row["ksektori_4_20150101"]]][CONTENTS[row["contentscode"]]] = value
    if not any(cell.get("students") for sectors in by_municipality.values() for cell in sectors.values()):
        raise ValueError("StatFin 11c4 has no student count")
    output = {"source_id": SOURCE_ID, "year": int(YEAR), "basis": "location of the educational institution", "updated": raw.get("updated"),
              "by_municipality": by_municipality}
    counts = {"education_year": int(YEAR)}
    registry = {
        "id": SOURCE_ID, "dataset_name": "StatFin 11c4 — students and qualifications of educational institutions by region and sector", "provider": "Statistics Finland",
        "url": "https://stat.fi/en/statistics/opiskt", "resource_url": URL,
        "period_covered": f"Year {YEAR}; table updated {str(raw.get('updated', 'unknown'))[:10]}",
        "geographic_coverage": "Helsinki (091), Espoo (049), Vantaa (092), Kauniainen (235)",
        "license": "Creative Commons Attribution 4.0 International (CC BY 4.0)", "evidence_type": "observed", "confidence": "high",
        "transformation": "PxWeb json-stat2 query: students, foreign students and foreign-language students for five education sectors in the four municipalities.",
        "limitations": "Counts students where the institution is, not where they live. Foreign students are those with foreign citizenship; foreign-language students speak a mother tongue other than Finnish, Swedish or Sami. Small cells can be empty.",
        "integration_status": "integrated", "record_count": len(CODES) * len(SECTORS),
        "periodo": f"Año {YEAR}; tabla actualizada el {str(raw.get('updated', 'sin fecha'))[:10]}.",
        "limitaciones": "Cuenta a los estudiantes donde está la institución, no donde viven. «Extranjeros» tienen nacionalidad extranjera; «de lengua extranjera» hablan una lengua materna distinta del finés, el sueco y el sami. Las celdas pequeñas pueden venir vacías.",
    }
    return output, counts, registry
