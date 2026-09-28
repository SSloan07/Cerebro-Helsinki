# Rejilla de población 1 km 2025

| Campo | Valor |
|---|---|
| id | `sf-vaestoruutu-1km-2025` |
| Proveedor | Statistics Finland |
| Familia | Estadística oficial |
| Documentación | https://stat.fi/en/services/statistical-data-services/geographic-data/grid-data |
| Recurso probado | WFS `geo.stat.fi` · capa `vaestoruutu:vaki2025_1km` · filtro por `kunta` |
| **probado** | 2026-09-21 (`python3 -m etl.helsinki.probe_candidates`, ver `data/metadata/candidate_probes.json`) |
| Estado | candidata · probada OK |
| Resultado de la prueba | HTTP 200 · 749 celdas en los 4 municipios · Polygon EPSG:3067 |
| Licencia | CC BY 4.0 (términos de Statistics Finland) |
| **personas** | Agregado. Celdas con poca población traen `-1` en desgloses (sexo, edad) = dato protegido, NO cero. |
| Semáforo | 🟢 verde (condición: `-1` → nulo) |
| Vigencia | Población a fin de 2025 |
| Qué pregunta ayuda a responder | Densidad de población comparable entre municipios con celdas de igual área. |
| Límites y trampas | `-1` es supresión; si llega al mapa como número es un error de verificación. |
| Siguiente paso | Alternativa a Paavo para la densidad; comparar ambas en la bitácora. |
