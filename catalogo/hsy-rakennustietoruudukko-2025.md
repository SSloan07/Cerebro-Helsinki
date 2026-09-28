# Rakennustietoruudukko — rejilla de edificación 250 m 2025

| Campo | Valor |
|---|---|
| id | `hsy-rakennustietoruudukko-2025` |
| Proveedor | HSY |
| Familia | Ambiental / regional |
| Documentación | https://hri.fi/data/fi/dataset/rakennustietoruudukko |
| Recurso probado | WFS `kartta.hsy.fi` · capa `asuminen_ja_maankaytto:Rakennustietoruudukko_2025` |
| **probado** | 2026-09-21 (`python3 -m etl.helsinki.probe_candidates`, ver `data/metadata/candidate_probes.json`) |
| Estado | candidata · probada OK |
| Resultado de la prueba | HTTP 200 · 8.663 celdas · EPSG:3879 · `paivitys_pvm` 2026-08-04 |
| Licencia | CC BY 4.0 (ficha HRI, modificada 2026-08-04) |
| **personas** | Agregado por celda (número de edificios, superficie construida). |
| Semáforo | 🟢 verde (condición: `999999999` → nulo) |
| Vigencia | 2025 |
| Qué pregunta ayuda a responder | Intensidad de edificación (`aluetehok`), m² residenciales vs. no residenciales. |
| Límites y trampas | `999999999` = sin dato en usos principales (`kayttark*`, `summa*`). |
| Siguiente paso | Complementa altura de edificios sin exponer edificios individuales. |
