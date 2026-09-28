# Consumo eléctrico por sector del área metropolitana

| Campo | Valor |
|---|---|
| id | `hsy-sahkonkulutus-pks` |
| Proveedor | HSY |
| Familia | Ambiental / energía |
| Documentación | https://hri.fi/data/fi/dataset/sahkon-kaytto-paakaupunkiseudulla |
| Recurso probado | XLSX `.../Ilmasto/S%C3%A4hkonkulutus/Sahkonkulutus_PKS_1990_2000-2025.xlsx` |
| **probado** | 2026-09-21 (`python3 -m etl.helsinki.probe_candidates`, ver `data/metadata/candidate_probes.json`) |
| Estado | candidata · descargada |
| Resultado de la prueba | HTTP 200 · 30 KB · hoja `Kulutus`: vivienda, servicios, industria, calefacción eléctrica (GWh), «Lähde: HSY 2026» |
| Licencia | CC BY 4.0 (ficha HRI, modificada 2026-06-12) |
| **personas** | No. |
| Semáforo | 🟢 verde |
| Vigencia | Hasta 2025 |
| Qué pregunta ayuda a responder | Electricidad por sector. |
| Límites y trampas | Subconjunto de la ficha anterior; decidir si hace falta. |
| Siguiente paso | Usar solo si la vista necesita desglose eléctrico. |
