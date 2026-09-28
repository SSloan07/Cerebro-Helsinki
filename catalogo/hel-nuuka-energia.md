# Consumo energético de edificios de servicios municipales (API Nuuka)

| Campo | Valor |
|---|---|
| id | `hel-nuuka-energia` |
| Proveedor | Ciudad de Helsinki / Nuuka |
| Familia | Municipal |
| Documentación | https://helsinki-openapi.nuuka.cloud/swagger |
| Recurso probado | `https://helsinki-openapi.nuuka.cloud/api/v1.0/Property/List` |
| **probado** | 2026-09-21 (`python3 -m etl.helsinki.probe_candidates`, ver `data/metadata/candidate_probes.json`) |
| Estado | candidata · probada OK |
| Resultado de la prueba | HTTP 200 · 1.810 inmuebles municipales (mercados, escuelas…) con código de inmueble |
| Licencia | CC BY 4.0 (ficha HRI, modificada 2023-06-01) |
| **personas** | No (edificios públicos). |
| Semáforo | 🟢 verde (condición: vigencia de la ficha 2023) |
| Vigencia | Por verificar pidiendo series de consumo |
| Qué pregunta ayuda a responder | Gasto energético medido (no modelado) de edificios públicos de Helsinki. |
| Límites y trampas | Solo inmuebles de la ciudad de Helsinki; no es consumo residencial. |
| Siguiente paso | Probar un endpoint de consumo por inmueble y fecha. |
