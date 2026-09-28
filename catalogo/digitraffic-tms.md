# Digitraffic — estaciones de conteo de tráfico (TMS)

| Campo | Valor |
|---|---|
| id | `digitraffic-tms` |
| Proveedor | Fintraffic |
| Familia | Transporte |
| Documentación | https://www.digitraffic.fi/en/road-traffic/ |
| Recurso probado | `https://tie.digitraffic.fi/api/tms/v1/stations` |
| **probado** | 2026-09-21 (`python3 -m etl.helsinki.probe_candidates`, ver `data/metadata/candidate_probes.json`) |
| Estado | candidata · probada OK tras corrección |
| Resultado de la prueba | Primer intento HTTP 406 «Use of gzip compression is required»; con `Accept-Encoding: gzip` → HTTP 200 · 520 estaciones (toda Finlandia) |
| Licencia | Por verificar |
| **personas** | No. |
| Semáforo | 🟡 amarillo (licencia sin confirmar) |
| Vigencia | Viva |
| Qué pregunta ayuda a responder | Tráfico vial junto al transporte público HSL. |
| Límites y trampas | Filtrar a los 4 municipios por polígono. |
| Siguiente paso | Opcional. |
