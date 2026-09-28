# Paavo — estadísticas por código postal 2026

| Campo | Valor |
|---|---|
| id | `sf-paavo-2026` |
| Proveedor | Statistics Finland (Tilastokeskus) |
| Familia | Estadística oficial |
| Documentación | https://stat.fi/en/services/statistical-data-services/paavo |
| Recurso probado | WFS `https://geo.stat.fi/geoserver/wfs` · capa `postialue:pno_tilasto_2026` · filtro `kunta IN ('049','091','092','235')` |
| **probado** | 2026-09-21 (`python3 -m etl.helsinki.probe_candidates`, ver `data/metadata/candidate_probes.json`) |
| Estado | candidata · probada OK |
| Resultado de la prueba | HTTP 200 · 167 áreas postales en los 4 municipios · MultiPolygon EPSG:3067 |
| Licencia | CC BY 4.0 (mismo proveedor y términos que los límites municipales ya integrados) |
| **personas** | No trae registros individuales: son agregados por área postal (población por edad/sexo, educación, ingresos, hogares, vivienda, empleo). Por verificar en la documentación de Paavo cómo se suprimen áreas con poca población. |
| Semáforo | 🟢 verde |
| Vigencia | Año de publicación 2026 (campo `vuosi`); cada variable tiene su propio año de referencia — leerlo de la documentación antes de publicar |
| Qué pregunta ayuda a responder | Densidad de población (`he_vakiy` / `pinta_ala`), ingreso medio por habitante y por hogar (`hr_ktu`, `tr_ktu`), nivel educativo (`ko_*`), tenencia de vivienda (`te_omis_as`, `te_vuok_as`), empleos (`tp_tyopy`). |
| Límites y trampas | Códigos postales no son barrios ni unidades administrativas. El cruce con municipios es por `kunta` (código), nunca por nombre. |
| Siguiente paso | Primera candidata a integrar: una sola capa responde densidad + contexto socioeconómico para los 4 municipios. |
