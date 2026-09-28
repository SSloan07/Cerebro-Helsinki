# WFS de datos abiertos de Helsinki (avoindata)

| Campo | Valor |
|---|---|
| id | `hel-avoindata-wfs` |
| Proveedor | Ciudad de Helsinki |
| Familia | Municipal |
| Documentación | https://kartta.hel.fi/ |
| Recurso probado | `https://kartta.hel.fi/ws/geoserver/avoindata/wfs?...GetCapabilities` |
| **probado** | 2026-09-21 (`python3 -m etl.helsinki.probe_candidates`, ver `data/metadata/candidate_probes.json`) |
| Estado | **caída** |
| Resultado de la prueba | Timeout 40 s (curl) y 45 s (script), 2026-09-21. Segunda fase seguida con el mismo error. |
| Licencia | — |
| **personas** | — |
| Semáforo | ⚪ sin acceso |
| Vigencia | — |
| Qué pregunta ayuda a responder | Divisiones de distrito, edificios de Helsinki. |
| Límites y trampas | Las rejillas HSY cubren parte de lo que se esperaba de aquí. |
| Siguiente paso | Reintentar desde otra red. |
