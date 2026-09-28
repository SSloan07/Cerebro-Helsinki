# Overture Maps — tema buildings (release 2026-08-19.0)

| Campo | Valor |
|---|---|
| id | `overture-buildings` |
| Proveedor | Overture Maps Foundation |
| Familia | Comunitaria / global |
| Documentación | https://docs.overturemaps.org/guides/buildings/ |
| Recurso probado | GeoParquet `s3://overturemaps-us-west-2/release/2026-08-19.0/theme=buildings/type=building/*` leído con DuckDB (sin llave) |
| **probado** | 2026-09-21 (`python3 -m etl.helsinki.probe_candidates`, ver `data/metadata/candidate_probes.json`) |
| Estado | candidata · probada OK |
| Resultado de la prueba | bbox 24.50–25.26 E, 60.10–60.42 N: 258.743 edificios; 171.492 con `height` (66 %); 88.615 con `num_floors`; altura máxima 150 m; fuentes: OpenStreetMap, Esri Community Maps, Microsoft ML Buildings. Consulta ≈ 100 s. |
| Licencia | ODbL (verificado en docs.overturemaps.org/attribution) — share-alike sobre la base derivada |
| **personas** | No. |
| Semáforo | 🟡 amarillo (obligaciones ODbL) |
| Vigencia | Release 2026-08-19.0; la fecha de cada altura depende del contribuyente |
| Qué pregunta ayuda a responder | **Altura de edificios** para los 4 municipios (lo que se pidió de «Open Buildings»). |
| Límites y trampas | El bbox incluye áreas fuera de los 4 municipios: recortar con los polígonos. Altura media en la prueba ≈ 5 m — sospechoso (probables cobertizos/anexos): revisar distribución antes de mostrar nada. |
| Siguiente paso | Comparar con pisos de HSY/atlas de Helsinki sobre los mismos edificios (≥ 2 herramientas: DuckDB vs QGIS). |
