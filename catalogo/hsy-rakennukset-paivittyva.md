# Registro de edificios del área metropolitana (actualizable)

| Campo | Valor |
|---|---|
| id | `hsy-rakennukset-paivittyva` |
| Proveedor | HSY (a partir del registro de edificios de los municipios) |
| Familia | Ambiental / regional |
| Documentación | https://kartta.hsy.fi/ |
| Recurso probado | WFS `kartta.hsy.fi` · capa `asuminen_ja_maankaytto:pks_rakennukset_paivittyva` |
| **probado** | 2026-09-21 (`python3 -m etl.helsinki.probe_candidates`, ver `data/metadata/candidate_probes.json`) |
| Estado | candidata · probada OK |
| Resultado de la prueba | HTTP 200 · 154.154 edificios · MultiPolygon EPSG:3879 · muestra con `poimintapvm` 20240419 |
| Licencia | CC BY 4.0 — verificado 2026-09-28 en la ficha HRI «Pääkaupunkiseudun rakennukset» https://hri.fi/data/fi/dataset/paakaupunkiseudun-rakennukset (modificada 2026-04-02; su recurso WFS es kartta.hsy.fi) |
| **personas** | Sí, indirectamente: dirección (`katu`, `osno1`), código postal e identificador permanente de edificio (`vtj_prt`) junto a sistema de calefacción, año, material. En casas unifamiliares eso describe un hogar identificable. |
| Semáforo | 🟡 amarillo — solo agregados; no publicar punto/polígono con dirección |
| Vigencia | Extracción 2024-04-19 en la muestra (verificar si varía por municipio) |
| Qué pregunta ayuda a responder | Año de construcción, uso, **número de pisos** (`kerrosten_lkm`), **combustible de calefacción** (`lammitysaine_s`, p. ej. «Kauko- tai aluelämpö» = calefacción urbana). |
| Límites y trampas | `999999999` = sin dato (en la muestra: pisos, superficie, nº de viviendas vacíos). Medir tasa de completitud antes de usarlo para alturas. |
| Siguiente paso | Probar como fuente de pisos frente a Overture; agregar por rejilla/código postal. |
