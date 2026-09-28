# Catálogo de fuentes — Cerebro Helsinki

Una ficha por fuente, **incluidas las caídas y las descartadas**. Ninguna entra aquí sin prueba: cada ficha remite a
`data/metadata/candidate_probes.json`, que se regenera con

```bash
python3 -m etl.helsinki.probe_candidates --overture
```

(`--overture` necesita `duckdb` en el entorno de Python; sin él se omite solo esa prueba.)

Las 7 fuentes de la fase anterior (límites de Statistics Finland, GTFS y GTFS-RT de HSL, visor 3D, Service Map v4,
teselas OSM, Overpass) siguen registradas en `public/data/sources.json`; falta pasarlas a fichas de este formato.

**Nada de lo de abajo está integrado en el lago todavía.** Son candidatas probadas el 2026-09-21.

## Semáforo

🟢 licencia abierta confirmada y sin datos de personas (o solo agregados) · 🟡 se puede usar con una condición escrita en la ficha ·
🔴 no se publica tal cual · ⚪ no hay acceso o no existe para la ciudad.

| Ficha | Familia | Estado | Semáforo | Para qué |
|---|---|---|---|---|
| [sf-paavo-2026](sf-paavo-2026.md) | Estadística oficial | probada OK | 🟢 | densidad, ingresos, educación, vivienda por código postal |
| [sf-vaestoruutu-1km-2025](sf-vaestoruutu-1km-2025.md) | Estadística oficial | probada OK | 🟢 | densidad en rejilla 1 km |
| [statfin-ashi-13mu](statfin-ashi-13mu.md) | Estadística oficial | metadatos OK | 🟢 | precio de vivienda por código postal |
| [hsy-vaestotietoruudukko-2025](hsy-vaestotietoruudukko-2025.md) | Ambiental / regional | probada OK | 🟢 | densidad en rejilla 250 m |
| [hsy-rakennustietoruudukko-2025](hsy-rakennustietoruudukko-2025.md) | Ambiental / regional | probada OK | 🟢 | intensidad de edificación |
| [hsy-tyopaikkaruudukko-2024](hsy-tyopaikkaruudukko-2024.md) | Ambiental / regional | probada OK | 🟡 | empleo por sector |
| [hsy-rakennukset-paivittyva](hsy-rakennukset-paivittyva.md) | Ambiental / regional | probada OK | 🟡 | pisos, año, calefacción (solo agregado) |
| [hsy-energiankulutus-pks](hsy-energiankulutus-pks.md) | Ambiental / energía | descargada | 🟢 | gasto energético por sector y municipio |
| [hsy-sahkonkulutus-pks](hsy-sahkonkulutus-pks.md) | Ambiental / energía | descargada | 🟢 | electricidad por sector |
| [hsy-aurinkosahkopotentiaali](hsy-aurinkosahkopotentiaali.md) | Ambiental / energía | probada OK | 🟢 | potencial solar (modelado) |
| [hsy-rakennukset-polttoaine](hsy-rakennukset-polttoaine.md) | Ambiental / energía | probada OK | 🟡 | combustible de calefacción |
| [hsy-ilmanlaatu-nyt](hsy-ilmanlaatu-nyt.md) | Ambiental / regional | probada OK | 🟡 | calidad del aire en vivo |
| [hel-nuuka-energia](hel-nuuka-energia.md) | Municipal | probada OK | 🟢 | energía medida de edificios públicos |
| [hel-servicemap-v2](hel-servicemap-v2.md) | Municipal | probada OK | 🟡 | servicios públicos |
| [hel-energia-ilmastoatlas](hel-energia-ilmastoatlas.md) | Municipal | descartada (0,5 % con clase energética) | 🟡 | — |
| [hel-3d-citygml-kalasatama](hel-3d-citygml-kalasatama.md) | Municipal | descartada (un barrio, 2019) | 🟢 | — |
| [hel-3d-citydb-wfs](hel-3d-citydb-wfs.md) | Municipal | **caída** (timeout) | ⚪ | alturas oficiales de Helsinki |
| [hel-avoindata-wfs](hel-avoindata-wfs.md) | Municipal | **caída** (timeout) | ⚪ | — |
| [prh-ytj-v3](prh-ytj-v3.md) | Registro empresarial | probada OK | 🔴 registros / 🟡 conteos | tejido empresarial |
| [fmi-open-data](fmi-open-data.md) | Meteorología | probada OK | 🟡 | clima |
| [digitraffic-tms](digitraffic-tms.md) | Transporte | OK tras corrección | 🟡 | tráfico vial |
| [overture-buildings](overture-buildings.md) | Comunitaria / global | probada OK | 🟡 (ODbL) | **altura de edificios** |
| [ms-global-ml-buildings](ms-global-ml-buildings.md) | Comunitaria / global | descartada (ya está en Overture) | 🟢 | — |
| [google-open-buildings](google-open-buildings.md) | Comunitaria / global | **no existe para Finlandia** | ⚪ | — |
| [mml-maastotietokanta](mml-maastotietokanta.md) | Cartografía oficial | descartada por ahora (401, pide llave) | ⚪ | — |
| [eubucco](eubucco.md) | Comunitaria / académica | **caída** (DNS) | ⚪ | — |

Familias con al menos una fuente probada OK: estadística oficial, ambiental/regional (HSY), municipal, registro empresarial,
meteorología, transporte y comunitaria/global — se cumple el mínimo de ≥ 3.

## Qué no existe (o no se pudo abrir) para la ciudad

- **Gasto energético por edificio**: el atlas de Helsinki trae clase energética en 422 de 77.267 edificios; no se encontró el registro
  de certificados energéticos en avoindata.fi (búsqueda `energiatodistus`: 0 resultados). Lo que sí hay: consumo por sector y
  municipio (HSY) y consumo medido de edificios públicos (Nuuka).
- **Google Open Buildings** no cubre Finlandia. Las alturas vienen de Overture (OSM + Esri + Microsoft) o, para Helsinki, del modelo 3D
  cuyo WFS no responde.
- **Servidores `kartta.hel.fi`**: timeout en dos fases distintas.

## Trampas de datos encontradas (van al contrato y a `verificar.py`)

| Fuente | Valor centinela | Significa |
|---|---|---|
| Rejilla 1 km Statistics Finland | `-1` | dato protegido (pocas personas) |
| Rejilla 250 m HSY | `99` en grupos de edad | dato protegido |
| Registro de edificios HSY, rejilla de edificación | `999999999` | sin dato |
| Rejilla de empleo HSY | `-1` | dato protegido |
| Consumo de energía HSY (XLSX) | bloques repetidos con distinta unidad | leer la unidad de cada bloque antes de usar |

Ninguno de estos valores puede llegar al mapa como número; `verificar.py` debería fallar si aparece alguno.

## Acceso: el User-Agent importa

Las API CKAN de HRI (`hri.fi/data/api/3`) y avoindata.fi responden **403 Forbidden** al User-Agent descriptivo del ETL y a uno de
navegador, y 200 a `curl/8`. El sondeo lo registra tal cual (`hri-ckan-api`: 403). Los archivos enlazados desde HRI (blob de Azure,
hel.fi) sí se descargan con el User-Agent del ETL. Para catalogar desde CKAN habrá que decidir, y dejar escrito, qué User-Agent se usa.

## Aviso: hay dos catálogos en el repo (2026-09-28)

Este catálogo (`catalogo/*.md` + `etl/helsinki/probe_candidates.py`) y el de `docs/catalogo/fuentes.json` +
`scripts/probar_fuentes.py` se escribieron en paralelo y **cubren en parte las mismas fuentes**. No chocan en git porque
están en rutas distintas, pero el grupo tiene que decidir cuál queda antes de la entrega: dos catálogos que se contradicen
son exactamente lo que la rúbrica llama «vitrina».

- `docs/catalogo/fuentes.json`: 49 fuentes, más familias, con `licencia_verificada_en` por fuente y fichas generadas por script.
- `catalogo/`: 26 fuentes con el sondeo realmente ejecutado y guardado en `data/metadata/candidate_probes.json`.

Discrepancias que hay que resolver, no ocultar:

| Punto | `docs/catalogo/fuentes.json` | `catalogo/` |
|---|---|---|
| Paavo | capa `pno_tilasto_2025`, 168 áreas | capa `pno_tilasto_2026`, 167 áreas (probada 2026-09-21) |
| Edificios HSY (`pks_rakennukset_paivittyva`) | semáforo 🟢 verde | 🟡 amarillo: trae dirección por edificio, que en casas unifamiliares describe un hogar |
| Overture edificios | licencia ODbL; prueba = listar releases en S3 | licencia ODbL (coincide); prueba = consulta real con DuckDB: 258.743 edificios, 66 % con altura |

Y un dato que afecta a los dos scripts: el User-Agent de `scripts/probar_fuentes.py`
(`CerebroHelsinki-catalog-probe/0.1 ...`) también recibe **403** de la API CKAN de HRI (probado 2026-09-28), igual que el
del ETL. Si se quiere catalogar desde CKAN, hay que resolver el User-Agent en el script que quede.

## Bitácora de IA de este rastreo (2026-09-21)

| Herramienta | Qué se encargó | Qué entregó | Qué se corrigió |
|---|---|---|---|
| Claude Code (Opus 5) | Buscar fuentes nuevas: densidad, energía, alturas de edificios, contexto socioeconómico | 26 fichas, `etl/helsinki/probe_candidates.py`, este índice | (1) Supuso que la API CKAN de HRI estaba rota; al reintentar resultó ser un 403 que depende del User-Agent. (2) Escribió mal el id de la tabla StatFin (`statfin_ashi_pxt_13mu.px`); el listado de la API dio `13mu.px`. (3) Digitraffic devolvió 406 hasta añadir `Accept-Encoding: gzip`. (4) Iba a citar cifras de energía por municipio del XLSX de HSY; se dio cuenta de que los bloques tienen unidades distintas y no publicó ninguna. (5) Licencias de FMI, PRH, Digitraffic, Service Map v2 y algunas capas HSY se dejaron como «por verificar» en vez de afirmarlas de memoria. |

Pendiente para el grupo: abrir cada enlace de las licencias «por verificar», decidir qué fuentes pasan a ingesta, y revisar la
distribución de alturas de Overture (media ≈ 5 m en la prueba, sospechosa).
