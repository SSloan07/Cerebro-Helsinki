"""HSY land cover (maanpeite): impermeable surface by municipality and year.

Impermeable surface = buildings + paved roads + other impermeable surface (HSY classes
rakennus, paallystetty_tie, muu_vetta_lapaisematon_pinta). HSY publishes one WFS layer per class
and year, with polygon area p_ala_m2 and the municipality name. The refresh downloads the
attributes only (no geometry) and keeps the summed area per municipality, so the raw input is
small and rebuilds the same output.

Raw input: data/raw/hsy_land_cover.json. Output: public/data/land_cover.json.
"""
from __future__ import annotations

import datetime as dt
import json
import urllib.parse
from pathlib import Path

from ._http import get_json

SOURCE_ID = "hsy-land-cover"
WFS = "https://kartta.hsy.fi/geoserver/wfs"
RAW_NAME = "hsy_land_cover.json"
OUTPUT_NAME = "land_cover.json"
URL = WFS + "?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=asuminen_ja_maankaytto:maanpeite_<clase>_<año>"
YEARS = (2016, 2018, 2020, 2022, 2024)
CLASSES = {"rakennus": "buildings", "paallystetty_tie": "paved_roads", "muu_vetta_lapaisematon_pinta": "other_impermeable"}
NAMES = {"Helsinki": "091", "Espoo": "049", "Vantaa": "092", "Kauniainen": "235"}


def _layer_url(layer: str) -> str:
    return WFS + "?" + urllib.parse.urlencode({
        "SERVICE": "WFS", "VERSION": "2.0.0", "REQUEST": "GetFeature", "TYPENAMES": f"asuminen_ja_maankaytto:{layer}",
        "OUTPUTFORMAT": "application/json", "PROPERTYNAME": "kunta,p_ala_m2"})


def refresh(raw_dir: Path, user_agent: str) -> None:
    layers: dict[str, dict] = {}
    for year in YEARS:
        for hsy_class in CLASSES:
            layer = f"maanpeite_{hsy_class}_{year}"
            document = get_json(_layer_url(layer), user_agent, limit=150_000_000, timeout=300)
            area: dict[str, float] = {}
            features: dict[str, int] = {}
            for feature in document["features"]:
                properties = feature["properties"]
                municipality, square_metres = properties.get("kunta"), properties.get("p_ala_m2")
                if municipality not in NAMES:
                    continue
                if not isinstance(square_metres, (int, float)) or square_metres < 0:
                    raise ValueError(f"{layer}: invalid p_ala_m2 {square_metres!r}")
                if square_metres == 0:  # HSY ships a few degenerate polygons with zero area (found in paallystetty_tie_2018); they add nothing
                    continue
                area[municipality] = area.get(municipality, 0.0) + square_metres
                features[municipality] = features.get(municipality, 0) + 1
            if not area:
                raise ValueError(f"{layer}: no feature in the four municipalities")
            layers[layer] = {"area_m2": {name: round(value, 1) for name, value in area.items()}, "features": features,
                             "features_in_layer": len(document["features"])}
    document = {"retrieved_at": dt.datetime.now(dt.timezone.utc).isoformat(), "layers": layers}
    (raw_dir / RAW_NAME).write_text(json.dumps(document, indent=1) + "\n", encoding="utf-8")


def build(raw_dir: Path) -> tuple[dict, dict, dict]:
    raw = json.loads((raw_dir / RAW_NAME).read_text(encoding="utf-8"))
    by_municipality: dict[str, dict] = {code: {} for code in NAMES.values()}
    for year in YEARS:
        for name, code in NAMES.items():
            parts = {}
            for hsy_class, label in CLASSES.items():
                layer = raw["layers"].get(f"maanpeite_{hsy_class}_{year}")
                if layer is None:
                    raise ValueError(f"Missing land-cover layer {hsy_class} {year}")
                parts[label] = round(layer["area_m2"].get(name, 0.0) / 1_000_000, 3)
            by_municipality[code][str(year)] = {**parts, "impermeable_km2": round(sum(parts.values()), 3)}
    output = {"source_id": SOURCE_ID, "retrieved_at": raw["retrieved_at"][:10], "unit": "km2", "years": list(YEARS), "by_municipality": by_municipality}
    first, last = str(YEARS[0]), str(YEARS[-1])
    counts = {"land_cover_years": list(YEARS),
              "impermeable_km2_by_municipality": {code: years[last]["impermeable_km2"] for code, years in by_municipality.items()},
              "impermeable_km2_start_by_municipality": {code: years[first]["impermeable_km2"] for code, years in by_municipality.items()}}
    registry = {
        "id": SOURCE_ID, "dataset_name": "HSY land cover (maanpeite_*) — impermeable surface 2016-2024", "provider": "HSY – Helsinki Region Environmental Services",
        "url": "https://www.hsy.fi/en/environmental-information/open-data/", "resource_url": URL,
        "period_covered": f"Editions {', '.join(map(str, YEARS))}; queried on {raw['retrieved_at'][:10]}",
        "geographic_coverage": "Helsinki, Espoo, Vantaa and Kauniainen (the HSY layers also cover other municipalities, which are dropped)",
        "license": "Creative Commons Attribution 4.0 International (CC BY 4.0)", "evidence_type": "observed", "confidence": "medium",
        "transformation": "Attributes of three classes (buildings, paved roads, other impermeable surface) per edition; polygon areas summed by municipality name; geometry not downloaded.",
        "limitations": "Impermeable surface is the sum of three HSY classes and excludes unpaved roads. Editions are produced from different imagery and classification runs, so small differences between years can be method changes, not construction. Municipality is matched by HSY's name field; no code is available in the layer.",
        "integration_status": "integrated", "record_count": len(NAMES) * len(YEARS),
        "periodo": f"Ediciones {', '.join(map(str, YEARS))}; consultado el {raw['retrieved_at'][:10]}.",
        "limitaciones": "La superficie impermeable es la suma de tres clases de HSY y no incluye caminos sin pavimentar. Las ediciones salen de imágenes y clasificaciones distintas: una diferencia pequeña entre años puede ser un cambio de método y no construcción nueva. El municipio se cruza por el nombre que trae HSY, porque la capa no trae código.",
    }
    return output, counts, registry
