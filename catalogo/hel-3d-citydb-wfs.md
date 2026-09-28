# Modelo 3D de Helsinki — WFS CityGML (alturas por edificio)

| Campo | Valor |
|---|---|
| id | `hel-3d-citydb-wfs` |
| Proveedor | Ciudad de Helsinki |
| Familia | Municipal |
| Documentación | https://hri.fi/data/fi/dataset/helsingin-3d-kaupunkimalli |
| Recurso probado | `https://kartta.hel.fi/3d/citydb-wfs/wfs?...GetCapabilities` |
| **probado** | 2026-09-21 (`python3 -m etl.helsinki.probe_candidates`, ver `data/metadata/candidate_probes.json`) |
| Estado | **caída** |
| Resultado de la prueba | Timeout a 40 s (curl) y a 45 s (script), 2026-09-21. Mismo servidor `kartta.hel.fi` que ya falló en la fase anterior. |
| Licencia | CC BY 4.0 (ficha HRI) |
| **personas** | No. |
| Semáforo | ⚪ sin acceso |
| Vigencia | — |
| Qué pregunta ayuda a responder | Sería la mejor fuente de altura para Helsinki. |
| Límites y trampas | Posible bloqueo por red/región; reintentar desde otra red antes de descartarla del todo. |
| Siguiente paso | Reintentar; si sigue caída, registrar como hueco. |
