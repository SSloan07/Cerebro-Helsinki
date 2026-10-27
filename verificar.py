#!/usr/bin/env python3
"""Verifica el lago publicado (public/data) antes de mostrarlo.

Termina con código 1 si alguna comprobación falla. No arregla nada: si algo falla,
se corrige la ingesta, nunca se afloja esta comprobación.

    python3 verificar.py                 # verifica public/data
    python3 verificar.py --lago otra/ruta  # verifica una copia (p. ej. con un dato roto a propósito)
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

MUNICIPIOS = {"049", "091", "092", "235"}
SECTORES = set("ABCDEFGHIJKLMNOPQRSTUX")
BBOX = (24.4, 59.8, 25.4, 60.6)


class Verificacion:
    def __init__(self) -> None:
        self.fallos: list[str] = []
        self.pasadas = 0

    def comprobar(self, condicion: bool, mensaje: str) -> None:
        if condicion:
            self.pasadas += 1
        else:
            self.fallos.append(mensaje)


def leer(lago: Path, nombre: str, v: Verificacion):
    try:
        return json.loads((lago / nombre).read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        v.comprobar(False, f"{nombre}: no se pudo leer ({error})")
        return None


def vertices(geometria: dict):
    poligonos = [geometria["coordinates"]] if geometria["type"] == "Polygon" else geometria["coordinates"]
    for poligono in poligonos:
        for anillo in poligono:
            yield from anillo


def verificar_municipios(lago: Path, v: Verificacion) -> None:
    datos = leer(lago, "municipalities.geojson", v)
    if not datos:
        return
    codigos = [f["properties"]["municipality_code"] for f in datos["features"]]
    v.comprobar(sorted(codigos) == sorted(MUNICIPIOS), f"municipalities: códigos {codigos}, se esperaban {sorted(MUNICIPIOS)}")


def verificar_paradas(lago: Path, v: Verificacion) -> dict | None:
    paradas = leer(lago, "transit_stops.geojson", v)
    reporte = leer(lago, "update-report.json", v)
    if not paradas or not reporte:
        return reporte
    conteos = reporte.get("counts") or {}
    v.comprobar(len(paradas["features"]) == conteos.get("mapped_stop_count"), "transit_stops: el número de paradas no coincide con update-report")
    ids = [f["id"] for f in paradas["features"]]
    v.comprobar(len(ids) == len(set(ids)), "transit_stops: hay stop_id duplicados")
    por_municipio: dict[str, int] = {}
    for f in paradas["features"]:
        por_municipio[f["properties"]["municipality_code"]] = por_municipio.get(f["properties"]["municipality_code"], 0) + 1
    v.comprobar(por_municipio == conteos.get("stops_by_municipality"), "transit_stops: el conteo por municipio no coincide con update-report")
    return reporte


def verificar_areas(lago: Path, v: Verificacion, reporte: dict | None) -> None:
    datos = leer(lago, "postal_areas.geojson", v)
    if not datos:
        return
    areas = datos["features"]
    conteos = (reporte or {}).get("counts") or {}
    v.comprobar(len(areas) == conteos.get("postal_area_count"), f"postal_areas: {len(areas)} áreas, update-report dice {conteos.get('postal_area_count')}")
    codigos = [f["id"] for f in areas]
    v.comprobar(len(codigos) == len(set(codigos)), "postal_areas: códigos postales duplicados")
    for f in areas:
        p, codigo = f["properties"], f["id"]
        v.comprobar(bool(re.fullmatch(r"\d{5}", codigo)) and p["postal_code"] == codigo, f"postal_areas {codigo}: código postal mal formado")
        v.comprobar(p["municipality_code"] in MUNICIPIOS, f"postal_areas {codigo}: municipio {p['municipality_code']} fuera del área")
        v.comprobar(p["source_id"] == "stat-fi-postal-areas-paavo" and p["reference_year"] == 2024, f"postal_areas {codigo}: linaje o año de referencia incorrecto")
        for lon, lat in vertices(f["geometry"]):
            if not (BBOX[0] <= lon <= BBOX[2] and BBOX[1] <= lat <= BBOX[3]):
                v.comprobar(False, f"postal_areas {codigo}: vértice fuera del área metropolitana ({lon}, {lat})")
                break
        # Un valor suprimido es null, nunca negativo ni cero inventado.
        for campo in ("residents", "income_mean", "income_median", "household_income_mean", "households", "adults", "jobs_total", "employed", "unemployed"):
            valor = p.get(campo)
            v.comprobar(valor is None or (isinstance(valor, int) and valor >= 0), f"postal_areas {codigo}: {campo}={valor!r} no es null ni entero ≥ 0")
        if not p.get("residents"):
            v.comprobar(p.get("income_mean") is None, f"postal_areas {codigo}: área sin residentes con ingreso {p.get('income_mean')!r} (debe ser null)")
        for campo in ("rented_share", "higher_education_share", "unemployment_rate"):
            valor = p.get(campo)
            v.comprobar(valor is None or 0 <= valor <= 100, f"postal_areas {codigo}: {campo}={valor!r} fuera de 0–100")
        sectores = p.get("jobs_by_sector") or {}
        v.comprobar(set(sectores) == SECTORES, f"postal_areas {codigo}: faltan secciones TOL en jobs_by_sector")
        if p.get("jobs_total") is not None and None not in sectores.values():
            v.comprobar(sum(sectores.values()) == p["jobs_total"], f"postal_areas {codigo}: la suma por sector ({sum(sectores.values())}) no da jobs_total ({p['jobs_total']})")
        if p.get("income_median") is not None and p.get("income_mean") is not None:
            v.comprobar(p["income_median"] < 3 * p["income_mean"], f"postal_areas {codigo}: mediana de ingreso inverosímil frente a la media")


def verificar_poblacion(lago: Path, v: Verificacion) -> None:
    datos = leer(lago, "population.json", v)
    if not datos:
        return
    valores = datos.get("population_by_municipality") or {}
    v.comprobar(set(valores) == MUNICIPIOS, f"population: municipios {sorted(valores)}")
    v.comprobar(all(isinstance(x, int) and x > 0 for x in valores.values()), "population: hay valores no positivos")
    v.comprobar(datos.get("source_id") == "statfin-population-11ra" and bool(re.fullmatch(r"\d{4}-12-31", datos.get("reference_date", ""))), "population: linaje o fecha de referencia incorrectos")
    if valores.get("091") and valores.get("235"):
        v.comprobar(valores["091"] > valores["235"], "population: Helsinki aparece con menos habitantes que Kauniainen")


def verificar_registro(lago: Path, v: Verificacion) -> None:
    registro = leer(lago, "sources.json", v)
    if not registro:
        return
    por_id = {s["id"]: s for s in registro["sources"]}
    for archivo, fuente in (("postal_areas.geojson", "stat-fi-postal-areas-paavo"), ("population.json", "statfin-population-11ra")):
        if (lago / archivo).exists():
            entrada = por_id.get(fuente)
            v.comprobar(bool(entrada) and entrada.get("integration_status") == "integrated", f"sources.json: {fuente} publicado pero no registrado como integrado")
            v.comprobar(bool(entrada and entrada.get("license") and entrada.get("consulted_at") and entrada.get("period_covered")),
                        f"sources.json: {fuente} sin licencia, fecha de prueba o vigencia")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--lago", default=str(Path(__file__).resolve().parent / "public/data"), help="carpeta del lago publicado")
    lago = Path(parser.parse_args().lago)
    v = Verificacion()
    verificar_municipios(lago, v)
    reporte = verificar_paradas(lago, v)
    verificar_areas(lago, v, reporte)
    verificar_poblacion(lago, v)
    verificar_registro(lago, v)
    for fallo in v.fallos:
        print(f"FALLA  {fallo}")
    print(f"{v.pasadas} comprobaciones pasaron, {len(v.fallos)} fallaron · lago: {lago}")
    return 1 if v.fallos else 0


if __name__ == "__main__":
    sys.exit(main())
