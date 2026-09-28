# Precio por m² de vivienda usada por código postal (StatFin 13mu)

| Campo | Valor |
|---|---|
| id | `statfin-ashi-13mu` |
| Proveedor | Statistics Finland |
| Familia | Estadística oficial |
| Documentación | https://pxdata.stat.fi/PxWeb/pxweb/en/StatFin/StatFin__ashi/ |
| Recurso probado | PxWeb `https://pxdata.stat.fi/PxWeb/api/v1/en/StatFin/ashi/13mu.px` |
| **probado** | 2026-09-21 (`python3 -m etl.helsinki.probe_candidates`, ver `data/metadata/candidate_probes.json`) |
| Estado | candidata · metadatos probados |
| Resultado de la prueba | HTTP 200 al describir la tabla; aún no se pidió una consulta de datos |
| Licencia | CC BY 4.0 (términos de Statistics Finland) — confirmar |
| **personas** | Agregado; códigos postales con pocas transacciones suelen suprimirse (verificar). |
| Semáforo | 🟢 verde |
| Vigencia | Por verificar |
| Qué pregunta ayuda a responder | Coste de vivienda por zona. |
| Límites y trampas | Se cruza con Paavo por código postal. |
| Siguiente paso | Consulta POST para los códigos de los 4 municipios. |
