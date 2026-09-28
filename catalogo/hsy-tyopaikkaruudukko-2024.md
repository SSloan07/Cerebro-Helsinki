# Työpaikkaruudukko — empleos por rejilla 2024

| Campo | Valor |
|---|---|
| id | `hsy-tyopaikkaruudukko-2024` |
| Proveedor | HSY |
| Familia | Ambiental / regional |
| Documentación | https://hri.fi/data/fi/dataset/helsingin-seudun-tyopaikkaruudukko |
| Recurso probado | WFS `kartta.hsy.fi` · capa `asuminen_ja_maankaytto:Tyopaikkaruudukko_2024` |
| **probado** | 2026-09-21 (`python3 -m etl.helsinki.probe_candidates`, ver `data/metadata/candidate_probes.json`) |
| Estado | candidata · probada OK |
| Resultado de la prueba | HTTP 200 · 15.445 celdas · EPSG:3879 |
| Licencia | CC BY 4.0 (ficha HRI, modificada 2026-08-26) |
| **personas** | Agregado; `tphklkm = -1` en celdas con pocos empleos (protegido). Una celda con 1 empleo podría señalar una sola empresa: publicar solo niveles agregados. |
| Semáforo | 🟡 amarillo (celdas de 1–2 empleos) |
| Vigencia | 2024 |
| Qué pregunta ayuda a responder | Dónde está el empleo y de qué sector (TOL 2008 letras A–X). |
| Límites y trampas | `-1` = supresión. Resolución fina puede identificar empleadores únicos. |
| Siguiente paso | Agregar a código postal o a 1 km antes de publicar. |
