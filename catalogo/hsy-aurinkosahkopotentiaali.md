# Potencial solar fotovoltaico por edificio

| Campo | Valor |
|---|---|
| id | `hsy-aurinkosahkopotentiaali` |
| Proveedor | HSY |
| Familia | Ambiental / energía |
| Documentación | https://hri.fi/data/fi/dataset/paakaupunkiseudun-aurinkosahkopotentiaali |
| Recurso probado | WFS `kartta.hsy.fi` · capa `ilmasto_ja_energia:rakennukset_aurinkosahkopotentiaali` |
| **probado** | 2026-09-21 (`python3 -m etl.helsinki.probe_candidates`, ver `data/metadata/candidate_probes.json`) |
| Estado | candidata · probada OK |
| Resultado de la prueba | HTTP 200 · 154.586 polígonos · campos `panel_ala` (m²), `elec_kwh_v` (kWh/año) |
| Licencia | CC BY 4.0 (ficha HRI, modificada 2021-10-15) |
| **personas** | No directamente (sin dirección en la capa). |
| Semáforo | 🟢 verde (condición: vigencia antigua visible) |
| Vigencia | Ficha de 2021 — dato modelado, no medido |
| Qué pregunta ayuda a responder | Energía: potencial de generación solar por zona. |
| Límites y trampas | Es un **modelo** (evidence `modelled`), no consumo. Primera fila de muestra con 0 kWh: distinguir 0 real de «no calculado». |
| Siguiente paso | Agregar por código postal junto al consumo. |
