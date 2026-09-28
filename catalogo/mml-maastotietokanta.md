# Base topográfica de edificios (MML)

| Campo | Valor |
|---|---|
| id | `mml-maastotietokanta` |
| Proveedor | National Land Survey of Finland |
| Familia | Cartografía oficial |
| Documentación | https://www.maanmittauslaitos.fi/en/rajapinnat/api-avaimen-ohje |
| Recurso probado | OGC API Features `avoin-paikkatieto.maanmittauslaitos.fi/maastotiedot/features/v1/collections/rakennus/items` |
| **probado** | 2026-09-21 (`python3 -m etl.helsinki.probe_candidates`, ver `data/metadata/candidate_probes.json`) |
| Estado | descartada por ahora |
| Resultado de la prueba | HTTP 401 Unauthorized sin llave |
| Licencia | Por verificar |
| **personas** | No. |
| Semáforo | ⚪ requiere llave |
| Vigencia | — |
| Qué pregunta ayuda a responder | Huellas oficiales de edificios. |
| Límites y trampas | La llave es gratuita pero es un secreto a gestionar (proxy + variable de entorno). Decisión del grupo. |
| Siguiente paso | Solo si Overture no basta. |
