# Consumo de energía del área metropolitana 1990, 2000–2025

| Campo | Valor |
|---|---|
| id | `hsy-energiankulutus-pks` |
| Proveedor | HSY |
| Familia | Ambiental / energía |
| Documentación | https://hri.fi/data/fi/dataset/paakaupunkiseudun-energiankulutus |
| Recurso probado | XLSX `https://avoidatastr.blob.core.windows.net/avoindata/AvoinData/3_Ilmanlaatu_ja_ilmasto/Ilmasto/Energiankulutus/Paakaupunkiseudun_energiankulutus_1990_ja_2000-2025.xlsx` |
| **probado** | 2026-09-21 (`python3 -m etl.helsinki.probe_candidates`, ver `data/metadata/candidate_probes.json`) |
| Estado | candidata · descargada |
| Resultado de la prueba | HTTP 200 · 128 KB · hoja `Tulokset`, 3.947 filas × 62 columnas; bloques PKS + Helsinki, Espoo, Vantaa, Kauniainen hasta 2025 |
| Licencia | CC BY 4.0 (ficha HRI, modificada 2026-06-12) |
| **personas** | No. |
| Semáforo | 🟢 verde |
| Vigencia | Serie hasta 2025; la calefacción está suavizada con media móvil de 5 años (nota en la hoja) |
| Qué pregunta ayuda a responder | Gasto energético por sector (calefacción urbana, petróleo, eléctrica, electricidad de consumo, transporte, industria) y por municipio. |
| Límites y trampas | El Excel repite bloques con **unidades distintas** (GWh totales y, al parecer, kWh por habitante): no publicar ninguna cifra hasta identificar la unidad de cada bloque por su encabezado. Es por municipio, no hay dato espacial fino. |
| Siguiente paso | Parser que lea cada bloque con su unidad y un test que falle si la suma de sectores ≠ «Yhteensä». |
