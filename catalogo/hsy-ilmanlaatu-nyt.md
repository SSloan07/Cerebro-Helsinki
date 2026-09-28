# Índice de calidad del aire en tiempo real

| Campo | Valor |
|---|---|
| id | `hsy-ilmanlaatu-nyt` |
| Proveedor | HSY |
| Familia | Ambiental / regional |
| Documentación | https://www.hsy.fi/ilmanlaatu |
| Recurso probado | WFS `kartta.hsy.fi` · capa `ilmanlaatu:Ilmanlaatu_nyt` |
| **probado** | 2026-09-21 (`python3 -m etl.helsinki.probe_candidates`, ver `data/metadata/candidate_probes.json`) |
| Estado | candidata · probada OK |
| Resultado de la prueba | HTTP 200 · 13 estaciones · punto EPSG:3879 · muestra: Leppävaara, «21.9.2026 klo 21», índice 19 |
| Licencia | Por verificar |
| **personas** | No. |
| Semáforo | 🟡 amarillo (licencia sin confirmar) |
| Vigencia | Horaria (campo `Aika`) |
| Qué pregunta ayuda a responder | Contexto ambiental vivo, análogo al feed de vehículos HSL. |
| Límites y trampas | Hora local en texto finés; convertir a ISO con zona. Sin la estación = «sin dato», no cero. |
| Siguiente paso | Candidata para la vista Climate & Energy, hoy vacía. |
