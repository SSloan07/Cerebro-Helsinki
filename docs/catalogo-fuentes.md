# Catálogo de fuentes de datos — Cerebro Helsinki (índice unificado)

Tramo **Rastreo** del Taller de Datos. Cubre Helsinki (091), Espoo (049), Vantaa (092) y Kauniainen (235).

Este es el **índice único** del catálogo. Une dos rastreos que se hicieron en paralelo:

| Rastreo | Fecha de prueba | Cómo se probó | Dónde está el detalle |
| --- | --- | --- | --- |
| Rastreo amplio (49 fuentes) | 2026-09-28, desde Colombia | Petición HTTP real con curl y Python `urllib` | Este documento y [catalogo/fuentes.json](catalogo/fuentes.json) |
| Rastreo de densidad, energía y alturas (26 fuentes) | 2026-09-21 | [`etl/helsinki/probe_candidates.py`](../etl/helsinki/probe_candidates.py) → [`data/metadata/candidate_probes.json`](../data/metadata/candidate_probes.json) | Una ficha por fuente en [`catalogo/`](../catalogo/README.md) |

Las 12 fuentes que aparecían en los dos rastreos se conciliaron. Cada diferencia quedó anotada en la §7. La columna **Ficha** enlaza la ficha detallada de `catalogo/` cuando existe.

- **Resultado:** 63 fuentes en 7 familias (territorio, población, economía, movilidad, ambiente, servicios, catálogos): **5 integradas · 25 candidatas · 8 condicionadas · 6 caídas · 17 descartadas · 2 no existen para la ciudad**.
- **Versión para máquina:** [catalogo/fuentes.json](catalogo/fuentes.json). Trae los mismos campos, `ficha_catalogo`, el recurso probado (`prueba`) y el resultado observado (`ultima_prueba`). Si se cambia una fuente, hay que actualizar este documento, el JSON y la ficha de `catalogo/` si la tiene.
- **Regla:** ninguna fuente entra al catálogo solo porque la IA la propuso. Si no se abrió o no respondió, figura como caída con su error exacto. Si la licencia no se leyó en la fuente, dice **por verificar**.

---

## 1. Criterios para aceptar una fuente

Para ser **candidata**, una fuente debe cumplir los ocho criterios. Si incumple uno que se puede resolver, queda **condicionada** y la condición se escribe. Si incumple uno que no se puede resolver, queda **descartada**.

| # | Criterio | Cuándo se rechaza |
| --- | --- | --- |
| C1 | **Productor identificable y primario**: la entidad que mide o registra el dato | Agregadores, copias editables por cualquiera, crowdsourcing sin método |
| C2 | **Licencia abierta y explícita** (CC BY 4.0, CC0, ODbL), leída en la fuente o en su ficha de HRI | Licencia no declarada, términos que prohíben reutilizar o bajar por script |
| C3 | **Sin llave paga**; se prefiere también sin registro | Llave paga. Una llave gratuita obliga a guardar un secreto, así que solo se acepta si no hay alternativa sin llave |
| C4 | **Vigencia declarada** | Sin fecha, o superada por otra fuente más nueva para la misma pregunta |
| C5 | **Cobertura de los cuatro municipios, con código territorial** (o cruce espacial documentado) | Solo nacional, o cruce posible solo por nombre |
| C6 | **Acceso reproducible por script**: HTTP 2xx y formato legible por máquina | Timeout, DNS, 403/404, o un 200 que en realidad trae un error |
| C7 | **Sin datos de personas**, o solo agregados o suprimidos | Texto libre de ciudadanos, nombres, trayectos individuales |
| C8 | **Metodología documentada** | Cifras sin método ni muestreo conocido |

**Semáforo (regla común a los dos rastreos):** 🟢 se puede usar · 🟡 se puede usar con la condición escrita · 🔴 no se puede usar tal como está.

- **El semáforo mide permiso**, es decir, licencia y datos de personas.
- **Un valor centinela de supresión** (`-1`, `99`, `999999999`) es un problema de calidad: va al contrato de datos y a `verificar.py` (§4), **no baja el semáforo**.
- **Si hay que quitar campos o publicar solo agregados** para no exponer a personas, la fuente es 🟡.

---

## 2. Fuentes aceptadas

### 2.1 Integradas (ya están en el sistema)

| Fuente | Productor | Licencia | Personas | Prueba 2026-09-28 | Semáforo / nota |
| --- | --- | --- | --- | --- | --- |
| Límites municipales 2025 `kunta1000k_2025` | Statistics Finland | CC BY 4.0 ([términos](https://stat.fi/en/about-us/get-to-know-statistics-finland/legislation/terms-of-use)) | No | 200 · 4 polígonos | 🟢 Generalización 1:1.000.000; no sirve para barrios |
| HSL GTFS estático ([hsl.zip](https://infopalvelut.storage.hsldev.com/gtfs/hsl.zip)) | HSL | CC BY 4.0 ([HSL Open Data](https://www.hsl.fi/en/hsl/open-data)) | No | 200 · 81 MB · Last-Modified 2026-09-26 | 🟢 |
| HSL GTFS-Realtime ([vehicle-positions](https://realtime.hsl.fi/realtime/vehicle-positions/v2/hsl)) | HSL | CC BY 4.0 | No (vehículos) | 200 | 🟢 |
| Teselas OpenStreetMap | Colaboradores de OSM | ODbL 1.0 ([copyright](https://www.openstreetmap.org/copyright)) | No | 200 | 🟢 Solo fondo; ninguna cifra sale de aquí |
| Visor 3D de Helsinki ([kartta.hel.fi/3d](https://kartta.hel.fi/3d/)) | Ciudad de Helsinki | CC BY 4.0 ([página del modelo](https://www.hel.fi/en/decision-making/information-on-helsinki/maps-and-geospatial-data/helsinki-3d)) | No | **Timeout a los 30 s** | 🟡 **Puede no cargar en la presentación** (ver §5) |

### 2.2 Candidatas

| Fuente | Familia | Productor | Licencia | Prueba (fecha · resultado) | Para qué sirve / nota | Ficha |
| --- | --- | --- | --- | --- | --- | --- |
| StatFin 11ra: población por municipio ([PxWeb](https://pxdata.stat.fi/PxWeb/api/v1/en/StatFin/vaerak/11ra.px)) | población | Statistics Finland | CC BY 4.0 | 09-28 · Helsinki 694.392 · Espoo 325.716 · Vantaa 252.956 · Kauniainen 10.318 (31-12-2025; tabla actualizada 2026-05-29) | **Cifra oficial de población**; denominador de cualquier tasa | — |
| Paavo 2026 `pno_tilasto_2026` (WFS) | territorio | Statistics Finland | CC BY 4.0 | 09-28 · 167 áreas postales, `vuosi` 2026 | Escala intraurbana común a los cuatro municipios: densidad, ingreso, educación, vivienda | [sf-paavo-2026](../catalogo/sf-paavo-2026.md) |
| Paavo por código postal ([PxWeb](https://pxdata.stat.fi/PxWeb/api/v1/en/Postinumeroalueittainen_avoin_tieto/uusin)) | población | Statistics Finland | CC BY 4.0 | 09-28 · 10 tablas, 2010–2024 | Serie histórica; es la otra vía hacia el mismo dato de la WFS | — |
| Rejilla de población 1 km `vaki2025_1km` | territorio | Statistics Finland | CC BY 4.0 | 09-28 · 749 celdas en los 4 municipios | Densidad. Centinela `-1` | [sf-vaestoruutu-1km-2025](../catalogo/sf-vaestoruutu-1km-2025.md) |
| Precio de vivienda usada por código postal (StatFin 13mu) | economía | Statistics Finland | CC BY 4.0 | 09-21 · 200 (solo metadatos) | Costo de vivienda (reemplaza a Numbeo); falta consultar los datos | [statfin-ashi-13mu](../catalogo/statfin-ashi-13mu.md) |
| Series regionales Aluesarjat ([stat.hel.fi](https://stat.hel.fi/api/v1/fi/Aluesarjat/vrm)) | población | Ciudad de Helsinki (Kaupunkitieto) | CC BY 4.0 ([ficha](https://avoindata.suomi.fi/data/fi/dataset/helsingin-seudun-aluesarjat-tilastotietokannan-tiedot-paikkatietona)) | 09-28 · 6 temas de población | Distritos de Helsinki: vivienda, ingreso, empleo, proyección | — |
| Eurostat `urb_cpop1`, FI001C | población | Eurostat | Reutilización libre citando la fuente ([aviso](https://ec.europa.eu/eurostat/help/copyright-notice)) | 09-28 · 674.500 (2024) | **Solo para comparar con otras ciudades**: va un año detrás de StatFin | — |
| Sotkanet ([REST](https://sotkanet.fi/rest/1.1/regions)) | población | THL | CC BY 4.0 ([guía](https://sotkanet.fi/sotkanet/en/ohje/74)) | 09-28 · 540 regiones | Salud y bienestar por municipio. Cruzar por `code`, no por el `id` interno | — |
| Vipunen ([API](https://api.vipunen.fi/api/resources)) | población | Ministerio de Educación / EDUFI | CC BY 4.0 (vía [rOpenGov](https://ropengov.github.io/vipunen/); **reconfirmar**) | 09-28 · 47 conjuntos | Educación por municipio | — |
| Rejilla de población HSY 250 m `Vaestotietoruudukko_2025` | territorio | HSY | CC BY 4.0 (ficha HRI 2026-07-16) | 09-28 · 5.826 celdas · `paivitys_pvm` 2026-08-05 | Densidad fina. Centinela `99` en grupos de edad. Sin código municipal: cruce espacial | [hsy-vaestotietoruudukko-2025](../catalogo/hsy-vaestotietoruudukko-2025.md) |
| Rejilla de edificación HSY 250 m 2025 | territorio | HSY | CC BY 4.0 (ficha HRI 2026-08-04) | 09-21 · 8.663 celdas | Intensidad de edificación. Centinela `999999999` | [hsy-rakennustietoruudukko-2025](../catalogo/hsy-rakennustietoruudukko-2025.md) |
| Cobertura del suelo HSY `maanpeite_*_2024` | ambiente | HSY | CC BY 4.0 ([HSY](https://www.hsy.fi/en/environmental-information/open-data/)) | 09-28 · 1.394.558 polígonos (árboles 2–10 m) | Verde urbano y superficie impermeable; serie 2016–2024 | — |
| Calidad del aire HSY `Ilmanlaatu_nyt` | ambiente | HSY (quien mide) | CC BY 4.0 ([ficha HRI](https://hri.fi/data/fi/dataset/reaaliaikainen-ilmanlaatu-hsyn-ilmanlaadun-mittausasemilla) 2026-03-26) | 09-28 · 13 estaciones | Índice de calidad del aire. La hora viene en texto finés: convertir a ISO | [hsy-ilmanlaatu-nyt](../catalogo/hsy-ilmanlaatu-nyt.md) |
| Consumo de energía del área metropolitana (XLSX) | ambiente | HSY | CC BY 4.0 (ficha HRI 2026-06-12) | 09-21 · 3.947 filas hasta 2025 | Energía por sector y municipio. **Bloques con unidades distintas**: no publicar sin identificar la unidad | [hsy-energiankulutus-pks](../catalogo/hsy-energiankulutus-pks.md) |
| Potencial solar por edificio | ambiente | HSY | CC BY 4.0 (ficha HRI 2021-10-15) | 09-21 · 154.586 polígonos | Es un **modelo**, no una medición, y su vigencia es antigua | [hsy-aurinkosahkopotentiaali](../catalogo/hsy-aurinkosahkopotentiaali.md) |
| Consumo energético de edificios municipales ([Nuuka API](https://helsinki-openapi.nuuka.cloud/api/v1.0/Property/List)) | ambiente | Ciudad de Helsinki | CC BY 4.0 ([ficha HRI](https://hri.fi/data/fi/dataset/helsingin-kaupungin-palvelukiinteistojen-energiankulutustietoja) 2023-06-01) | 09-28 · 1.810 inmuebles, sin llave | Energía medida de edificios públicos. Ficha de 2023: comprobar vigencia | [hel-nuuka-energia](../catalogo/hel-nuuka-energia.md) |
| FMI calidad del aire urbana | ambiente | FMI (redistribuye mediciones de HSY) | CC BY 4.0 ([licencia](https://en.ilmatieteenlaitos.fi/open-data-licence)) | 09-28 · NO2 31,8 µg/m³ a las 17:00Z | Segunda vía para el mismo dato que HSY: comparar y elegir una | — |
| FMI observaciones meteorológicas (Kaisaniemi, fmisid 100971) | ambiente | FMI | CC BY 4.0 ([licencia](https://en.ilmatieteenlaitos.fi/open-data-licence)) | 09-28 · 13,6 °C a las 17:00Z | Clima observado (fuente primaria frente a Open-Meteo) | [fmi-open-data](../catalogo/fmi-open-data.md) |
| Digitraffic TMS/LAM | movilidad | Fintraffic | CC BY 4.0 ([términos](https://www.digitraffic.fi/en/terms-of-service/)) | 09-28 · 518 estaciones (nacional) | Tráfico en vías estatales. **Sin `Accept-Encoding: gzip` responde 406**. No cubre calles municipales | [digitraffic-tms](../catalogo/digitraffic-tms.md) |
| Digitraffic ferroviario | movilidad | Fintraffic | CC BY 4.0 | 09-28 · 563 estaciones | Puntualidad de trenes de cercanías | — |
| Estaciones de bicicleta compartida ([GeoJSON](https://opendata.arcgis.com/datasets/726277c507ef4914b0aec3cbcfcbfafc_0.geojson)) | movilidad | HSL | CC BY 4.0 ([ficha HRI](https://hri.fi/data/fi/dataset/hsl-n-kaupunkipyoraasemat) 2026-06-05) | 09-28 · 200, 170 KB | Ubicación y capacidad, no disponibilidad en vivo. Servido desde ArcGIS Hub | — |
| Extracto OSM Finlandia ([Geofabrik](https://download.geofabrik.de/europe/finland.html)) | territorio | Geofabrik (redistribuye OSM) | ODbL 1.0 | 09-28 · 768 MB · Last-Modified 2026-09-27 | Contraste colaborativo con HSY; archivo fechado | — |
| Overture Maps, edificios | territorio | Overture Maps Foundation | ODbL para edificios ([atribución](https://docs.overturemaps.org/attribution/)) | 09-21 con DuckDB: 258.743 edificios, 66 % con altura, **media ≈ 5 m (sospechosa)** · 09-28: último release 2026-09-23.1 | 🟡 Agregador: altura de edificios para explorar, no fuente de una cifra | [overture-buildings](../catalogo/overture-buildings.md) |
| Helsinki Region Infoshare (CKAN) | catálogo | Ciudad de Helsinki y región | La de cada conjunto | 09-28 · **403 con User-Agent de script o navegador · 200 con el de curl** | 🟡 Sirve para leer licencias; los datos se bajan del productor. Decidir qué User-Agent se usa | — |
| avoindata.suomi.fi (CKAN nacional) | catálogo | DVV | La de cada conjunto | 09-28 · mismo comportamiento que HRI | 🟡 Igual que HRI | — |

### 2.3 Condicionadas (se pueden usar si se cumple la condición)

| Fuente | Productor | Licencia | Prueba | Condición para usarla | Ficha |
| --- | --- | --- | --- | --- | --- |
| Edificios HSY `pks_rakennukset_paivittyva` | HSY | CC BY 4.0 ([ficha HRI](https://hri.fi/data/fi/dataset/paakaupunkiseudun-rakennukset) 2026-04-02) | 09-28 · 154.154 edificios · extracción 2024-04-19 en la muestra | La dirección y el identificador del edificio (`vtj_prt`), junto a calefacción y año, describen un hogar en casas unifamiliares. **Solo agregados** por rejilla o código postal. Centinela `999999999` | [hsy-rakennukset-paivittyva](../catalogo/hsy-rakennukset-paivittyva.md) |
| Rejilla de empleo HSY 2024 | HSY | CC BY 4.0 (ficha HRI 2026-08-26) | 09-21 · 15.445 celdas | Una celda con 1 o 2 empleos puede señalar a un solo empleador: publicar niveles agregados. Centinela `-1` | [hsy-tyopaikkaruudukko-2024](../catalogo/hsy-tyopaikkaruudukko-2024.md) |
| Service Map API v2 ([api.hel.fi](https://api.hel.fi/servicemap/v2/unit/?page_size=1)) | Ciudad de Helsinki y región | CC BY 4.0: la ficha HRI (2025-10-14) cubre la REST v4; para la v2, [dev.hel.fi](https://dev.hel.fi/apis/service-map-backend-api/) | 09-28 · 21.514 unidades | Descartar en la ingesta `contact_person`, `email` y `phone` | [hel-servicemap-v2](../catalogo/hel-servicemap-v2.md) |
| Linked Events ([API](https://api.hel.fi/linkedevents/v1/event/?page_size=1)) | Ciudad de Helsinki | CC BY 4.0 (ficha HRI 2025-04-01); las imágenes `event_only` solo se usan para su evento | 09-28 · 407.244 eventos | No ingerir `provider_contact_info` ni las imágenes `event_only` | — |
| Suomi.fi PTV ([Open API v11](https://api.palvelutietovaranto.suomi.fi/api/v11/ServiceChannel/list/area/Municipality/code/091?page=1)) | DVV | CC0 ([Suomi.fi](https://kehittajille.suomi.fi/palvelut/palvelutietovaranto/ptv-tietojen-hyodyntaminen)) | 09-28 · 80 páginas para Helsinki | No ingerir correos ni teléfonos. Solapa con Service Map | — |
| PRH/YTJ, empresas ([API v3](https://avoindata.prh.fi/opendata-ytj-api/v3/companies?location=Helsinki&page=1)) | PRH | CC BY 4.0 ([PRH](https://avoindata.prh.fi/en)) | 09-28 · 89.936 resultados con `location=Helsinki` | 🔴 los registros individuales, porque el nombre de una empresa unipersonal suele ser el de una persona · 🟡 los conteos por sector y municipio. Nunca pasar registros a la IA | [prh-ytj-v3](../catalogo/prh-ytj-v3.md) |
| Vantaa WFS ([gis.vantaa.fi](https://gis.vantaa.fi/geoserver/wfs)) | Ciudad de Vantaa | CC BY 4.0 ([ficha HRI](https://hri.fi/data/fi/dataset/vantaan-rakennukset) 2024-05-24) | 09-28 · 28 capas | La capa de edificios trae `kiinteistotunnus` (identificador de predio) junto a la dirección: no publicarlos juntos. Cubre un solo municipio; se prefiere HSY | — |
| Espoo WFS ([kartat.espoo.fi](https://kartat.espoo.fi/teklaogcweb/wfs.ashx)) | Ciudad de Espoo | CC BY 4.0 para las capas de [avoindata](https://kartat.espoo.fi/avoindata/) | 09-28 · 256 capas | Mezcla capas abiertas y restringidas: `rakval:RakennusvalvontaAsia` respondió **401**. Usar solo las capas listadas como abiertas | — |

---

## 3. Fuentes rechazadas y su razón

### 3.1 Caídas (el enlace no respondió o respondió con error)

| Fuente | Error exacto | Razón de rechazo y qué la reemplaza | Ficha |
| --- | --- | --- | --- |
| WFS abierta de Helsinki (`kartta.hel.fi/ws/geoserver/avoindata/wfs`) | 09-21: timeout (40 s curl, 45 s script) · 09-28: timeout en cinco intentos de 15 a 40 s; `ECONNREFUSED 137.163.182.125:443` desde otro host | Incumple C6 en dos fases seguidas; parece una restricción geográfica. Los distritos se reemplazan por Paavo y Aluesarjat. Reintentar desde otra red | [hel-avoindata-wfs](../catalogo/hel-avoindata-wfs.md) |
| WFS CityGML del modelo 3D (`kartta.hel.fi/3d/citydb-wfs`) | 09-21: timeout (40 s y 45 s) | Sería la mejor fuente de altura por edificio en Helsinki. Mismo servidor que el anterior. Mientras tanto se usa Overture | [hel-3d-citydb-wfs](../catalogo/hel-3d-citydb-wfs.md) |
| SYKE WFS (`paikkatiedot.ymparisto.fi`) | 09-28: **HTTP 200** con `ows:ExceptionReport exceptionCode="ServiceUnavailable"` | Incumple C6. Muestra que un 200 no garantiza que el servicio funcione. Áreas protegidas y aguas quedan como hueco | — |
| Viajes históricos en bicicleta compartida | 09-28: la ruta que la IA propuso de memoria (`dev.hsl.fi/citybikes/od-trips-2021/`) dio 404 «The specified blob does not exist.» | La [ficha HRI](https://hri.fi/data/fi/dataset/helsingin-ja-espoon-kaupunkipyorilla-ajatut-matkat) existe (CC BY 4.0) y remite a [hsl.fi/hsl/avoin-data](https://www.hsl.fi/hsl/avoin-data#kaupunkipyorilla-ajetut-matkat), que carga los enlaces con JavaScript. **Falta abrirla en un navegador y registrar la URL.** Aun así, solo agregados por estación y hora (C7) | — |
| OpenAhjo, decisiones municipales (`dev.hel.fi/paatokset/v1/`) | 09-28: curl 7, no conecta al puerto 443 · `paatokset.hel.fi/fi/ahjo-proxy` responde 403 | La API Ahjo actual requiere autenticación (C3) y trae nombres de funcionarios (C7). Hueco | — |
| EUBUCCO | 09-21: DNS «Name or service not known» | Incumple C6. Alturas en Europa: se usa Overture | [eubucco](../catalogo/eubucco.md) |

### 3.2 Descartadas (respondieron, pero incumplen un criterio)

| Fuente | Prueba | Criterio | Razón de rechazo | Ficha |
| --- | --- | --- | --- | --- |
| Wikidata, población de Helsinki (Q1757) | 09-28 · 694.392 al 2025-12-31 | C1 | Coincide con StatFin porque lo copia. Cualquiera puede editarlo y nadie responde por él. Si coincide, sobra; si no coincide, está mal | — |
| Numbeo, costo de vida | 09-28 · 200 (HTML) | C1, C2, C3, C8 | Crowdsourcing sin método. Sus [términos](https://www.numbeo.com/common/terms_of_use.jsp) prohíben el scraping y la reutilización comercial, y la API es paga. Para costo de vivienda: StatFin 13mu | — |
| Open-Meteo | 09-28 · 200 | C1 | Intermediario que entrega salidas de modelo, no observaciones. Sus términos no dicen qué fuente usa para Finlandia, y la API gratuita es solo para uso no comercial. FMI está abierta y sin llave | — |
| OpenAQ | 09-28 · 401 «A valid API key must be provided in the X-API-Key header» | C1, C3 | Agregador con llave; redistribuye datos de HSY y FMI | — |
| Fingrid | 09-28 · 401 «missing subscription key» | C3, C5 | Pide llave, y además es un dato nacional sin nada de la ciudad | — |
| Maanmittauslaitos (MML) | 09-21 y 09-28 · 401 sin llave | C3 | La llave es gratuita pero es un secreto que habría que gestionar. Statistics Finland y HSY cubren lo necesario sin llave. Decisión del grupo si se quiere topografía oficial | [mml-maastotietokanta](../catalogo/mml-maastotietokanta.md) |
| Digitransit Routing API | 09-28 · 401 sin `digitransit-subscription-key` | C3 | Paradas y vehículos ya salen de GTFS y GTFS-RT sin llave. Efecto: la disponibilidad de bicicletas en vivo queda como hueco (las estaciones sí están) | — |
| HSL High-frequency positioning (MQTT) | 09-28 · TCP aceptado en `mqtt.hsl.fi:8883` | Arquitectura | Abierta y oficial, pero necesita una conexión persistente que las funciones serverless de Vercel no mantienen. GTFS-RT cubre la necesidad. Queda anotada como segunda herramienta del tramo | — |
| Overpass API | 09-21: timeout en la consulta de edificios · 09-28: estado 200 | C6 (reproducibilidad) | Servicio compartido cuyo resultado cambia en cada consulta: no permite borrar el lago y que vuelva igual. Para edificios: HSY, Overture o Geofabrik | — |
| Copernicus Urban Atlas | 09-28 · 200 (página) | C4 | La última edición es de 2021 y la descarga pasa por otro portal que no se probó. HSY 2024 responde lo mismo con dato más nuevo y más fino | — |
| Kirkanta, bibliotecas | 09-28 · 92 resultados | C2 | La licencia de los datos no está declarada (el repositorio solo dice MIT para el código). Service Map ya incluye las bibliotecas | — |
| Open311, reportes ciudadanos | 09-28 · host antiguo `asiointi.hel.fi`: el DNS no resuelve · host vigente `palautteet.hel.fi/public-api/open311-public-service/v1/`: 200, 198 reportes desde 09-20 | C7 | Funciona (CC BY 4.0, [ficha HRI](https://hri.fi/data/fi/dataset/helsingin-kaupungin-palauterajapinta)), pero cada reporte trae texto libre del ciudadano, foto, dirección y coordenadas. La ciudad publica menos de una décima parte por protección de datos. 🔴. Si el grupo la quiere: solo conteos por `service_code` y área | — |
| Consumo eléctrico por sector (XLSX) | 09-21 · 200 | Redundancia | Es un subconjunto del consumo de energía de HSY | [hsy-sahkonkulutus-pks](../catalogo/hsy-sahkonkulutus-pks.md) |
| Combustible de calefacción por edificio | 09-21 · 154.586 polígonos | C2, C4 | Licencia sin confirmar y sin fecha. Además duplica `lammitysaine_s` de los edificios HSY | [hsy-rakennukset-polttoaine](../catalogo/hsy-rakennukset-polttoaine.md) |
| Atlas de energía y clima de Helsinki | 09-21 · 77.267 edificios | C8 (utilidad) | Clase energética solo en 422 edificios (0,5 %): un mapa de eficiencia sería engañoso | [hel-energia-ilmastoatlas](../catalogo/hel-energia-ilmastoatlas.md) |
| CityGML Kalasatama 2019 | 09-21 · 206 | C4, C5 | Un solo barrio, de 2019 | [hel-3d-citygml-kalasatama](../catalogo/hel-3d-citygml-kalasatama.md) |
| Microsoft Global ML Buildings | 09-21 · 352 teselas de Finlandia | Redundancia | Ya viene incluida en Overture | [ms-global-ml-buildings](../catalogo/ms-global-ml-buildings.md) |

### 3.3 No existen para la ciudad

| Fuente | Prueba | Razón | Ficha |
| --- | --- | --- | --- |
| Inside Airbnb | 09-28 · la página de descargas no lista ninguna ciudad finlandesa | No cubre Helsinki. Si la cubriera sería 🔴: datos obtenidos por scraping y con nombres de anfitriones | — |
| Google Open Buildings | 09-21 · la página del proyecto no incluye Finlandia ni Europa | Sustituto para alturas: Overture | [google-open-buildings](../catalogo/google-open-buildings.md) |

---

## 4. Valores centinela (van al contrato de datos y a `verificar.py`)

| Fuente | Valor | Significa |
| --- | --- | --- |
| Rejilla de población 1 km (Statistics Finland) | `-1` | Dato protegido (pocas personas) |
| Rejilla de población 250 m (HSY) | `99` en grupos de edad | Dato protegido. Ejemplo: una celda con 6 habitantes trae 99 en los nueve grupos de edad (9 × 99 > 6) |
| Edificios HSY y rejilla de edificación | `999999999` | Sin dato |
| Rejilla de empleo (HSY) | `-1` | Dato protegido |
| Consumo de energía HSY (XLSX) | Bloques repetidos con distinta unidad | Leer la unidad de cada bloque antes de usarlo |
| Potencial solar (HSY) | `0` | Puede ser un 0 real o "no calculado" |

Ninguno de estos valores puede llegar al mapa como número.

## 5. Hallazgos que afectan al sistema

1. **Puede que el visor 3D no cargue en la presentación.** `kartta.hel.fi` no respondió desde Colombia en ninguna de las dos fases, y es el host del iframe de la vista 3D. Hay que probarlo en el teléfono y en la red de la universidad. Si falla, conviene enlazarlo en vez de embeberlo.
2. **El User-Agent decide el acceso a HRI y avoindata.** Responden 403 a un User-Agent descriptivo y a uno de navegador, pero 200 al de curl. El grupo debe decidir cuál usa y dejarlo escrito.
3. **Un HTTP 200 no significa que funcione.** SYKE responde 200 con un error dentro. La ingesta y la verificación deben revisar el contenido.
4. **La población oficial es una sola: StatFin.** Da 694.392 habitantes para Helsinki al 31-12-2025. Eurostat da 674.500 para 2024, y Wikidata copia la cifra de StatFin.
5. **"Público no es inocuo."** Hay datos abiertos que exponen hogares o personas: la dirección por edificio en HSY, el identificador de predio en Vantaa, los contactos en Service Map y PTV, las empresas unipersonales en PRH, y el texto y las fotos de Open311.
6. **Los conteos cambian entre fechas.** Service Map dio 21.508 unidades el 09-21 y 21.514 el 09-28; PRH dio 89.816 y 89.936. Cada cifra que se publique lleva su fecha de prueba.
7. **Cruzar por código, nunca por nombre.** StatFin usa `KU091`, la WFS de Statistics Finland `kunta='091'` y Sotkanet `code='091'` (con un `id=46` interno distinto). Las rejillas de HSY no traen código: hay que hacer un cruce espacial con los polígonos.

## 6. Huecos: lo que no se consiguió para la ciudad

- **Distritos oficiales de Helsinki por WFS** (kartta.hel.fi caído). Alternativa: Paavo y Aluesarjat.
- **Altura oficial por edificio** (WFS CityGML caído). Alternativa: Overture, con la distribución de alturas por revisar.
- **Energía por edificio:** el atlas trae clase energética en el 0,5 % de los edificios y no se encontró registro de certificados. Sí hay energía por sector y municipio (HSY) y medida en edificios públicos (Nuuka).
- **Bicicletas:** no hay disponibilidad en vivo (Digitransit pide llave) y falta la URL de los viajes históricos. Las estaciones sí están.
- **Decisiones municipales:** la API está caída o pide autenticación.
- **Alquiler de corta estancia:** no hay fuente abierta.
- **Áreas protegidas y calidad de aguas:** SYKE caído.

## 7. Conciliación de los dos rastreos (2026-09-28)

| Punto | Rastreo de `docs/` | Rastreo de `catalogo/` | Decisión |
| --- | --- | --- | --- |
| Paavo | `pno_tilasto_2025`, 168 áreas | `pno_tilasto_2026`, 167 áreas | **Se adopta 2026**. Reprobada el 09-28: 167 áreas, `vuosi` 2026 |
| Edificios HSY | 🟢 | 🟡 por dirección → hogar | **🟡, condicionada**. La propia ficha de `docs/` ya pedía no publicar direcciones |
| Rejilla HSY 250 m | 🟡 por el `99` | 🟢 con la condición `99` → nulo | **🟢**, por la regla del semáforo (§1): el centinela va a `verificar.py` |
| Overture | Prueba = listar releases | Prueba = consulta DuckDB | **Se adopta la prueba DuckDB** (más fuerte, y cuenta como exploración de herramienta) |
| Nuuka | Licencia no verificada (403 en HRI) | CC BY 4.0 (ficha HRI) | **CC BY 4.0, candidata**. Confirmado el 09-28 leyendo la ficha HRI con el User-Agent de curl |
| HRI y avoindata | "Caídos" (403) | 403 que depende del User-Agent | **Error de `docs/` corregido**: pasan a candidatas como catálogo |
| Licencias de FMI, Digitraffic, HSY aire y PRH | Leídas en la página del productor | "Por verificar" | **Se adoptan las verificadas**, y se actualizaron las fichas de `catalogo/` |
| Rejilla 1 km | Conteo nacional (96.904) | 749 celdas en los 4 municipios, centinela `-1` | **Se adopta el conteo filtrado**, reprobado el 09-28 |

## 8. Pendientes para cerrar el tramo

- Reintentar `kartta.hel.fi` (WFS y 3D), SYKE y EUBUCCO desde otra red, y anotar la fecha.
- Abrir [hsl.fi/hsl/avoin-data](https://www.hsl.fi/hsl/avoin-data#kaupunkipyorilla-ajetut-matkat) en un navegador y registrar la URL de los viajes en bicicleta.
- Reconfirmar la licencia de Vipunen en la página del productor. Consultar datos, no solo metadatos, de StatFin 13mu.
- Revisar la distribución de alturas de Overture (media ≈ 5 m).
- Explorar con dos herramientas sobre los mismos datos. Ya hay DuckDB sobre Overture; falta QGIS o una segunda herramienta, comparando con los pisos de HSY.
- Decidir qué User-Agent se usa para consultar HRI y avoindata.

## 9. Bitácora de IA de esta investigación

| Qué se encargó | Qué entregó la IA | Qué se corrigió |
| --- | --- | --- |
| Buscar, probar y clasificar fuentes (Claude Code, 2026-09-28) | 49 fuentes probadas con petición real, clasificadas con los criterios de la §1 | **Rutas propuestas de memoria que fallaron:** la tabla de StatFin (`statfin_vaerak_pxt_11ra.px` dio 400; la correcta es `11ra.px`), el parámetro de Eurostat (`geo=` dio 400; el correcto es `cities=`), Digitransit (GET dio 404; es POST GraphQL con llave) y la ruta de bicicletas de HSL (404) |
| Licencias | Supuso CC BY 4.0 para PTV | La documentación de Suomi.fi dice **CC0**. Se corrigió |
| Protección | Primera lectura de la grilla HSY | Los `99` se detectaron como centinela porque eran imposibles como conteo |
| Acceso a HRI y avoindata | Los clasificó como caídos por dar 403 | **Error de la IA:** probó con dos User-Agent y no con el de curl. El rastreo de `catalogo/` ya lo había detectado. Corregido el 09-28 |
| Open311 | Lo dio por caído (DNS) | La documentación oficial de 2025 apunta a un host nuevo que responde. Sigue descartado, pero por personas y no por acceso |
| Paavo | Usó la capa 2025 | Existe la capa 2026 (la detectó el rastreo de `catalogo/`). Corregido |
| Formato del entregable | Primero generó una ficha `.md` por fuente y un script de prueba | El grupo pidió un documento único más el JSON, sin script. Luego se pidió unificar con `catalogo/`: este índice enlaza sus fichas |

Algunas licencias se confirmaron con la ficha de HRI y no en la página del propio productor: Aluesarjat, Vantaa, Nuuka, las capas de HSY y Open311. Queda registrada la fecha de modificación de cada ficha.
