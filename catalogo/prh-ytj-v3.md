# Registro mercantil YTJ — API v3

| Campo | Valor |
|---|---|
| id | `prh-ytj-v3` |
| Proveedor | PRH (Finnish Patent and Registration Office) |
| Familia | Registro empresarial |
| Documentación | https://avoindata.prh.fi/ |
| Recurso probado | `https://avoindata.prh.fi/opendata-ytj-api/v3/companies?location=Helsinki` |
| **probado** | 2026-09-21 (`python3 -m etl.helsinki.probe_candidates`, ver `data/metadata/candidate_probes.json`) |
| Estado | candidata · probada OK |
| Resultado de la prueba | HTTP 200 · `totalResults` 89.816 para location=Helsinki |
| Licencia | Por verificar en avoindata.prh.fi |
| **personas** | **Sí**: incluye empresarios individuales (toiminimi), cuyo nombre comercial suele ser el nombre de una persona. |
| Semáforo | 🔴 rojo para registros · 🟡 para conteos agregados |
| Vigencia | Registro vivo |
| Qué pregunta ayuda a responder | Tejido empresarial por municipio y sector (TOL). |
| Límites y trampas | No pasar registros a la IA (regla del taller). Publicar solo conteos por municipio/sector. |
| Siguiente paso | Script que solo guarde conteos, nunca nombres. |
