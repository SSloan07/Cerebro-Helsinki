# Service Map API v2 — unidades de servicio

| Campo | Valor |
|---|---|
| id | `hel-servicemap-v2` |
| Proveedor | Ciudad de Helsinki |
| Familia | Municipal |
| Documentación | https://api.hel.fi/servicemap/v2/ |
| Recurso probado | `https://api.hel.fi/servicemap/v2/unit/?page_size=1` |
| **probado** | 2026-09-21 (`python3 -m etl.helsinki.probe_candidates`, ver `data/metadata/candidate_probes.json`) |
| Estado | candidata · probada OK (antes: candidata sin probar, API v4) |
| Resultado de la prueba | HTTP 200 · 21.508 unidades · incluye `municipality`, `location`, `services` |
| Licencia | Por verificar para la v2 (HRI tiene CC BY 4.0 para la REST v4 del registro de servicios) |
| **personas** | Campos de contacto (`email`, `phone`) — pueden ser de personas; descartarlos en la ingesta. |
| Semáforo | 🟡 amarillo |
| Vigencia | Viva (`last_modified_time` por unidad) |
| Qué pregunta ayuda a responder | Acceso a servicios (escuelas, salud, bibliotecas) por zona. |
| Límites y trampas | Paginado; descargar completo requiere muchas páginas. |
| Siguiente paso | Confirmar licencia; ingestar solo id, nombre, servicio, municipio, punto. |
