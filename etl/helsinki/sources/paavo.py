"""Paavo 2026: open statistics by postal code area (Statistics Finland).

Raw input: data/raw/paavo_2026.geojson (WFS postialue:pno_tilasto_2026, the four core
municipalities, EPSG:4326). Output: public/data/postal_areas.geojson with only the
fields the app uses.

Field meanings come from the official PxWeb labels (tables 12ey–12f6). The 2026 edition
holds reference year 2024: checked on 2026-10-27 by matching he_vakiy, hr_ktu, tp_tyopy
and pt_tyott for 00100 against PxWeb 2024.

Suppression: Statistics Finland publishes -1 for protected values. Areas without
residents report 0 income; that means "not applicable", not zero. Both become null.
"""
from __future__ import annotations

import json
import urllib.parse
from pathlib import Path

SOURCE_ID = "stat-fi-postal-areas-paavo"
LAYER = "postialue:pno_tilasto_2026"
URL = "https://geo.stat.fi/geoserver/wfs?" + urllib.parse.urlencode({
    "SERVICE": "WFS", "VERSION": "2.0.0", "REQUEST": "GetFeature", "TYPENAMES": LAYER,
    "OUTPUTFORMAT": "application/json", "SRSNAME": "EPSG:4326",
    "CQL_FILTER": "kunta IN ('049','091','092','235')",
})
RAW_NAME = "paavo_2026.geojson"
OUTPUT_NAME = "postal_areas.geojson"
REFERENCE_YEAR = 2024
MUNICIPALITIES = {"049", "091", "092", "235"}

# TOL 2008 sections, Paavo field per section (labels from PxWeb table 12f5).
SECTORS = {
    "A": "tp_a_maat", "B": "tp_b_kaiv", "C": "tp_c_teol", "D": "tp_d_ener", "E": "tp_e_vesi", "F": "tp_f_rake",
    "G": "tp_g_kaup", "H": "tp_h_kulj", "I": "tp_i_majo", "J": "tp_j_info", "K": "tp_k_raho", "L": "tp_l_kiin",
    "M": "tp_m_erik", "N": "tp_n_hall", "O": "tp_o_julk", "P": "tp_p_koul", "Q": "tp_q_terv", "R": "tp_r_taid",
    "S": "tp_s_muup", "T": "tp_t_koti", "U": "tp_u_kans", "X": "tp_x_tunt",
}
INCOME_FIELDS = ("hr_ktu", "hr_mtu", "tr_ktu", "tr_mtu")


def refresh(raw_dir: Path, fetch_bytes) -> None:
    body = fetch_bytes(URL, limit=30_000_000)
    data = json.loads(body)
    if data.get("type") != "FeatureCollection" or not data.get("features"):
        raise ValueError("Paavo WFS did not return a non-empty FeatureCollection")
    (raw_dir / RAW_NAME).write_bytes(body)


def _value(properties: dict, field: str, *, residents: int | None = None) -> int | None:
    value = properties.get(field)
    if value is None or value == -1:
        return None
    if not isinstance(value, (int, float)) or value < 0:
        raise ValueError(f"Unexpected Paavo value {field}={value!r} in {properties.get('postinumeroalue')}")
    if field in INCOME_FIELDS and not residents:
        return None
    return int(value)


def _share(part: int | None, total: int | None) -> float | None:
    if part is None or not total:
        return None
    return round(100 * part / total, 1)


def _round_geometry(geometry: dict) -> dict:
    def walk(node):
        return [walk(item) for item in node] if isinstance(node[0], list) else [round(node[0], 5), round(node[1], 5)]
    return {"type": geometry["type"], "coordinates": walk(geometry["coordinates"])}


def build(raw_dir: Path) -> tuple[dict, dict, dict]:
    raw = json.loads((raw_dir / RAW_NAME).read_text(encoding="utf-8"))
    features, seen = [], set()
    for feature in raw.get("features", []):
        p = feature["properties"]
        code = str(p["postinumeroalue"]).zfill(5)
        municipality = str(p["kunta"]).zfill(3)
        if municipality not in MUNICIPALITIES:
            raise ValueError(f"Postal area {code} belongs to municipality {municipality}")
        if code in seen:
            raise ValueError(f"Duplicate postal area {code}")
        if p.get("vuosi") != 2026:
            raise ValueError(f"Postal area {code} is not from the 2026 edition (vuosi={p.get('vuosi')})")
        seen.add(code)
        residents = _value(p, "he_vakiy")
        adults = _value(p, "ko_ika18y")
        higher = [_value(p, "ko_al_kork"), _value(p, "ko_yl_kork")]
        higher_total = None if None in higher else sum(higher)
        households = _value(p, "te_taly")
        employed, unemployed = _value(p, "pt_tyoll"), _value(p, "pt_tyott")
        labour = None if employed is None or unemployed is None else employed + unemployed
        jobs = {letter: _value(p, field) for letter, field in SECTORS.items()}
        features.append({"type": "Feature", "id": code, "geometry": _round_geometry(feature["geometry"]), "properties": {
            "postal_code": code, "name_fi": p.get("nimi"), "name_sv": p.get("namn"), "municipality_code": municipality,
            "area_km2": round(p["pinta_ala"] / 1_000_000, 3),
            "residents": residents,
            "income_mean": _value(p, "hr_ktu", residents=residents),
            "income_median": _value(p, "hr_mtu", residents=residents),
            "household_income_mean": _value(p, "tr_ktu", residents=residents),
            "households": households,
            "rented_households": _value(p, "te_vuok_as"),
            "rented_share": _share(_value(p, "te_vuok_as"), households),
            "adults": adults,
            "higher_education": higher_total,
            "higher_education_share": _share(higher_total, adults),
            "employed": employed, "unemployed": unemployed,
            "unemployment_rate": _share(unemployed, labour),
            "jobs_total": _value(p, "tp_tyopy"),
            "jobs_by_sector": jobs,
            "reference_year": REFERENCE_YEAR, "source_id": SOURCE_ID,
        }})
    features.sort(key=lambda feature: feature["id"])
    by_municipality: dict[str, int] = {}
    for feature in features:
        code = feature["properties"]["municipality_code"]
        by_municipality[code] = by_municipality.get(code, 0) + 1
    suppressed = sum(1 for f in features for key, value in f["properties"].items()
                     if value is None and key in ("income_mean", "rented_share", "higher_education_share", "unemployment_rate"))
    output = {"type": "FeatureCollection", "name": "Paavo 2026 postal code areas, Helsinki metropolitan core", "features": features}
    counts = {"postal_area_count": len(features), "postal_areas_by_municipality": dict(sorted(by_municipality.items())),
              "postal_area_suppressed_values": suppressed, "postal_area_reference_year": REFERENCE_YEAR}
    registry = {
        "id": SOURCE_ID, "dataset_name": "Paavo 2026 — open data by postal code area (pno_tilasto_2026)",
        "provider": "Statistics Finland", "url": "https://stat.fi/en/services/statistical-data-services/paavo",
        "resource_url": URL, "period_covered": f"2026 edition; reference year {REFERENCE_YEAR} (population 31 Dec {REFERENCE_YEAR}, income and workplaces {REFERENCE_YEAR})",
        "geographic_coverage": f"{len(features)} postal code areas in Helsinki, Espoo, Vantaa and Kauniainen",
        "license": "Creative Commons Attribution 4.0 International (CC BY 4.0)", "evidence_type": "observed", "confidence": "high",
        "transformation": "WFS filtered by municipal code; kept population, disposable income, tenure, education, main activity and workplaces by TOL section; derived rented share, higher-education share and unemployment rate; coordinates rounded to 5 decimals.",
        "limitations": "Postal code areas are not neighbourhoods or administrative units. Income is disposable monetary income of residents aged 18+, measured where people live, not a wage. Values suppressed by Statistics Finland (-1) and income in areas without residents are published as null, never as zero.",
        "integration_status": "integrated", "record_count": len(features),
        "periodo": f"Edición 2026, año de referencia {REFERENCE_YEAR} (población al 31-12-{REFERENCE_YEAR}; ingreso y empleos de {REFERENCE_YEAR}). Verificado contra las tablas PxWeb 12ey, 12f1, 12f5 y 12f6.",
        "limitaciones": "Las áreas postales no son barrios ni unidades administrativas. El ingreso es ingreso monetario disponible de residentes de 18 años o más, medido donde viven, no un salario. Los valores suprimidos por Statistics Finland (-1) y el ingreso de áreas sin residentes se publican como vacíos, nunca como cero.",
    }
    return output, counts, registry
