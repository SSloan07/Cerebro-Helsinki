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
| `stat-fi-postal-areas-paavo` | Habitar 1–3 · Aprender 1 | en curso | Claude (sesión de Alejo) | `feat/biblioteca-front` | 2026-10-27 | `etl/helsinki/sources/paavo.py`, `etl/helsinki/run.py`, `verificar.py`, `public/data/postal_areas.geojson`, `src/biblioteca/*` |
| `statfin-population-11ra` | Llegar 2 | en curso | Claude (sesión de Alejo) | `feat/biblioteca-front` | 2026-10-27 | `etl/helsinki/sources/poblacion.py`, `public/data/population.json` |
| `hsy-tyopaikkaruudukko-2024` | Investigar 1–2 | en curso | Claude (sesión de Alejo) | `feat/biblioteca-front` | 2026-10-27 | `etl/helsinki/sources/empleo.py`, `public/data/jobs_*.json` |
| `hsy-land-cover` | Investigar 4 | libre | — | — | — | — |
| `prh-ytj-companies` | Investigar 3 | libre | — | — | — | Solo conteos. Confirmar la licencia antes. |
| `vipunen-education` | Aprender 2 | libre | — | — | — | Reconfirmar la licencia antes. |
| `helsinki-region-statistics` | Aprender 3 (si trae lengua materna) | libre | — | — | — | Primero confirmar el desglose. |
| `overture-maps` (edificios) | Capa 3D opcional | libre | — | — | — | Revisar la distribución de alturas antes de mostrar. |

## Bitácora

Formato: fecha · quién · fuente · qué se hizo · **qué se corrigió** · comandos que pasaron.

- **2026-10-27 · Claude (sesión de Alejo)**: abre este registro. Reclama Paavo, StatFin 11ra y la rejilla de empleo de HSY: entre las tres desbloquean 8 pliegos. Antes de empezar fusionó `origin/main` (catálogo unificado de 63 fuentes) en `feat/biblioteca-front`.
