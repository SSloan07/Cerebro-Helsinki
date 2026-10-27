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
