# Väestötietoruudukko — rejilla de población 250 m 2025

| Campo | Valor |
|---|---|
| id | `hsy-vaestotietoruudukko-2025` |
| Proveedor | HSY (Helsinki Region Environmental Services) |
| Familia | Ambiental / regional |
| Documentación | https://hri.fi/data/fi/dataset/vaestotietoruudukko |
| Recurso probado | WFS `https://kartta.hsy.fi/geoserver/wfs` · capa `asuminen_ja_maankaytto:Vaestotietoruudukko_2025` |
| **probado** | 2026-09-21 (`python3 -m etl.helsinki.probe_candidates`, ver `data/metadata/candidate_probes.json`) |
| Estado | candidata · probada OK |
| Resultado de la prueba | HTTP 200 · 5.826 celdas · Polygon EPSG:3879 · `paivitys_pvm` 2026-08-05 |
| Licencia | CC BY 4.0 (ficha HRI, modificada 2026-07-16) |
| **personas** | Agregado. En celdas pequeñas los grupos de edad valen `99` = dato protegido (visto: celda con 6 habitantes y todas las edades en 99). |
| Semáforo | 🟢 verde (condición: `99` en edades → nulo) |
| Vigencia | Situación 2025, actualizado 2026-08-05 |
| Qué pregunta ayuda a responder | Densidad fina (250 m) y superficie media de vivienda (`asvaljyys`). |
| Límites y trampas | No trae código municipal: hay que hacer cruce espacial con los polígonos y luego trabajar por código. La cobertura de HSY puede exceder los 4 municipios. |
| Siguiente paso | Comparar con la de 1 km de Statistics Finland (mismo fenómeno, distinta resolución y dueño). |
