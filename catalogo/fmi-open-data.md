# FMI Open Data — observaciones meteorológicas

| Campo | Valor |
|---|---|
| id | `fmi-open-data` |
| Proveedor | Finnish Meteorological Institute |
| Familia | Meteorología |
| Documentación | https://en.ilmatieteenlaitos.fi/open-data |
| Recurso probado | WFS `https://opendata.fmi.fi/wfs` · stored query `fmi::observations::weather::simple` |
| **probado** | 2026-09-21 (`python3 -m etl.helsinki.probe_candidates`, ver `data/metadata/candidate_probes.json`) |
| Estado | candidata · probada OK |
| Resultado de la prueba | HTTP 200 · 71 observaciones de `t2m` para place=helsinki |
| Licencia | CC BY 4.0 — verificado 2026-09-28 en https://en.ilmatieteenlaitos.fi/open-data-licence |
| **personas** | No. |
| Semáforo | 🟢 verde (licencia confirmada 2026-09-28; antes 🟡 por licencia sin confirmar) |
| Vigencia | Observaciones en tiempo casi real |
| Qué pregunta ayuda a responder | Clima para la vista Climate & Energy. |
| Límites y trampas | Sin llave. |
| Siguiente paso | Confirmar licencia. |
