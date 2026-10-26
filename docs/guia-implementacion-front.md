# Guía de implementación del front · «Biblioteca de una nueva vida»

Para el grupo y para la IA de cada uno. Estado al **2026-10-26**.
Este documento explica qué hay construido, cómo está organizado y, sobre todo, **cómo conectar los datos reales sin romper las reglas del taller**.

> **Si eres una IA leyendo esto:** antes de tocar código, lee en este orden:
> 1. `CLAUDE.md`: reglas del taller.
> 2. `PRODUCT.md`: qué es el producto.
> 3. Esta guía.
> 4. `docs/fuentes-por-consultar.md`: qué datos faltan.
>
> No inventes cifras, portales ni rutas de API. Si una cifra no sale de `public/data/` (el lago publicado por el ETL), no va en la pantalla.

---

## 1. Qué es la app

Es una app de análisis para personas extranjeras que evalúan mudarse al área metropolitana de Helsinki (Helsinki 091, Espoo 049, Vantaa 092, Kauniainen 235).

La metáfora viene del Figma del grupo («Cerebro Helsinki — Biblioteca de una nueva vida»):
- Un **estante** con 5 libros.
- Cada **libro** responde una pregunta y se lee por **pliegos**.
- Cada pliego tiene dos páginas: la **figura** a la izquierda (mapa o gráfica) y la **lectura** a la derecha, con las **notas al pie** de cada cifra.

| Vol. | Libro | Pregunta | Color |
|---|---|---|---|
| 01 | Llegar | El territorio (introducción) | salvia |
| 02 | Habitar | **P1** · Ingreso de residentes por zona; transporte como capa | terracota |
| 03 | Investigar | **P2** · Posiciones según tejido productivo y expansión | lavanda |
| 04 | Aprender | **P3** · Escalabilidad laboral de una persona extranjera | mostaza |
| 05 | Fuentes | Catálogo, semáforo y lo que no mostramos | verde |

«Conectar» (Service Map) quedó fuera a propósito: no responde ninguna pregunta. Está explicado en Fuentes › «Lo que decidimos no mostrar».

### Estado de cada pliego hoy

`datos` = sale del lago · `pendiente` = la fuente está probada pero falta ingerirla · `hueco` = no hay fuente · `texto` = sin cifras.

| Libro | # | Pliego | Tipo | Fuente / qué falta |
|---|---|---|---|---|
| Llegar | 1 | Cuatro municipios (mapa + lista) | **datos** | `municipalities.geojson` |
| Llegar | 2 | Población por municipio | pendiente | `statfin-population-11ra` |
| Habitar | 1 | Ingreso de residentes, mapa 3D | pendiente | `sf-paavo-2026` (campo `hr_ktu`) |
| Habitar | 2 | Distribución de las 167 áreas | pendiente | Paavo |
| Habitar | 3 | Ingreso × % alquiler | pendiente | Paavo (`te_vuok_as`) |
| Habitar | 4 | Moverse: paradas por municipio y zona, vehículos en vivo | **datos** | `update-report.json`, `transit_stops.geojson`, `/api/live-mobility` |
| Habitar | 5 | Salario y alquiler | hueco | ver `fuentes-por-consultar.md` filas 1–2 |
| Investigar | 1 | Empleo por sector en el mapa | pendiente | `hsy-tyopaikkaruudukko-2024` |
| Investigar | 2 | Peso de cada sector | pendiente | misma rejilla |
| Investigar | 3 | Empresas por sector | pendiente | `prh-ytj-v3` (solo conteos) |
| Investigar | 4 | Expansión 2016 → 2024 | pendiente | `hsy-land-cover` |
| Investigar | 5 | Innovación, vacantes, 15 minutos | hueco | filas 5, 6 y 10 |
| Aprender | 1 | Nivel educativo por zona | pendiente | Paavo (`ko_*`) |
| Aprender | 2 | Oferta educativa | pendiente | `vipunen-education` |
| Aprender | 3 | Empleo por lengua materna | hueco | filas 3–4 |
| Aprender | 4 | Lo que estos datos no pueden decirte | texto | — |
| Fuentes | 1 | El catálogo (49 cuadros por estado y semáforo) | **datos** | `docs/catalogo/fuentes.json` |
| Fuentes | 2 | Todas las fichas (tabla con filtros) | **datos** | `docs/catalogo/fuentes.json` |
| Fuentes | 3 | Lo que decidimos no mostrar | texto | — |

**Prioridad recomendada:**
1. Paavo, porque desbloquea 5 pliegos.
2. La rejilla de empleo de HSY.
3. StatFin 11ra.
4. La cobertura del suelo.
5. PRH.
6. Vipunen.

---

## 2. Correrla

```bash
npm install
npm run dev          # http://localhost:5173 (sirve /api/* con el middleware de Vite)
npm test             # node --test sobre los datos publicados y la API
npm run build
python3 -m etl.helsinki.run            # regenera public/data desde data/
python3 -m etl.helsinki.run --refresh  # vuelve a descargar las fuentes integradas
```

La URL guarda el estado: `?libro=habitar&leer=1&pliego=4`. Sirve para enviar una cifra exacta en la revisión cruzada.

---

## 3. Mapa del código

```
index.html                    fuentes tipográficas (Google Fonts), lang="es"
vite.config.js                esbuild jsx: 'automatic' (no hay plugin de React)
src/main.jsx                  monta <App/>
src/biblioteca/
  App.jsx                     rutas por URL, estante, portada, lectura, flechas, cajón de ficha
  libros.js                   ★ definición de los 5 libros y sus pliegos (lo que más se edita)
  pliegos.jsx                 componentes de cada pliego + Pliego, Ref (nota), Pendiente, Hueco, FichaFuente
  datos.js                    useLago(), useParadas(), ficha(id), formato de números y fechas
  Mapa.jsx                    MapLibre sin teselas de fondo: municipios, paradas, vehículos en vivo
  iconos.jsx                  iconos SVG de trazo del Figma (brote, casa, rieles, libro, lupa, ficha)
  biblioteca.css              tokens, componentes, responsive (≤760 px) y movimiento
api/                          /api/stops y /api/live-mobility (Vercel + middleware de dev)
etl/helsinki/run.py           ETL reproducible → data/ y public/data/
public/data/                  ★ el lago publicado: lo único que la UI puede mostrar como cifra
docs/catalogo/fuentes.json    catálogo de 49 fuentes (lo lee el libro Fuentes)
catalogo/*.md                 26 fichas detalladas con fecha de prueba (las lee ficha())
data/metadata/candidate_probes.json   resultado de las pruebas (fecha, HTTP, conteo)
```

### Cómo llega una cifra a la pantalla

```
fuente externa ──ETL (run.py)──► public/data/*.geojson|json ──fetch──► useLago()/hook propio
                                     │                                        │
                                     └─ sources.json (registro, licencia)     ▼
catalogo/*.md + fuentes.json + candidate_probes.json ──► ficha(id) ──► nota al pie + cajón de ficha
```

- **Las cifras salen solo de `public/data/`.** Nunca se escriben a mano en `libros.js` ni en el JSX. Ejemplo: `6.027` es `reporte.counts.mapped_stop_count`.
- **Una cifra derivada se calcula en el componente sobre un archivo del lago** (como el conteo por zona tarifaria) y lleva una nota al pie que dice «cálculo propio sobre…».
- **`ficha(id, registro)` une tres fuentes de metadatos.** Toma la ficha `.md` (con `probado`), la entrada de `fuentes.json` y, si la fuente está integrada, el registro del lago. Las notas al pie y el cajón usan esa unión.

---

## 4. `libros.js`: el contrato de los pliegos

```js
{ id, titulo, subtitulo, color, icono, pregunta?, portada: { titulo, texto }, pliegos: [ ... ] }
```

Cada pliego tiene un `tipo`:

| tipo | Campos | Qué dibuja |
|---|---|---|
| `datos` | `id, vista, titulo` | El componente `VISTAS[vista]` de `pliegos.jsx` |
| `pendiente` | `id, titulo, figura, promesa, aviso?, fuentes: [idFicha], falta: [pasos]` | Placa gris con el esquema `figura` (`mapa3d`, `enjambre`, `dispersion`, `barras`, `columnas`, `cortina`), la ficha de la fuente y los pasos que faltan |
| `hueco` | `id, titulo, porque, candidatas: [{ id? \| nombre, nota }]` | Placa con trama («hueco declarado») y la lista de candidatas con su estado |
| `texto` | `id, vista, titulo` | Componente sin cifras |

Las barritas bajo cada lomo y el texto de la portada («pliegos con datos: 1 de 5») se calculan solos con `coberturaDe(libro)`. Al pasar un pliego a `datos`, el estante se actualiza sin tocar nada más.

---

## 5. Receta: pasar un pliego de `pendiente` a `datos` (ejemplo: Paavo → Habitar 1)

### 5.1 Ingesta (tramo «Contrato y lago»)

1. **Descargar en `etl/helsinki/run.py`** (o mejor en `etl/helsinki/sources/` y `transform/`, que ya están reservados):
   - Servicio: WFS de Statistics Finland, capa `postialue:pno_tilasto_2026`.
   - Filtro: `kunta IN ('049','091','092','235')`.
   - Proyección: pedir `SRSNAME=EPSG:4326`, porque la capa viene en EPSG:3067.
   - La ficha y la prueba están en `catalogo/sf-paavo-2026.md`, probada el 2026-09-21 con 167 áreas.
2. **Confirmar los nombres de campo contra la respuesta real**, no contra la ficha:
   - `postinumeroalue`, `kunta`, `he_vakiy`, `pinta_ala`, `hr_ktu`, `tr_ktu`, `te_vuok_as`, `ko_*`.
   - Anotar el año de referencia de cada variable.
3. **Valores suprimidos:** averiguar cómo los marca Paavo y publicarlos como `null`. **Nunca 0.**
4. **Publicar** `public/data/postal_areas.geojson`. Cada feature lleva:
   - `id` = código postal.
   - Solo los campos que se usan.
   - `municipality_code`.
   - `source_id: "sf-paavo-2026"`.
5. **Registro y reporte:**
   - Añadir la fuente a `source_registry()` para que entre en `sources.json`, con `integration_status: "integrated"`, licencia, periodo y `consulted_at`.
   - Añadir los conteos a `update-report.json`.
6. **Documentar** el archivo en `docs/data-contract.md`.

### 5.2 Verificación (tramo «Verificación»)

1. En `verificar.py` (todavía no existe; créalo en la raíz), comprobar:
   - Hay 167 áreas, o el número que se documente.
   - Todos los `municipality_code` pertenecen a los 4 municipios.
   - Ningún ingreso es negativo.
   - Los suprimidos son `null`.
   - Las geometrías son válidas y están dentro del bbox.
2. El script **termina con error** si algo falla.
3. **Romper un dato a propósito**, ver que `verificar.py` lo atrapa y anotarlo en la bitácora. El taller lo exige.
4. Añadir un test en `src/data.test.js`, igual que los que ya existen para paradas y municipios.

### 5.3 Front

1. **Hook en `datos.js`:** `useAreasPostales()`, igual que `useParadas()`, con estados `cargando`, `error` y `datos`.
2. **Vista en `pliegos.jsx`:** por ejemplo `IngresoZonas`. Usa `<Pliego figura={…} titulo notas={[{ fuente: 'sf-paavo-2026' }]}>` y pone `<Ref n={1} />` junto a cada cifra.
3. **Registrarla** en `VISTAS`.
4. **En `libros.js`:** cambiar el pliego a `{ id: 'ingreso', tipo: 'datos', vista: 'ingresoZonas', titulo: … }`.
5. **El 3D en `Mapa.jsx`:**
   - Hoy el mapa bloquea la inclinación (`dragRotate: false`, `pitchWithRotate: false`). Para este pliego hay que habilitar `pitch` y añadir una capa `fill-extrusion` con `fill-extrusion-height` interpolado desde `hr_ktu`.
   - Poner un **interruptor 2D/3D**: el 3D solo vale si la altura codifica la métrica.
   - Color en la rampa del volumen (`--terracota` → `--terracota-fuerte`).
   - Los `null` van con trama o gris, nunca con color de la rampa.
6. **Interacción prometida en el brief:** tocar dos zonas (A y B) y compararlas con el promedio metropolitano, con brushing entre el mapa y la tabla. El promedio se calcula sobre el lago.
7. **Aviso fijo:** el texto «ingreso de residentes ≠ salario» ya está en el campo `aviso` del pliego. Llévalo a la vista.

### 5.4 Cerrar

Correr `npm test`, `python3 -m etl.helsinki.run`, `verificar.py` y `npm run build`. Revisar en el navegador a 1440 px y a 390 px.

Al terminar:
- Actualizar `docs/fuentes-por-consultar.md`: la fuente sale de la sección 2.
- Actualizar la tabla de estado de esta guía.
- Escribir la entrada en la bitácora de IA, con lo que se corrigió.

---

## 6. Reglas de diseño (el mundo lo fijó el Figma del grupo)

**Tipografía**
- **Cormorant Garamond Medium (500):** títulos, nombres de libros y la cifra grande de cada pliego, con números de estilo antiguo.
- **Manrope Regular y SemiBold:** texto, navegación, etiquetas, tablas (`tabular-nums`) y notas al pie.

**Color**
- **Tokens en `:root`** (`biblioteca.css`): `--marfil`, `--papel`, `--tinta`, `--tinta-2`, `--regla` y un par por volumen (`--salvia` / `--salvia-fuerte`, etc.).
- **Color del volumen:** se aplica con `data-color="…"`, que define `--c`, `--c-fuerte` y `--c-texto`. No hay que inventar colores nuevos.
- **Datos:** rampa derivada del color del volumen. Lo protegido o ausente va con **trama o placa gris**, nunca con un color de la rampa ni como cero.
- **Contraste:** texto ≥ 4,5:1. Ya está medido para la paleta; si cambias un token, vuelve a medirlo.

**Texto**
- Tamaño mínimo de 13 px; las notas al pie no bajan de ahí.

**Prohibido (impeccable o antimetas del grupo)**
- Etiquetas pequeñas encima de un título (*eyebrows*). El capítulo va en la cabecera de la página, junto al folio.
- Filas de tarjetas KPI iguales: el «panel corporativo genérico».
- 3D decorativo.
- Emojis o glifos como iconos: se usan los de `iconos.jsx`.
- Bordes de color gruesos a la izquierda de las cajas.
- Texto con degradado.

**Movimiento**
- Un solo gesto grande: **sacar el libro** (620 ms). Además existen abrir la portada y pasar el pliego (una cortina con `clip-path`).
- Todo se desactiva con `prefers-reduced-motion`.

**Estados**
- Vocabulario del libro: «se imprime» (cargando), página en blanco (hueco), trama (protegido), errata (error), sello (vigencia vencida).
- **Toda vista nueva necesita los cinco.**

**Documentación de diseño**
- La fuente de verdad del diseño es `.impeccable/surfaces/src-main-jsx.md`, que contiene el contrato de dirección.
- `DESIGN.md` todavía no existe (ver §9).

---

## 7. Reglas de datos que no se negocian

1. **Toda cifra tiene nota al pie** con fuente, vigencia y fecha de prueba, y la ficha queda a un clic. Usa `<Ref n>` más `notas`.
2. **Cruzar por código** (municipio, código postal), nunca por nombre.
3. **Faltante ≠ cero.** Lo que no hay se muestra como hueco y lo suprimido como trama.
4. **Nada de datos de personas.** No se publican:
   - direcciones por edificio;
   - empresas una por una (PRH solo en conteos);
   - celdas de empleo con 1–2 empleos (agregar antes).

   Y **no se pasan registros a la IA**.
5. **El perfil del usuario**, si se implementa, vive solo en la URL y en memoria: nada de `localStorage` ni servidor.
6. **Verificar es correr comandos, no mirar la pantalla:** `npm test`, el ETL y `verificar.py`.
7. **Si la verificación falla, se arregla la ingesta.** Nunca se afloja el verificador.

---

## 8. Trampas conocidas

- **El mapa sale vacío y no hay error en la consola.** MapLibre 6 busca su worker junto al módulo y Vite lo mueve de sitio. Está resuelto en `Mapa.jsx` con `setWorkerUrl(… ?worker&url)`. No borres esa línea.
- **`React is not defined`.** No hay plugin de React; se usa `esbuild: { jsx: 'automatic' }` en `vite.config.js`.
- **Hay dos catálogos sin unificar:** `docs/catalogo/fuentes.json` (49) y `catalogo/*.md` (26). Además, Paavo aparece como 2025 en uno y 2026 en el otro. `ficha()` prioriza el `.md`. Ver `fuentes-por-consultar.md` §4.
- **`sources.json` está en inglés** porque lo genera el ETL. `ficha()` prefiere los textos en español del catálogo. Si quieres todo en español, cámbialo en `run.py`, no a mano en `public/data/`.
- **El horario GTFS de HSL vence el 2026-11-16.** Hay que correr `python3 -m etl.helsinki.run --refresh` antes; si no, aparece el sello de vigencia vencida, que es correcto.
- **`fuentes.json` no trae fecha de prueba por fuente.** La UI lo dice («catálogo revisado el 28 sep 2026»). Para tener la fecha, prueba la fuente con `etl/helsinki/probe_candidates.py`.

---

## 9. Pendientes (backlog)

| Prioridad | Tarea | Notas |
|---|---|---|
| Alta | Ingerir Paavo + `verificar.py` + Habitar 1–3 en 3D | Receta §5 |
| Alta | **Nombres del grupo** en el pie (`App.jsx`, «Grupo: nombres por confirmar») | Lo exige la rúbrica |
| Alta | Refrescar GTFS antes del 16 nov | §8 |
| Alta | Rastrear las fuentes de P1 y P3 | `fuentes-por-consultar.md` §1 |
| Media | Rejilla de empleo HSY → Investigar 1–2 | Agregar antes de publicar |
| Media | «Mi perfil» (carné: sector, educación, lenguas) que resalte lo propio en las figuras | Está en el brief y **no está implementado**. Solo URL y memoria. |
| Media | Unificar los catálogos | §8 |
| Media | Desplegar en Vercel y probar en un teléfono real | Piso técnico |
| Media | Cierre de impeccable: revisión final y `DESIGN.md` | Con la skill `impeccable` (`/impeccable document`) |
| Baja | Separar `run.py` en `sources/`, `transform/` y `publish/` | Cuando entren más fuentes |
| Baja | Partir el bundle de MapLibre (más de 1 MB) con `import()` dinámico | Aviso de Vite, no bloquea |

---

## 10. Antes de abrir un PR

- [ ] `npm test`, `python3 -m etl.helsinki.run`, `verificar.py` (cuando exista) y `npm run build` pasan.
- [ ] Ninguna cifra nueva escrita a mano; cada una con `<Ref>` y nota.
- [ ] Revisado a 1440 px y a 390 px. Sin scroll horizontal.
- [ ] Las vistas nuevas tienen los estados cargando, error, vacío o hueco, y protegido.
- [ ] `libros.js`, esta guía y `fuentes-por-consultar.md` están al día.
- [ ] Entrada en la bitácora de IA con lo que se le corrigió a la IA.
- [ ] Sin `.env`, llaves ni datos de personas en el commit.

---

## 11. Prompt sugerido para tu IA

> Estoy trabajando en Cerebro Helsinki (Taller de Datos, EAFIT). Lee `CLAUDE.md`, `PRODUCT.md`,
> `docs/guia-implementacion-front.md` y `docs/fuentes-por-consultar.md` antes de proponer cambios.
> Mi tarea: **[p. ej. «pasar Habitar 1 de pendiente a datos con Paavo, siguiendo la receta §5»]**.
> Reglas: ninguna cifra sin fuente del lago, cruzar por código, faltante ≠ cero, no aflojar `verificar.py`,
> respetar el mundo visual de §6. Al terminar, corre los comandos de §10 y dime qué corregiste.

---

Documentos relacionados:
- `PRODUCT.md`: producto.
- `docs/plan-front-migrantes.md`: brief de shape, con el porqué de cada decisión.
- `docs/fuentes-por-consultar.md`: datos que faltan.
- `.impeccable/surfaces/src-main-jsx.md`: contrato de dirección visual.
- `docs/data-contract.md`: archivos del lago.
