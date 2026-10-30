"""PRH/YTJ open API v3: number of registered companies by town and TOL 2008 section.

Only counts leave this module. The API returns pages of company records; the refresh reduces each
record to a municipality code and a TOL division and discards the rest, so no company or person
names are stored, published or shown to an AI. Cells under 5 are published as null.

Raw input: data/raw/prh_company_counts.json. Output: public/data/companies.json.
"""
from __future__ import annotations

import datetime as dt
import json
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

SOURCE_ID = "prh-ytj-companies"
URL = "https://avoindata.prh.fi/opendata-ytj-api/v3/companies"
RAW_NAME = "prh_company_counts.json"
OUTPUT_NAME = "companies.json"
LOCATIONS = {"Helsinki": "091", "Espoo": "049", "Vantaa": "092", "Kauniainen": "235"}
MIN_CELL = 5
# TOL 2008 divisions per section (Statistics Finland).
SECTION_DIVISIONS = {
    "A": ["01", "02", "03"], "B": ["05", "06", "07", "08", "09"], "C": [f"{n:02d}" for n in range(10, 34)],
    "D": ["35"], "E": ["36", "37", "38", "39"], "F": ["41", "42", "43"], "G": ["45", "46", "47"],
    "H": ["49", "50", "51", "52", "53"], "I": ["55", "56"], "J": ["58", "59", "60", "61", "62", "63"],
    "K": ["64", "65", "66"], "L": ["68"], "M": [f"{n:02d}" for n in range(69, 76)], "N": [f"{n:02d}" for n in range(77, 83)],
    "O": ["84"], "P": ["85"], "Q": ["86", "87", "88"], "R": ["90", "91", "92", "93"], "S": ["94", "95", "96"],
    "T": ["97", "98"], "U": ["99"],
}


def _get_page(location: str, page: int, user_agent: str) -> dict:
    url = f"{URL}?{urllib.parse.urlencode({'location': location, 'page': page})}"
    last_error: Exception | None = None
    for attempt in range(5):
        try:
            request = urllib.request.Request(url, headers={"User-Agent": user_agent, "Accept": "application/json"})
            with urllib.request.urlopen(request, timeout=90) as response:
                if response.status != 200:
                    raise ValueError(f"HTTP {response.status}")
                return json.loads(response.read(8_000_000))
        except Exception as error:  # retry transient failures, then give up loudly: a partial count would be wrong
            last_error = error
            time.sleep(3 * (attempt + 1))
    raise ValueError(f"PRH page failed after retries ({url}): {last_error}")


def _summarise(page: dict) -> list[tuple[str, str | None, str | None, str | None]]:
    """Reduce each company record to (id, municipality code, TOL division, status). Names and addresses are dropped here."""
    rows = []
    for company in page.get("companies", []):
        business_id = (company.get("businessId") or {}).get("value")
        addresses = [a for a in company.get("addresses", []) if a.get("postOffices")]
        street = next((a for a in addresses if a.get("type") == 1), addresses[0] if addresses else None)
        code = str(street["postOffices"][0].get("municipalityCode")).zfill(3) if street else None
        line = company.get("mainBusinessLine") or {}
        kind = str(line.get("type") or "")
        division = kind[:2] if line.get("typeCodeSet") == "TOIMI4" and kind[:2].isdigit() else None
        rows.append((business_id, code, division, str(company.get("status"))))
    return rows


def refresh(raw_dir: Path, user_agent: str) -> None:
    """Page through the register once per town and keep only counts by address municipality code and TOL division.

    `location` is a loose text match (a search for Kauniainen also returns Espoo addresses), and
    `mainBusinessLine` is a text search too (62 also returns codes 86 and 96), so neither can be trusted
    for counting. The count is made here from each record's municipality code and exact main business line.
    """
    seen: set[str] = set()
    municipalities = {code: {"total": 0, "divisions": {}, "without_activity": 0, "status": {}} for code in LOCATIONS.values()}
    pages = 0
    with ThreadPoolExecutor(max_workers=4) as pool:
        for location in LOCATIONS:
            first = _get_page(location, 1, user_agent)
            total_results = first.get("totalResults")
            if not isinstance(total_results, int) or total_results <= 0:
                raise ValueError(f"PRH {location}: unexpected totalResults {total_results!r}")
            last_page = -(-total_results // max(len(first.get("companies", [])), 1))
            batches = [_summarise(first)] + list(pool.map(lambda number: _summarise(_get_page(location, number, user_agent)), range(2, last_page + 1)))
            pages += len(batches)
            for rows in batches:
                for business_id, code, division, status in rows:
                    if code not in municipalities or not business_id or business_id in seen:
                        continue
                    seen.add(business_id)
                    entry = municipalities[code]
                    entry["total"] += 1
                    entry["status"][status] = entry["status"].get(status, 0) + 1
                    if division is None:
                        entry["without_activity"] += 1
                    else:
                        entry["divisions"][division] = entry["divisions"].get(division, 0) + 1
    document = {"retrieved_at": dt.datetime.now(dt.timezone.utc).isoformat(), "pages_fetched": pages, "municipalities": municipalities}
    (raw_dir / RAW_NAME).write_text(json.dumps(document, indent=1) + "\n", encoding="utf-8")


def _protect(value: int) -> int | None:
    return value if value >= MIN_CELL else None


def build(raw_dir: Path) -> tuple[dict, dict, dict]:
    raw = json.loads((raw_dir / RAW_NAME).read_text(encoding="utf-8"))
    by_municipality, suppressed = {}, 0
    for location, code in LOCATIONS.items():
        entry = raw["municipalities"][code]
        total, divisions = entry["total"], entry["divisions"]
        sections = {}
        for letter, members in SECTION_DIVISIONS.items():
            count = sum(divisions.get(member, 0) for member in members)
            sections[letter] = _protect(count)
            suppressed += sections[letter] is None
        classified = sum(divisions.values())
        unknown = set(divisions) - {member for members in SECTION_DIVISIONS.values() for member in members}
        if unknown:
            raise ValueError(f"PRH {location}: main business lines outside TOL 2008 divisions: {sorted(unknown)}")
        if not isinstance(total, int) or classified + entry["without_activity"] != total or total <= 0:
            raise ValueError(f"PRH {location}: divisions ({classified}) plus companies without activity ({entry['without_activity']}) do not add up to {total!r}")
        by_municipality[code] = {"name": location, "total": total, "classified": classified, "without_activity": entry["without_activity"], "sections": sections}
    output = {"source_id": SOURCE_ID, "retrieved_at": raw["retrieved_at"][:10], "min_cell": MIN_CELL, "by_municipality": by_municipality}
    counts = {"company_count_total": sum(item["total"] for item in by_municipality.values()), "company_cells_suppressed": suppressed}
    registry = {
        "id": SOURCE_ID, "dataset_name": "PRH/YTJ open API v3 — company counts by town and TOL 2008 section", "provider": "PRH (Finnish Patent and Registration Office)",
        "url": "https://avoindata.prh.fi/en", "resource_url": URL,
        "period_covered": f"Live register queried on {raw['retrieved_at'][:10]}",
        "geographic_coverage": "Companies whose street address is in Helsinki (091), Espoo (049), Vantaa (092) or Kauniainen (235), by municipality code",
        "license": "Creative Commons Attribution 4.0 International (CC BY 4.0)", "evidence_type": "observed", "confidence": "medium",
        "transformation": f"The register is paged once per town; each company is reduced on the spot to its address municipality code and TOL 2008 main business line, deduplicated by business id, and only the counts are kept, grouped into TOL sections. Cells under {MIN_CELL} are null. No company record, name or address is stored.",
        "limitations": "Counts registered companies by the municipality of their street address, including sole traders and housing companies; it does not measure jobs or size, and the register may include companies that have stopped trading. A company with no declared main business line is counted only in the total.",
        "integration_status": "integrated", "record_count": len(by_municipality),
        "periodo": f"Registro vivo, consultado el {raw['retrieved_at'][:10]}.",
        "limitaciones": "Cuenta empresas registradas por el municipio de su dirección, incluidos empresarios individuales y sociedades de vivienda; no mide empleos ni tamaño, y el registro puede incluir empresas que ya no operan. Las que no declaran actividad principal solo cuentan en el total.",
    }
    return output, counts, registry
