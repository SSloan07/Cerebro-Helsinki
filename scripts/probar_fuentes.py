#!/usr/bin/env python3
"""Prueba cada fuente de docs/catalogo/fuentes.json y regenera las fichas.

Uso:
  python3 scripts/probar_fuentes.py               # prueba todas y regenera docs/catalogo/
  python3 scripts/probar_fuentes.py --id fmi-weather --id hsy-buildings
  python3 scripts/probar_fuentes.py --solo-render # sin red: regenera fichas con la última prueba
  python3 scripts/probar_fuentes.py --estricto    # sale con 1 si falla una fuente integrada

Solo usa la biblioteca estándar. La evidencia guardada son conteos, fechas y
valores agregados: nunca registros individuales ni campos de contacto.
"""

import argparse
import datetime as dt
import gzip
import json
import re
import socket
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
CATALOGO = RAIZ / "docs" / "catalogo"
FUENTES = CATALOGO / "fuentes.json"
PRUEBAS = CATALOGO / "pruebas"
FICHAS = CATALOGO / "fichas"
USER_AGENT = "CerebroHelsinki-catalog-probe/0.1 (EAFIT course; +https://github.com)"
TIMEOUT = 30
MAX_BYTES = 8 * 1024 * 1024
SEMAFORO = {"verde": "🟢 verde", "amarillo": "🟡 amarillo", "rojo": "🔴 rojo"}


def ruta_json(dato, ruta):
    for parte in ruta.split("."):
        if isinstance(dato, list):
            dato = dato[int(parte)]
        else:
            dato = dato[parte]
    return dato


def extraer(tipo, arg, cuerpo):
    """Devuelve un dict pequeño de evidencia; nunca registros completos."""
    texto = cuerpo.decode("utf-8", errors="replace")
    if tipo in ("estado", "cabeceras", "tcp"):
        return {}
    if tipo == "json_ruta":
        return {arg: ruta_json(json.loads(texto), arg)}
    if tipo == "json_largo":
        dato = json.loads(texto)
        if arg:
            dato = ruta_json(dato, arg)
        return {"elementos": len(dato)}
    if tipo == "regex_cuenta":
        return {"coincidencias": len(re.findall(re.escape(arg), texto))}
    if tipo == "regex_ultimo":
        hallados = re.findall(arg, texto)
        return {"ultimo": hallados[-1] if hallados else None}
    if tipo == "contiene":
        return {"contiene_" + arg: arg.lower() in texto.lower()}
    if tipo == "jsonstat":
        dato = json.loads(texto)
        etiquetas = dato["dimension"][arg]["category"]["label"]
        indice = dato["dimension"][arg]["category"]["index"]
        orden = sorted(indice, key=indice.get)
        return {
            "valores": {etiquetas[k]: v for k, v in zip(orden, dato["value"])},
            "actualizado": dato.get("updated"),
        }
    if tipo == "eurostat_ultimo":
        dato = json.loads(texto)
        tiempos = dato["dimension"]["time"]["category"]["index"]
        inverso = {v: k for k, v in tiempos.items()}
        ultimo = max(dato["value"], key=int)
        return {"periodo": inverso[int(ultimo)], "valor": dato["value"][ultimo], "actualizado": dato.get("updated")}
    if tipo == "wikidata":
        fila = json.loads(texto)["results"]["bindings"][0]
        return {"valor": fila["p"]["value"], "fecha": fila["t"]["value"]}
    if tipo == "fmi_ultimo":
        tiempos = re.findall(r"<BsWfs:Time>([^<]+)</BsWfs:Time>", texto)
        valores = re.findall(r"<BsWfs:ParameterValue>([^<]+)</BsWfs:ParameterValue>", texto)
        validos = [(t, v) for t, v in zip(tiempos, valores) if v != "NaN"]
        if not validos:
            raise ValueError("sin observaciones válidas en la respuesta")
        return {"observaciones": len(validos), "ultimo_tiempo": validos[-1][0], "ultimo_valor": validos[-1][1]}
    raise ValueError(f"extractor desconocido: {tipo}")


def error_semantico(cuerpo):
    """Un HTTP 200 con una excepción OGC dentro no es un éxito."""
    texto = cuerpo[:4000].decode("utf-8", errors="replace")
    if "ExceptionReport" in texto:
        codigo = re.search(r'exceptionCode="([^"]+)"', texto)
        return "OWS ExceptionReport: " + (codigo.group(1) if codigo else "sin código")
    return None


def describir_error(exc):
    razon = getattr(exc, "reason", exc)
    if isinstance(razon, socket.gaierror):
        return f"DNS: no resuelve el host ({razon})"
    if isinstance(razon, (TimeoutError, socket.timeout)) or "timed out" in str(razon):
        return f"timeout tras {TIMEOUT} s"
    if isinstance(razon, ConnectionRefusedError):
        return "conexión rechazada"
    return f"{type(razon).__name__}: {razon}"


def probar_tcp(destino):
    host, puerto = destino.rsplit(":", 1)
    inicio = time.monotonic()
    resultado = {"probado": ahora(), "recurso": f"tcp://{destino}"}
    try:
        with socket.create_connection((host, int(puerto)), timeout=TIMEOUT):
            pass
        resultado.update(resultado="ok", detalle="conexión TCP aceptada")
    except OSError as exc:
        resultado.update(resultado="falla", error=describir_error(exc))
    resultado["ms"] = round((time.monotonic() - inicio) * 1000)
    return resultado


def probar(fuente):
    prueba = fuente["prueba"]
    if "tcp" in prueba:
        return probar_tcp(prueba["tcp"])
    metodo = prueba.get("metodo", "GET")
    cabeceras = {"User-Agent": USER_AGENT, **prueba.get("cabeceras", {})}
    datos = None
    if "cuerpo" in prueba:
        datos = json.dumps(prueba["cuerpo"]).encode()
        cabeceras.setdefault("Content-Type", "application/json")
    peticion = urllib.request.Request(prueba["url"], data=datos, headers=cabeceras, method=metodo)
    resultado = {"probado": ahora(), "recurso": prueba["url"], "metodo": metodo}
    inicio = time.monotonic()
    try:
        with urllib.request.urlopen(peticion, timeout=TIMEOUT) as resp:
            cuerpo = resp.read(MAX_BYTES) if metodo != "HEAD" else b""
            if resp.headers.get("Content-Encoding") == "gzip":
                cuerpo = gzip.decompress(cuerpo)
            resultado.update(
                http=resp.status,
                content_type=resp.headers.get("Content-Type"),
                bytes=len(cuerpo),
            )
            if prueba.get("evidencia") == "cabeceras":
                resultado["evidencia"] = {
                    "content_length": resp.headers.get("Content-Length"),
                    "last_modified": resp.headers.get("Last-Modified"),
                }
            falla = error_semantico(cuerpo)
            if falla:
                resultado.update(resultado="falla", error=falla)
            else:
                try:
                    evidencia = extraer(prueba.get("evidencia", "estado"), prueba.get("arg"), cuerpo)
                    if evidencia:
                        resultado["evidencia"] = evidencia
                    resultado["resultado"] = "ok"
                except (ValueError, KeyError, IndexError, TypeError) as exc:
                    resultado.update(resultado="falla", error=f"respuesta inesperada: {type(exc).__name__}: {exc}")
    except urllib.error.HTTPError as exc:
        cuerpo = exc.read(600).decode("utf-8", errors="replace")
        resultado.update(
            resultado="falla",
            http=exc.code,
            content_type=exc.headers.get("Content-Type"),
            error=f"HTTP {exc.code} {exc.reason}",
            respuesta=re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", cuerpo)).strip()[:200],
        )
    except (urllib.error.URLError, OSError) as exc:
        resultado.update(resultado="falla", error=describir_error(exc))
    resultado["ms"] = round((time.monotonic() - inicio) * 1000)
    return resultado


def ahora():
    return dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def celda(texto):
    return str(texto).replace("|", "\\|").replace("\n", " ") if texto is not None else "—"


def enlace(url):
    return f"[{url}]({url})" if url else "—"


def render_ficha(f, p):
    filas = [
        ("id", f"`{f['id']}`"),
        ("Familia", f["familia"]),
        ("Productor", f["productor"]),
        ("Tipo de fuente", f["tipo_fuente"]),
        ("Documentación", enlace(f["documentacion"])),
        ("Recurso probado", f"`{p['recurso']}`" if p else "—"),
        ("Formato", f["formato"]),
        ("Cobertura", f["cobertura"]),
        ("Vigencia", f["vigencia"]),
        ("Licencia", f["licencia"]),
        ("Licencia verificada en", enlace(f["licencia_verificada_en"]) if f["licencia_verificada_en"] else "**no verificada**"),
        ("Llave", f["llave"]),
        ("**Personas**", f["personas"]),
        ("Protección necesaria", f["proteccion"]),
        ("Estado", f"**{f['estado']}**"),
        ("Semáforo", SEMAFORO[f["semaforo"]]),
        ("**Probado**", p["probado"] if p else "sin prueba"),
        ("Uso potencial", f["uso_potencial"]),
    ]
    lineas = [
        f"# {f['nombre']}",
        "",
        "> Ficha generada por `scripts/probar_fuentes.py` a partir de `docs/catalogo/fuentes.json`. "
        "Para cambiarla, editar el JSON y volver a correr el script.",
        "",
        "| Campo | Valor |",
        "| --- | --- |",
        *[f"| {k} | {celda(v)} |" for k, v in filas],
        "",
        "## Razón de la decisión",
        "",
        f["razon"],
        "",
        "## Última prueba",
        "",
    ]
    if p:
        lineas += [f"- Fecha (UTC): {p['probado']}", f"- Resultado: **{p.get('resultado')}**"]
        for clave in ("metodo", "http", "content_type", "bytes", "ms", "error", "respuesta", "detalle"):
            if p.get(clave) is not None:
                lineas.append(f"- {clave}: `{p[clave]}`")
        if p.get("evidencia"):
            lineas.append(f"- evidencia: `{json.dumps(p['evidencia'], ensure_ascii=False)}`")
        if aviso(f, p):
            lineas += ["", f"> ⚠ {aviso(f, p)}"]
    else:
        lineas.append("Sin prueba registrada.")
    return "\n".join(lineas) + "\n"


def aviso(f, p):
    if f["estado"] in ("integrada", "candidata", "condicionada") and p.get("resultado") != "ok":
        return "La ficha dice que la fuente es usable, pero la última prueba falló: revisar antes de usarla."
    if f["estado"] == "caida" and p.get("resultado") == "ok":
        return "La ficha la da por caída, pero la última prueba respondió: reevaluar."
    return None


def render_indice(fuentes, pruebas, fecha):
    conteo = {}
    for f in fuentes:
        conteo[f["estado"]] = conteo.get(f["estado"], 0) + 1
    familias = sorted({f["familia"] for f in fuentes})
    lineas = [
        "# Índice del catálogo de fuentes",
        "",
        f"> Generado por `scripts/probar_fuentes.py`. Última corrida: {fecha}. "
        "Criterios y hallazgos en [README.md](README.md).",
        "",
        f"**{len(fuentes)} fuentes** en {len(familias)} familias ({', '.join(familias)}). "
        + " · ".join(f"{k}: {v}" for k, v in sorted(conteo.items())),
        "",
        "| Fuente | Familia | Estado | Semáforo | Licencia | Llave | Última prueba | Razón (resumen) |",
        "| --- | --- | --- | --- | --- | --- | --- | --- |",
    ]
    orden = ["integrada", "candidata", "condicionada", "caida", "descartada", "no_existe"]
    for f in sorted(fuentes, key=lambda x: (orden.index(x["estado"]), x["familia"], x["id"])):
        p = pruebas.get(f["id"])
        prueba = "—"
        if p:
            prueba = f"{p['probado'][:10]} {'ok' if p.get('resultado') == 'ok' else p.get('error', 'falla')}"
            if aviso(f, p):
                prueba += " ⚠"
        resumen = f["razon"].split(". ")[0]
        lineas.append(
            f"| [{celda(f['nombre'])}](fichas/{f['id']}.md) | {f['familia']} | {f['estado']} | "
            f"{SEMAFORO[f['semaforo']]} | {celda(f['licencia'])} | {celda(f['llave'])} | {celda(prueba)} | {celda(resumen)} |"
        )
    return "\n".join(lineas) + "\n"


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--id", action="append", help="probar solo estas fuentes")
    parser.add_argument("--solo-render", action="store_true", help="no usar la red")
    parser.add_argument("--estricto", action="store_true", help="salir con 1 si falla una fuente integrada")
    args = parser.parse_args()

    catalogo = json.loads(FUENTES.read_text(encoding="utf-8"))
    fuentes = catalogo["fuentes"]
    ids = [f["id"] for f in fuentes]
    if len(ids) != len(set(ids)):
        sys.exit("fuentes.json tiene ids repetidos")
    PRUEBAS.mkdir(parents=True, exist_ok=True)
    FICHAS.mkdir(parents=True, exist_ok=True)

    ultima_ruta = PRUEBAS / "ultima.json"
    ultima = json.loads(ultima_ruta.read_text(encoding="utf-8")) if ultima_ruta.exists() else {"resultados": {}}
    resultados = ultima["resultados"]

    if not args.solo_render:
        objetivo = [f for f in fuentes if not args.id or f["id"] in args.id]
        for f in objetivo:
            r = probar(f)
            resultados[f["id"]] = r
            marca = "ok   " if r.get("resultado") == "ok" else "FALLA"
            print(f"{marca} {f['id']:<32} {r.get('http', '-')!s:>4} {r.get('ms')}ms {r.get('error', '')}")
        fecha = ahora()
        ultima = {"corrida": fecha, "user_agent": USER_AGENT, "resultados": resultados}
        ultima_ruta.write_text(json.dumps(ultima, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        historial = PRUEBAS / f"{fecha[:10]}.json"
        historial.write_text(json.dumps(ultima, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    for f in fuentes:
        (FICHAS / f"{f['id']}.md").write_text(render_ficha(f, resultados.get(f["id"])), encoding="utf-8")
    for sobrante in FICHAS.glob("*.md"):
        if sobrante.stem not in ids:
            sobrante.unlink()
    (CATALOGO / "indice.md").write_text(render_indice(fuentes, resultados, ultima.get("corrida", "—")), encoding="utf-8")

    avisos = [f["id"] for f in fuentes if f["id"] in resultados and aviso(f, resultados[f["id"]])]
    if avisos:
        print("\nFichas cuyo estado no coincide con la última prueba:", ", ".join(avisos))
    caidas_integradas = [
        f["id"] for f in fuentes
        if f["estado"] == "integrada" and resultados.get(f["id"], {}).get("resultado") != "ok"
    ]
    if args.estricto and caidas_integradas:
        sys.exit("Fuentes integradas que fallan: " + ", ".join(caidas_integradas))


if __name__ == "__main__":
    main()
