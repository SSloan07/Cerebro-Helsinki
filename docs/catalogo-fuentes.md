# Catálogo de fuentes de datos — Cerebro Helsinki

Tramo **Rastreo** del Taller de Datos. Cubre Helsinki (091), Espoo (049), Vantaa (092) y Kauniainen (235).

- **Fecha de prueba:** 2026-09-28, entre las 17:30 y las 17:50 UTC, desde Colombia.
- **Método:** cada fuente se probó con una petición HTTP real al recurso (curl y Python `urllib`, User-Agent `CerebroHelsinki-catalog-probe/0.1`). Se anotó el código HTTP o el error exacto, y una evidencia mínima: conteos, fechas o valores agregados, nunca registros de personas. La licencia se leyó en la página del productor. Cuando no se pudo leer ahí, figura como **no verificada**.
- **Regla:** ninguna fuente entra al catálogo solo porque la IA la propuso. Si el enlace no respondió, la fuente queda como caída y se anota el error.
- **Resultado:** 49 fuentes en 7 familias (territorio, población, economía, movilidad, ambiente, servicios, catálogos): 5 integradas · 17 candidatas · 8 condicionadas · 6 caídas · 12 descartadas · 1 no existe para la ciudad.
- **Versión para máquina:** [catalogo/fuentes.json](catalogo/fuentes.json). Trae los mismos campos por fuente, el recurso probado (`prueba`) y el resultado observado (`ultima_prueba`). Si se cambia una fuente, hay que actualizar los dos archivos.

---

## 1. Criterios para aceptar una fuente en el cerebro digital

Para ser **candidata**, una fuente debe cumplir los ocho criterios. Si incumple uno que se puede resolver, queda **condicionada** y la condición se escribe. Si incumple uno que no se puede resolver, queda **descartada**.

| # | Criterio | Cuándo se rechaza |
| --- | --- | --- |
| C1 | **Productor identificable y primario**: la entidad que mide o registra el dato | Agregadores, copias editables por cualquiera, crowdsourcing sin método |
| C2 | **Licencia abierta y explícita** (CC BY 4.0, CC0, ODbL), leída en la fuente | Licencia no declarada, términos que prohíben reutilizar o bajar por script |
| C3 | **Sin llave paga**; se prefiere también sin registro | Llave paga. Una llave gratuita obliga a guardar un secreto, así que solo se acepta si no hay alternativa sin llave |
| C4 | **Vigencia declarada**: periodo de referencia o fecha de actualización | Sin fecha, o superada por otra fuente más nueva para la misma pregunta |
| C5 | **Cobertura de los cuatro municipios, con código territorial** | Cobertura solo nacional, o cruce posible solo por nombre |
| C6 | **Acceso reproducible por script**: HTTP 2xx y formato legible por máquina | Timeout, DNS, 403/404, o un 200 que en realidad trae un error |
| C7 | **Sin datos de personas**, o solo agregados o suprimidos | Texto libre de ciudadanos, nombres, trayectos individuales |
| C8 | **Metodología documentada** | Cifras sin método ni muestreo conocido |

Semáforo: 🟢 se puede usar · 🟡 se puede usar con la condición escrita · 🔴 no se puede usar tal como está.

---

## 2. Fuentes aceptadas

### 2.1 Integradas (ya están en el sistema)

| Fuente | Productor | Licencia | Personas | Prueba 2026-09-28 | Semáforo / nota |
| --- | --- | --- | --- | --- | --- |
| Límites municipales 2025 `kunta1000k_2025` ([WFS](https://geo.stat.fi/geoserver/wfs)) | Statistics Finland | CC BY 4.0 ([términos](https://stat.fi/en/about-us/get-to-know-statistics-finland/legislation/terms-of-use)) | No | 200 · 4 polígonos | 🟢 Generalización 1:1.000.000; no sirve para barrios |
| HSL GTFS estático ([hsl.zip](https://infopalvelut.storage.hsldev.com/gtfs/hsl.zip)) | HSL | CC BY 4.0 ([HSL Open Data](https://www.hsl.fi/en/hsl/open-data)) | No | 200 · 81 MB · Last-Modified 2026-09-26 | 🟢 |
| HSL GTFS-Realtime ([vehicle-positions](https://realtime.hsl.fi/realtime/vehicle-positions/v2/hsl)) | HSL | CC BY 4.0 | No (vehículos) | 200 | 🟢 |
| Teselas OpenStreetMap | Colaboradores de OSM | ODbL 1.0 ([copyright](https://www.openstreetmap.org/copyright)) | No | 200 | 🟢 Solo fondo; ninguna cifra sale de aquí |
| Visor 3D de Helsinki ([kartta.hel.fi/3d](https://kartta.hel.fi/3d/)) | Ciudad de Helsinki | CC BY 4.0 ([página del modelo](https://www.hel.fi/en/decision-making/information-on-helsinki/maps-and-geospatial-data/helsinki-3d)) | No | **Timeout a los 30 s** | 🟡 **Hallazgo:** el iframe de `src/main.jsx` no carga desde Colombia (ver §4) |

### 2.2 Candidatas (cumplen los ocho criterios)

| Fuente | Familia | Productor | Licencia | Personas | Vigencia | Prueba 2026-09-28 | Para qué sirve |
| --- | --- | --- | --- | --- | --- | --- | --- |
| StatFin 11ra: población por municipio ([PxWeb](https://pxdata.stat.fi/PxWeb/api/v1/en/StatFin/vaerak/11ra.px)) | población | Statistics Finland | CC BY 4.0 | No (agregado) | Serie 1990–2025, al 31-dic; tabla actualizada 2026-05-29 | 200 · Helsinki 694.392 · Espoo 325.716 · Vantaa 252.956 · Kauniainen 10.318 (2025) | **Cifra oficial de población**; denominador de cualquier tasa |
| Áreas postales + Paavo 2025 `pno_tilasto_2025` ([WFS](https://geo.stat.fi/geoserver/wfs)) | territorio | Statistics Finland | CC BY 4.0 | Agregado por área postal | vuosi = 2025 | 200 · 168 áreas en los 4 municipios | Escala intraurbana común a los cuatro municipios |
| Paavo por código postal ([PxWeb](https://pxdata.stat.fi/PxWeb/api/v1/en/Postinumeroalueittainen_avoin_tieto/uusin)) | población | Statistics Finland | CC BY 4.0 | Agregado | Tablas 2010–2024, actualizadas 2026-01-21 | 200 · 10 tablas | Serie histórica por área postal; es la otra vía hacia el mismo dato de la WFS |
| Grilla de población 1 km `vaki2025_1km` ([WFS](https://geo.stat.fi/geoserver/wfs)) | territorio | Statistics Finland | CC BY 4.0 | Agregado por celda | 2025 | 200 · 96.904 celdas (nacional) | Densidad; contraste con la grilla HSY de 250 m |
| Series regionales Aluesarjat ([stat.hel.fi](https://stat.hel.fi/api/v1/fi/Aluesarjat/vrm)) | población | Ciudad de Helsinki (Kaupunkitieto) | CC BY 4.0 ([ficha](https://avoindata.suomi.fi/data/fi/dataset/helsingin-seudun-aluesarjat-tilastotietokannan-tiedot-paikkatietona)) | Agregado | Por tabla, más de 150 series | 200 · 6 temas de población | Distritos de Helsinki: vivienda, ingreso, empleo, proyección |
| Eurostat `urb_cpop1`, ciudad FI001C ([API](https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/urb_cpop1?cities=FI001C&indic_ur=DE1001V&format=JSON&lang=EN)) | población | Eurostat | Reutilización libre citando la fuente ([aviso](https://ec.europa.eu/eurostat/help/copyright-notice)) | No | Último dato 2024 | 200 · 674.500 (2024) | **Solo para comparar con otras ciudades**. Va un año detrás de StatFin |
| Sotkanet ([REST](https://sotkanet.fi/rest/1.1/regions)) | población | THL | CC BY 4.0; citar THL, Sotkanet y el productor del indicador | Agregado | Por indicador | 200 · 540 regiones | Salud y bienestar por municipio. Cruzar por `code`, no por el `id` interno |
| Vipunen ([API](https://api.vipunen.fi/api/resources)) | población | Ministerio de Educación / EDUFI | CC BY 4.0 (confirmado en [rOpenGov](https://ropengov.github.io/vipunen/), reconfirmar con el productor) | Agregado | Por conjunto | 200 · 47 conjuntos | Educación por municipio |
| Edificios HSY `pks_rakennukset_paivittyva` ([WFS](https://kartta.hsy.fi/geoserver/wfs)) | territorio | HSY | CC BY 4.0 ([HSY open data](https://www.hsy.fi/en/environmental-information/open-data/)) | Dirección del edificio, sin nombres | Actualización continua | 200 · 154.154 edificios | Edificios de los 4 municipios en una sola capa. Reemplaza a Overpass |
| Cobertura del suelo HSY `maanpeite_*_2024` | ambiente | HSY | CC BY 4.0 | No | Serie 2016–2024 cada 2 años | 200 · 1.394.558 polígonos (clase árboles 2–10 m) | Verde urbano y superficie impermeable |
| Calidad del aire HSY `Ilmanlaatu_nyt` | ambiente | HSY (quien mide) | CC BY 4.0 | No | Casi tiempo real | 200 · 13 estaciones | Índice de calidad del aire |
| FMI calidad del aire urbana ([WFS](https://opendata.fmi.fi/wfs)) | ambiente | FMI (redistribuye mediciones de HSY) | CC BY 4.0 ([licencia](https://en.ilmatieteenlaitos.fi/open-data-licence)) | No | Horaria | 200 · último NO2 31,8 µg/m³ a las 17:00Z | Segunda vía para el mismo dato que HSY: comparar y elegir una |
| FMI observaciones, Kaisaniemi (fmisid 100971) | ambiente | FMI | CC BY 4.0 | No | Horaria | 200 · 13,6 °C a las 17:00Z | Clima observado (fuente primaria frente a Open-Meteo) |
| Digitraffic TMS/LAM ([API](https://tie.digitraffic.fi/api/tms/v1/stations)) | movilidad | Fintraffic | CC BY 4.0 ([términos](https://www.digitraffic.fi/en/terms-of-service/)) | No | Tiempo real | 200 · 518 estaciones (nacional) | Tráfico en vías estatales. **Sin `Accept-Encoding: gzip` responde 406**. No cubre calles municipales |
| Digitraffic ferroviario ([API](https://rata.digitraffic.fi/api/v1/metadata/stations)) | movilidad | Fintraffic | CC BY 4.0 | No | Tiempo real | 200 · 563 estaciones | Puntualidad de trenes de cercanías |
| Extracto OSM Finlandia ([Geofabrik](https://download.geofabrik.de/europe/finland.html)) | territorio | Geofabrik (redistribuye OSM) | ODbL 1.0 | No | Diario | 200 · 768 MB · Last-Modified 2026-09-27 | Contraste colaborativo con HSY. Es un archivo fechado, a diferencia de Overpass |
| Overture Maps ([S3](https://overturemaps-us-west-2.s3.amazonaws.com/?list-type=2&prefix=release/&delimiter=/)) | territorio | Overture Maps Foundation | CDLA-Permissive-2.0 / ODbL según el tema ([atribución](https://docs.overturemaps.org/attribution/)) | Revisar `places` | Release 2026-09-23.1 | 200 | 🟡 Agregador: sirve para explorar con DuckDB, no como fuente de una cifra |

### 2.3 Condicionadas (se pueden usar si se cumple la condición)

| Fuente | Productor | Licencia | Prueba 2026-09-28 | Condición para usarla |
| --- | --- | --- | --- | --- |
| Grilla de población HSY 250 m `Vaestotietoruudukko_2025` | HSY | CC BY 4.0 | 200 · 5.826 celdas · `paivitys_pvm` 2026-08-05 | **Código centinela.** En la muestra, una celda con `asukkaita = 6` trae los nueve grupos de edad en `99`, algo imposible como conteo (9 × 99 > 6). El 99 significa "suprimido". Hay que convertirlo a nulo en la ingesta, y la verificación debe fallar si queda un 99. Es el mismo tipo de error que tuvo el caso Lima con una variable en cero |
| Service Map API v2 ([api.hel.fi/servicemap](https://api.hel.fi/servicemap/v2/unit/?page_size=1)) | Ciudad de Helsinki y región | CC BY 4.0 ([dev.hel.fi](https://dev.hel.fi/apis/service-map-backend-api/)); la página de la API v4 no declara licencia | 200 · 21.514 unidades | El bloque `connections` trae los campos `contact_person`, `email` y `phone`. Hay que descartarlos en la ingesta |
| Linked Events ([API](https://api.hel.fi/linkedevents/v1/event/?page_size=1)) | Ciudad de Helsinki | CC BY 4.0; las imágenes `event_only` solo se usan para su evento | 200 · 407.244 eventos | No ingerir `provider_contact_info` ni las imágenes `event_only` |
| Suomi.fi PTV ([Open API v11](https://api.palvelutietovaranto.suomi.fi/api/v11/ServiceChannel/list/area/Municipality/code/091?page=1)) | DVV | CC0 ([Suomi.fi](https://kehittajille.suomi.fi/palvelut/palvelutietovaranto/ptv-tietojen-hyodyntaminen)) | 200 · 80 páginas para Helsinki (1,4 MB por página) | Los canales traen correos y teléfonos, a veces de personas: no ingerirlos. Solapa con Service Map |
| PRH/YTJ, empresas ([API v3](https://avoindata.prh.fi/opendata-ytj-api/v3/companies?location=Helsinki&page=1)) | PRH | CC BY 4.0 ([PRH](https://avoindata.prh.fi/en)) | 200 · 89.936 resultados con `location=Helsinki` | El nombre de una empresa unipersonal puede ser el de una persona: **publicar solo conteos por sector y municipio**. Confirmar si `location` filtra por domicilio o por dirección postal |
| Vantaa WFS ([gis.vantaa.fi](https://gis.vantaa.fi/geoserver/wfs)) | Ciudad de Vantaa | CC BY 4.0 ([ficha](https://avoindata.suomi.fi/data/fi/dataset/vantaan-rakennukset)) | 200 · 28 capas | La capa de edificios trae `kiinteistotunnus` (identificador de predio) junto a la dirección, y con él se puede llegar al propietario. No publicar ambos juntos. Cubre un solo municipio: para edificios se prefiere HSY |
| Espoo WFS ([kartat.espoo.fi](https://kartat.espoo.fi/teklaogcweb/wfs.ashx)) | Ciudad de Espoo | CC BY 4.0 para las capas de [avoindata](https://kartat.espoo.fi/avoindata/) | 200 · 256 capas | Mezcla capas abiertas y restringidas: `rakval:RakennusvalvontaAsia` (expedientes de licencias de construcción) respondió **401**. Usar solo las capas listadas como abiertas |
| Consumo energético de edificios municipales ([Nuuka API](https://helsinki-openapi.nuuka.cloud/api/v1.0/Property/List)) | Ciudad de Helsinki (operado por Nuuka) | **No verificada**: la ficha está en HRI, que dio 403 | 200 · 1.810 inmuebles, sin llave | No se integra hasta leer la licencia. Por ahora solo hay un comunicado de prensa |

---

## 3. Fuentes rechazadas y su razón

### 3.1 Caídas (el enlace no respondió o respondió con error)

| Fuente | Error exacto (2026-09-28) | Razón de rechazo y qué la reemplaza |
| --- | --- | --- |
| WFS abierta de la ciudad de Helsinki (`kartta.hel.fi/ws/geoserver/avoindata/wfs`) | Timeout (curl 28) en cinco intentos con límites de 15 a 40 s; `ECONNREFUSED 137.163.182.125:443` desde un segundo host | Incumple C6. Parece una restricción geográfica. Los distritos de Helsinki se reemplazan por áreas postales de Statistics Finland y por Aluesarjat. Reintentar desde otra red |
| SYKE WFS (`paikkatiedot.ymparisto.fi/geoserver/wfs`) | **HTTP 200** con `ows:ExceptionReport exceptionCode="ServiceUnavailable"` (dos intentos) | Incumple C6. Muestra que un 200 no garantiza que el servicio funcione. Áreas protegidas y aguas quedan como hueco |
| HSL, viajes históricos de bicicleta (`dev.hsl.fi/citybikes/od-trips-2021/`) | HTTP 404 «The specified blob does not exist.» | Incumple C6. **La ruta la propuso la IA de memoria** y no existe. Además serían trayectos individuales con hora exacta (C7, 🔴) |
| OpenAhjo, decisiones municipales (`dev.hel.fi/paatokset/v1/`) | curl 7: no conecta al puerto 443; `paatokset.hel.fi/fi/ahjo-proxy` responde 403 | Incumple C6. La API Ahjo actual requiere autenticación (C3). Trae nombres de funcionarios (C7). Queda como hueco |
| Helsinki Region Infoshare, catálogo CKAN (`hri.fi/data/api/3/...`) | HTTP 403 Forbidden, con User-Agent de script y de navegador, y también desde un segundo host | Es un catálogo, no una fuente: los datos se bajan del productor. Consecuencia: no se pudieron leer licencias que solo publica HRI (Nuuka) |
| avoindata.fi / avoindata.suomi.fi, catálogo nacional | HTTP 403 en los dos dominios | Igual que HRI |

### 3.2 Descartadas (respondieron, pero incumplen un criterio)

| Fuente | Prueba 2026-09-28 | Criterio | Razón de rechazo |
| --- | --- | --- | --- |
| Wikidata, población de Helsinki (Q1757) | 200 · 694.392 al 2025-12-31 | C1 | El valor coincide con StatFin porque lo copia. Cualquiera puede editarlo y no hay una entidad responsable de mantenerlo. Si coincide con la fuente oficial, sobra; si no coincide, está mal. Se cita StatFin |
| Numbeo, costo de vida | 200 (HTML) | C1, C2, C3, C8 | Crowdsourcing sin muestreo ni método. Sus [términos](https://www.numbeo.com/common/terms_of_use.jsp) prohíben el scraping y la reutilización comercial, y la API es paga |
| Open-Meteo | 200 | C1 | Intermediario privado que entrega salidas de modelo, no observaciones. Sus términos no dicen qué fuente usa para Finlandia, y la API gratuita es solo para uso no comercial. La fuente primaria (FMI) está abierta y sin llave |
| OpenAQ | 401 «A valid API key must be provided in the X-API-Key header» | C1, C3 | Agregador con llave. Redistribuye datos que ya se obtienen de HSY y FMI sin llave |
| Fingrid | 401 «missing subscription key» | C3, C5 | Pide llave, y además es un dato nacional que no dice nada de la ciudad |
| Maanmittauslaitos (MML), APIs abiertas | 401 en OGC API Features y WMTS | C3 | La llave es gratuita pero exige registro y guardar un secreto. Lo que aporta ya lo cubren Statistics Finland y HSY sin llave |
| Digitransit Routing API (GraphQL) | 401 sin `digitransit-subscription-key` | C3 | Llave gratuita con registro. Paradas y vehículos ya salen de GTFS y GTFS-RT. **Efecto:** las bicicletas compartidas en vivo quedan como hueco |
| HSL High-frequency positioning (MQTT `mqtt.hsl.fi:8883`) | TCP aceptado | Arquitectura | Es abierta y oficial (🟢), pero necesita una conexión persistente que las funciones serverless de Vercel no mantienen, y el volumen es alto. GTFS-RT cubre la necesidad. Queda anotada como segunda herramienta del tramo |
| Overpass API (edificios OSM) | Estado 200 con 2 cupos libres. La consulta de edificios hizo timeout el 2026-09-21 | C6 (reproducibilidad) | Servicio compartido sin garantía, cuyo resultado cambia en cada consulta: no permite borrar el lago y que vuelva igual. Para edificios, HSY. Para contrastar con OSM, el extracto fechado de Geofabrik |
| Copernicus Urban Atlas | 200 (página) | C4 | La última edición es de 2021 y la descarga pasa por otro portal que no se probó. HSY 2024 responde la misma pregunta con un dato más nuevo y más fino. Se reconsidera solo si hace falta comparar con otras ciudades europeas |
| Kirkanta, bibliotecas | 200 · 92 resultados | C2 | La licencia de los datos no está declarada: el repositorio solo dice MIT para el código. Service Map ya incluye las bibliotecas con CC BY 4.0 |
| API de reportes ciudadanos Open311 (`asiointi.hel.fi/palautews`) | curl 6: el DNS no resuelve el host | C6, C7 | Además de estar caída, es texto libre escrito por ciudadanos, con ubicación. La propia ciudad publica menos de una décima parte por protección de datos. 🔴 aunque vuelva a funcionar |

### 3.3 No existe para la ciudad

| Fuente | Prueba | Razón |
| --- | --- | --- |
| Inside Airbnb | 200 · la página de descargas no lista ninguna ciudad finlandesa | No cubre Helsinki. Aunque la cubriera sería 🔴: los datos se obtienen por scraping y los listados de otras ciudades traen el nombre del anfitrión |

---

## 4. Hallazgos que afectan al sistema

1. **Puede que el visor 3D no cargue en la presentación.** `kartta.hel.fi` no respondió desde Colombia en ningún intento, y es el host del iframe de la vista 3D. Hay que probarlo en el teléfono y en la red de la universidad. Si falla, conviene enlazarlo en vez de embeberlo.
2. **Los catálogos oficiales (HRI y avoindata) dan 403 desde fuera.** Por eso hay licencias que no se pudieron confirmar (Nuuka). Se buscó la licencia en la página del productor. Cuando no estaba, la fuente quedó condicionada.
3. **Un HTTP 200 no significa que funcione.** SYKE responde 200 con un error dentro. La ingesta y la verificación deben revisar el contenido, no solo el código HTTP.
4. **Hay valores centinela.** El 99 de HSY es una supresión, no un dato. El mismo riesgo existe en Paavo y en la grilla de 1 km: revisar sus códigos de supresión antes de integrarlas.
5. **La población oficial es una sola.** StatFin 11ra da 694.392 habitantes para Helsinki al 31-12-2025. Eurostat da 674.500 para 2024, un año de rezago. Wikidata repite la cifra de StatFin. Toda cifra de población del sistema debe salir de StatFin.
6. **"Público no es inocuo."** Vantaa publica el identificador de predio junto a la dirección, Service Map y PTV traen campos de contacto, y PRH incluye nombres de empresas unipersonales. Son fuentes abiertas, pero hay que filtrar esos campos antes de publicar.
7. **Cruzar por código, nunca por nombre.** StatFin usa `KU091`, Statistics Finland WFS usa `kunta='091'` y Sotkanet usa `code='091'` con un `id=46` interno distinto.

## 5. Huecos: lo que no se consiguió para la ciudad

- Distritos oficiales de Helsinki por WFS (kartta.hel.fi caído). **Alternativa:** áreas postales y Aluesarjat.
- Bicicletas compartidas: la API en vivo pide llave y el histórico está caído.
- Decisiones municipales: la API está caída o exige autenticación.
- Reportes ciudadanos: caído, y además 🔴 por personas.
- Alquiler de corta estancia: no hay fuente abierta.
- Áreas protegidas y calidad de aguas (SYKE caído).
- Energía urbana con licencia confirmada: Nuuka sigue pendiente.

## 6. Pendientes para cerrar el tramo

- Reintentar desde otra red `kartta.hel.fi`, `hri.fi`, `avoindata.suomi.fi` y SYKE, y actualizar este documento con la fecha del nuevo intento.
- Leer la licencia de Nuuka y la de Vipunen en la página del productor.
- Revisar los códigos de supresión de Paavo y de la grilla de 1 km.
- Explorar con dos herramientas sobre los mismos datos. Sugerencia: DuckDB y QGIS, comparando edificios de HSY, Overture y OSM (Geofabrik) en un mismo municipio.

## 7. Bitácora de IA de esta investigación

| Qué se encargó | Qué entregó la IA | Qué se corrigió |
| --- | --- | --- |
| Buscar, probar y clasificar fuentes para Helsinki (Claude Code, 2026-09-28) | 49 fuentes probadas con petición real, clasificadas según los criterios de la §1 | **Rutas propuestas de memoria que fallaron:** la tabla de StatFin (`statfin_vaerak_pxt_11ra.px` dio 400; la correcta es `11ra.px`), la variable de Eurostat (`geo=` dio 400; la correcta es `cities=`), Digitransit (GET dio 404; es POST GraphQL y pide llave), bicicletas de HSL (404, no existe) y el dominio del catálogo nacional (avoindata.fi pasó a avoindata.suomi.fi, y los dos dan 403) |
| Licencias | Supuso CC BY 4.0 para PTV | La documentación de Suomi.fi dice **CC0**. Se corrigió |
| Protección | Primera lectura de la grilla HSY | Los valores 99 se detectaron como centinela porque eran imposibles como conteo (9 × 99 > 6) |
| Formato del entregable | Primero generó una ficha `.md` por fuente y un script de prueba | El grupo pidió **un solo documento sin script**. Se consolidó todo en este documento más `catalogo/fuentes.json`. Se eliminaron las fichas por fuente, el script y los archivos intermedios |

Algunas licencias se confirmaron a partir de resultados de búsqueda que citaban la página del productor, porque el catálogo HRI no respondía: Aluesarjat, Vantaa, Espoo y PTV. Antes de la entrega, alguien del grupo debería abrir esas páginas y confirmarlas.
