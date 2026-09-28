# Atlas de energía y clima: datos básicos y energéticos de edificios

| Campo | Valor |
|---|---|
| id | `hel-energia-ilmastoatlas` |
| Proveedor | Ciudad de Helsinki (Kaupunginkanslia) |
| Familia | Municipal |
| Documentación | https://hri.fi/data/fi/dataset/helsingin-3d-kaupunkimalli |
| Recurso probado | XLSX `https://www.hel.fi/hel2/tietokeskus/data/helsinki/kaupunginkanslia/3D-malli/data_atlas.xlsx` |
| **probado** | 2026-09-21 (`python3 -m etl.helsinki.probe_candidates`, ver `data/metadata/candidate_probes.json`) |
| Estado | **descartada para energía por edificio** |
| Resultado de la prueba | HTTP 200 · 8 MB · 77.267 edificios; pisos en 49.569 (64 %); `energiatehokkuusluokka` solo en **422 (0,5 %)** |
| Licencia | CC BY 4.0 (ficha HRI del modelo 3D) |
| **personas** | Identificador permanente de edificio (`VTJ_PRT`); sin direcciones en las columnas vistas. |
| Semáforo | 🟡 amarillo |
| Vigencia | Sin fecha explícita; ficha HRI modificada 2025-10-27 |
| Qué pregunta ayuda a responder | Pisos y volumen de edificios (solo Helsinki). |
| Límites y trampas | Con 0,5 % de clase energética un mapa de eficiencia sería engañoso. Solo cubre Helsinki. |
| Siguiente paso | Hallazgo para el README: «el gasto energético por edificio no está abierto para la ciudad». |
