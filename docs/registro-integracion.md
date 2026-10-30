# Registro de integración de fuentes

Archivo de coordinación para que varias personas o sesiones de IA no integren la misma fuente a la vez ni se pisen los archivos.

## Cómo usarlo

1. **Antes de empezar**, sigue estos pasos en orden:
   - Haz `git pull`.
   - Busca la fuente en la tabla. Si está «en curso» con otra persona o sesión, **no la toques**: elige otra o coordina.
   - Ponla «en curso» con tu nombre o sesión, la rama y la fecha.
   - **Commit y push solo de este archivo**, para dejarla reclamada.
2. **Mientras trabajas**, toca solo los archivos que declaraste en la columna «Archivos». Si necesitas otro compartido (`run.py`, `libros.js`, `verificar.py`), anótalo antes.
3. **Al terminar**, haz tres cosas:
   - Pasa la fuente a «integrada» (o «bloqueada», con el motivo).
   - Escribe una entrada en la bitácora de abajo, **con lo que se corrigió**, porque el taller lo exige.
   - Actualiza `docs/fuentes-por-consultar.md` y la tabla de estado de `docs/guia-implementacion-front.md`.

Estados: `libre` · `en curso` · `integrada` · `bloqueada` (con motivo).
Los ids son los de `docs/catalogo/fuentes.json` (el índice unificado de 63 fuentes).

## Tabla de reparto

| Fuente (id) | Alimenta | Estado | Quién / sesión | Rama | Desde | Archivos |
|---|---|---|---|---|---|---|
| `stat-fi-postal-areas-paavo` | Habitar 1–3 · Investigar 1, 2 y desempleo · Aprender 1 | **integrada** | Claude (sesión de Alejo) | `feat/biblioteca-front` | 2026-10-27 | `etl/helsinki/sources/paavo.py`, `public/data/postal_areas.geojson`, `src/biblioteca/pliegosAreas.jsx` |
| `statfin-population-11ra` | Llegar 2 | **integrada** | Claude (sesión de Alejo) | `feat/biblioteca-front` | 2026-10-27 | `etl/helsinki/sources/poblacion.py`, `public/data/population.json` |
| `statfin-rents-15fa` · `statfin-earnings-15b2` · `statfin-employment-nationality-115f` · `statfin-education-11c4` | Habitar 5 · Aprender 2 y 3 | **integrada** | Claude (sesión de Juan) | `feat/biblioteca-front` | 2026-10-30 | `etl/helsinki/sources/{alquiler,salarios,nacionalidad,educacion}.py`, `public/data/{rents,earnings,employment_nationality,education}.json` |
| `prh-ytj-companies` | Investigar 4 | **integrada** (solo conteos) | Claude (sesión de Juan) | `feat/biblioteca-front` | 2026-10-30 | `etl/helsinki/sources/empresas.py`, `public/data/companies.json` |
| `hsy-land-cover` | Investigar 5 | **integrada** | Claude (sesión de Juan) | `feat/biblioteca-front` | 2026-10-30 | `etl/helsinki/sources/suelo.py`, `public/data/land_cover.json` |
| `vipunen-education` | Aprender 2 | **descartada** (sin código de municipio) | Claude (sesión de Juan) | — | 2026-10-30 | Reemplazada por `statfin-education-11c4`. |
| `fmi-weather` · `hsy-air-quality-now` · `digitraffic-road-tms` · `digitraffic-rail` | Llegar 3 (en vivo) | **integrada** (endpoints `/api/live-*`) | Claude (sesión de Juan) | `feat/biblioteca-front` | 2026-10-30 | `api/live-{weather,air,traffic,trains}.js`, `api/_upstream.js` |
| `hsy-tyopaikkaruudukko-2024` | (alternativa de mayor resolución para Investigar 1) | libre | — | — | — | Liberada el 2026-10-27: Paavo ya trae empleos por sector y área postal, agregados y protegidos. Solo hace falta si el grupo quiere celdas de 250 m (semáforo amarillo). |
| `hsy-land-cover` | Investigar 4 | libre | — | — | — | — |
| `prh-ytj-companies` | Investigar 3 | libre | — | — | — | Solo conteos. Confirmar la licencia antes. |
| `vipunen-education` | Aprender 2 | libre | — | — | — | Reconfirmar la licencia antes. |
| `helsinki-region-statistics` | Aprender 3 (si trae lengua materna) | libre | — | — | — | Primero confirmar el desglose. |
| `overture-maps` (edificios) | Capa 3D opcional | libre | — | — | — | Revisar la distribución de alturas antes de mostrar. |

**Archivos compartidos que ya tocó esta sesión** (avisar antes de cambiarlos): `etl/helsinki/run.py` (lista `EXTRA_SOURCES`), `verificar.py`, `src/biblioteca/libros.js`, `src/biblioteca/App.jsx`, `src/biblioteca/Mapa.jsx`, `src/data.test.js`, `docs/catalogo/fuentes.json` (solo el estado de las dos fuentes).

**Para agregar una fuente nueva al ETL:**
1. Crear `etl/helsinki/sources/<nombre>.py` con `SOURCE_ID`, `URL`, `RAW_NAME`, `OUTPUT_NAME`, `refresh()` y `build()`. Usar `paavo.py` como modelo.
2. Añadirla a `EXTRA_SOURCES` en `run.py`.
3. Añadir sus comprobaciones a `verificar.py`.

## Bitácora

Formato: fecha · quién · fuente · qué se hizo · **qué se corrigió** · comandos que pasaron.

- **2026-10-27 · Claude (sesión de Alejo)**: abre este registro. Reclama Paavo, StatFin 11ra y la rejilla de empleo de HSY: entre las tres desbloquean 8 pliegos. Antes de empezar fusionó `origin/main` (catálogo unificado de 63 fuentes) en `feat/biblioteca-front`.
- **2026-10-27 · Claude (sesión de Alejo) · `stat-fi-postal-areas-paavo` y `statfin-population-11ra` → integradas.**
  - **Qué se hizo:**
    - `etl/helsinki/sources/paavo.py` y `poblacion.py` descargan a `data/raw/` (la fecha de descarga queda en `data/metadata/<id>.json`) y publican `public/data/postal_areas.geojson` (167 áreas, 452 kB) y `public/data/population.json`.
    - Las dos fuentes quedan en `sources.json` y sus conteos en `update-report.json`.
    - `verificar.py` (nuevo, en la raíz) comprueba municipios, paradas, áreas, población y registro.
    - En el front, 8 pliegos pasan a tener datos:
      - Llegar 2: población.
      - Habitar 1–3: ingreso en mapa 2D/3D con comparación A·B y ranking, distribución y alquiler × ingreso.
      - Investigar 1–2: empleo por sector en mapa 3D, y peso de cada sector.
      - Investigar, pliego nuevo: desempleo por área.
      - Aprender 1: educación universitaria por área.
  - **Qué se corrigió frente a lo que decían las fichas o el plan:**
    1. **El ingreso de Paavo es *ingreso monetario disponible* de residentes de 18 años o más**, no «ingreso medio» a secas. Lo confirman las etiquetas oficiales de la tabla PxWeb 12f1. Se corrigió el texto de la app.
    2. **El año de referencia no estaba en la ficha.** Se verificó que la edición 2026 (`vuosi` 2026) corresponde a **2024**: he_vakiy, hr_ktu, tp_tyopy y pt_tyott del área 00100 coinciden exactamente con PxWeb 2024. Es la prueba de dos herramientas (WFS frente a PxWeb) sobre el mismo dato.
    3. **Supresión.** Paavo marca lo protegido con `-1`, y las áreas sin residentes traen ingreso `0` (no aplica). Las dos cosas se publican como `null`. En esta edición hay 9 valores suprimidos.
    4. **Paavo trae empleos por sección TOL por área postal** (`tp_*`), cosa que la ficha no decía. Se usó eso para P2 en lugar de la rejilla de 250 m de HSY, que tiene semáforo amarillo porque una celda puede señalar a un solo empleador. **Decisión del grupo pendiente:** confirmar que basta con el área postal.
    5. **Error propio en el front:** la expresión `step` de MapLibre exige cortes estrictamente crecientes, y en sectores con muchos ceros (por ejemplo T) los cuantiles se repetían. Se corrigió quitando los cortes repetidos. La expresión se validó contra la especificación de estilos de MapLibre con 4 métricas reales.
    6. **Error propio en el front:** la tasa de desempleo metropolitana tenía una fórmula enredada. Se reemplazó por desempleados / (ocupados + desempleados).
  - **Pruebas que pasaron:**
    - `python3 -m etl.helsinki.run`: sin errores.
    - `python3 verificar.py`: 3.020 comprobaciones, 0 fallos.
    - **Dato roto a propósito:** en una copia del lago se puso ingreso `0` en un área sin residentes (00230) y se descuadró la suma por sector de 00100. `verificar.py --lago <copia>` atrapó los dos y terminó con código 1.
    - **Borrar el lago y reconstruirlo:** se borraron `public/data` y `data/processed`, se corrió el ETL sin red y los 4 archivos publicados volvieron con el mismo sha256.
    - `npm test`: 8 de 8. `npm run build`: OK.
  - **Lo que NO se verificó:** los mapas de áreas no se pudieron ver en el navegador. La extensión de Chrome estaba desconectada, y Chrome headless no termina de dibujar MapLibre (tampoco el mapa que ya funcionaba). Las gráficas SVG, las tablas y las notas al pie sí se revisaron en capturas headless. **Pendiente: abrir Habitar 1, Investigar 1 y Aprender 1 en un navegador real y probar el botón 3D.**
- **2026-10-27 · Claude (sesión de Alejo) · corrección propia:** el commit `c0ae801` dejó fuera `etl/helsinki/run.py`, así que el ETL subido no llamaba a los módulos nuevos. Se corrigió en `84cd609`. Lección: revisar `git status` después de `git add` y antes de hacer push.
- **2026-10-27 · Claude (sesión de Alejo) · verificación visual de los mapas de áreas en Chrome real**, con la extensión reconectada. Se vieron Habitar 1 (2D, 3D y elegir zonas A·B; la URL se actualiza), Investigar 1 (sectores J y Q, en 3D) y Aprender 1. La consola no mostró errores.
  - **Se corrigió:**
    1. La ficha B de la comparación se salía del borde de la página con nombres largos («Östersundom»). Las columnas de la rejilla pasaron a `minmax(0, 1fr)`.
    2. El selector de sector se salía de la columna del mapa. Ahora ocupa el ancho disponible.
    3. Al inclinar el mapa a 3D, el área quedaba muy pequeña. Ahora se acerca 0,3 niveles: con 0,6 el oeste de Espoo quedaba cortado.
  - **Queda pendiente:** probarlo en un teléfono real.

- **2026-10-30 · Claude (sesión de Juan) · seis fuentes estáticas y cuatro en vivo → integradas; Vipunen → descartada.**
  - **Qué se hizo:**
    - Módulos nuevos en `etl/helsinki/sources/`: `alquiler`, `salarios`, `nacionalidad`, `educacion`, `empresas`, `suelo` (y `_http.py`). `run.py` ganó `--refresh --only <ids>` para descargar solo algunas fuentes.
    - Endpoints en vivo `api/live-weather.js` (FMI Kaisaniemi), `live-air.js` (HSY, 13 estaciones), `live-traffic.js` (Digitraffic, 66 estaciones dentro de los cuatro municipios) y `live-trains.js` (salidas desde Helsinki Central). Si la fuente falla devuelven `unavailable`, sin cifras.
    - Front: pliego nuevo «Ahora mismo» (Llegar 3) y cinco pliegos pasan de pendiente o hueco a datos: Habitar 5, Investigar 4 y 5, Aprender 2 y 3 (`src/biblioteca/pliegosNuevos.jsx`).
    - `verificar.py` ganó seis comprobaciones (3.202 en total, 0 fallos); 16 pruebas de `npm test`, 6 de ellas nuevas para los endpoints en vivo con la red simulada.
  - **Qué se corrigió:**
    1. **PRH: el primer método era incorrecto.** Se contaba con `totalResults` por localidad y división TOL, y la validación del ETL lo atrapó: las divisiones sumaban 326.872 empresas frente a un total de 90.333 en Helsinki. Al abrir las respuestas se vio que `mainBusinessLine=62` también devuelve los códigos 86 y 96 (es una búsqueda de texto) y que `location=Kauniainen` devuelve también direcciones de Espoo. Se reescribió `empresas.py`: pagina el registro (1.463 páginas, unos 37 min), reduce cada empresa a código de municipio de su dirección y actividad principal exacta, deduplica por NIF y descarta nombres y direcciones en memoria. El verificador no se tocó.
    2. **HSY suelo: polígonos con área 0.** `paallystetty_tie_2018` trae polígonos degenerados con `p_ala_m2 = 0` y la ingesta, que exigía > 0, falló. Se aceptan y se omiten (no aportan superficie); los negativos o no numéricos siguen siendo error.
    3. **HSY suelo: las ediciones no son comparables año a año.** En 2020 la superficie sellada baja entre −6 % y −10 % en los cuatro municipios a la vez. El pliego avisa de ello (calculado, no escrito a mano) y recomienda leer la tendencia 2016–2024.
    4. **Vipunen se descartó tras abrirla.** Sus conjuntos de estudiantes traen el nombre de la institución y ninguna columna de municipio; cruzar por nombre está prohibido. Se usó StatFin 11c4, que sí trae código de municipio.
    5. **Lengua materna no se pudo cerrar.** `tyokay/115g` (por lengua) es nacional y `115f` (por región) es de nacionalidad. Se publicó nacionalidad en Uusimaa y el pliego dice que no es lengua ni municipio.
    6. **Digitraffic:** el límite de 3 MB descartaba la respuesta de estaciones (es mayor al descomprimirse); se subió a 15 MB.
    7. **Sector L en PRH:** sale como el mayor porque el registro incluye las sociedades de vivienda; se aclaró en el pliego.
    8. **Alquiler por barrio y salario por ocupación siguen sin fuente integrada:** el alquiler llega a ciudad (Espoo y Kauniainen juntas) y el salario a Uusimaa.
    9. **OpenAlex** respondió pero sin llave comparte un cupo mínimo; no se integró (el sistema no depende de llaves).
  - **Dato roto a propósito:** en una copia del lago se puso un alquiler de 210 €/m² en Helsinki, una celda de 2 empresas visible en Kauniainen y se duplicaron los edificios de Vantaa en 2024. `verificar.py --lago <copia>` atrapó los tres y terminó con código 1.
  - **Pruebas que pasaron:** `python3 -m etl.helsinki.run` sin errores · `verificar.py` 3.202 / 0 fallos · `npm test` 16 de 16 · `npm run build` OK · revisión visual en el navegador integrado de Llegar 3, Habitar 5 e Investigar 4–5 (a 390 px sin scroll horizontal; Empresas se vio con el estado de error antes de existir `companies.json`).
  - **Lo que NO se verificó:** el pliego de Empresas, Aprender 2 y Aprender 3 con datos en el navegador; el mapa de MapLibre en estos pliegos (se vio dibujado a 390 px, pero no se probó la selección de municipio); los endpoints `/api/live-*` desplegados en Vercel (solo con `npm run dev` y con pruebas con red simulada); un teléfono real. «Borrar el lago y reconstruir» no se repitió para las seis fuentes nuevas; sin red, `run.py` las reconstruye desde `data/raw/`.
