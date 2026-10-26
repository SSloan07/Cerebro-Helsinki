# Fuentes por consultar

Estado al 2026-10-26. Lista de trabajo para el tramo de **Rastreo**, que es una vuelta atrás legítima: hay preguntas sin fuente.
Cada fila dice qué necesita la app, dónde buscar y qué confirmar al abrir la fuente.

> **La IA propone, el enlace dispone.** Las fuentes de la sección 1 **no se han abierto**. Los nombres de portales y
> tablas son pistas para buscar, no rutas confirmadas. Ninguna entra al catálogo hasta que alguien la abra o un script
> la baje, con fecha de prueba, estado, licencia y campo `personas`.

En la app, cada fila de este documento tiene su página en blanco («hueco declarado» o «pendiente de ingesta»). Al resolver una fila hay que actualizar `src/biblioteca/libros.js`.

---

## 1. Sin sondear: hay que buscarlas

| # | Qué necesita la app | Dónde buscar (sin confirmar) | Qué verificar al abrirla | Pregunta | Prioridad |
|---|---|---|---|---|---|
| 1 | **Salario por ocupación** | Statistics Finland (StatFin), estadística de estructura salarial | ¿Desglose por ocupación y región (Uusimaa o municipio)? Año, licencia, y si trae mediana o solo media. Casi seguro **no** llega a código postal. | P1 | Alta |
| 2 | **Alquiler por zona** | StatFin, estadística de alquileres de vivienda | ¿Llega a código postal o solo a municipio o grupo de códigos? Libre mercado frente a subsidiado. La fuente ya catalogada (`statfin-ashi-13mu`) es de compraventa, no de alquiler. | P1 | Alta |
| 3 | **Empleo por lengua materna u origen** | StatFin, estadística de empleo (*työssäkäynti*) | Tasa de empleo y desempleo por lengua materna (fi/sv/otras) y municipio. Revisar la supresión de celdas pequeñas. | P3 | Alta |
| 4 | **Población de origen extranjero por zona** | stat.hel.fi, series regionales (`helsinki-region-statistics`, ya en el catálogo) | La ficha dice «empleo por distrito»: confirmar si se desglosa por lengua u origen y si cubre Espoo, Vantaa y Kauniainen. | P3 | Alta |
| 5 | **Vacantes por ocupación** | Portal público de empleo Työmarkkinatori, o la estadística de vacantes de StatFin o del Ministerio de Empleo (TEM) | ¿API sin llave? Licencia. ¿Agregados por ocupación y región, o avisos individuales? Los avisos individuales pueden traer nombres de contacto: solo conteos. | P2 | Media |
| 6 | **Investigación e instituciones** | OpenAlex (instituciones y publicaciones con sede en Helsinki); Crossref como contraste | Licencia (OpenAlex declara CC0; confirmar). Filtrar por ubicación de la institución, no de autores. Publicar por área temática y año, nunca por persona. | P2 | Media |
| 7 | **Permisos de residencia por trabajo** | Servicio de Inmigración de Finlandia (Migri), estadísticas abiertas | Permisos concedidos por motivo (trabajo, estudio, familia) y nacionalidad. ¿Hay nivel municipal? Sirve para contextualizar P3, no para predecir. | P3 | Media |
| 8 | **Reconocimiento de títulos extranjeros** | Agencia Nacional de Educación (OPH) | ¿Publica estadísticas de decisiones de reconocimiento por campo? Si no existe abierta, queda como hueco y se dice. | P3 | Baja |
| 9 | **Permisos de construcción** (expansión) | StatFin, estadística de permisos de construcción | Por municipio y año, para contrastar la cobertura del suelo. | P2 | Baja |
| 10 | **Tiempos de viaje sin llave** | Matriz de accesibilidad del área metropolitana (Universidad de Helsinki, grupo de accesibilidad) | Reemplazaría a Digitransit (descartada: pide llave) para «¿quién llega en 15 minutos?». Revisar el año y la licencia. | P2 | Baja |

---

## 2. Ya probadas: falta ingerirlas

Estas tienen ficha y prueba. Lo que falta es ingesta, contrato y `verificar.py`.

| Fuente (id) | Probada | Resultado de la prueba | Qué alimenta en la app | Siguiente paso |
|---|---|---|---|---|
| `sf-paavo-2026` | 2026-09-21 | HTTP 200 · 167 áreas postales | Habitar 1–3 (ingreso, distribución, alquiler) · Aprender 1 (educación) | **Primera ingesta.** Confirmar `hr_ktu`, `tr_ktu`, `te_vuok_as` y `ko_*`, con el año de referencia de cada uno, y cómo se suprimen las áreas con poca población. |
| `statfin-population-11ra` | catálogo revisado el 2026-09-28 | sin prueba con fecha propia | Llegar 2 (población) | Probar con fecha y luego ingerir. Cruzar por código municipal. |
| `hsy-tyopaikkaruudukko-2024` | 2026-09-21 | HTTP 200 · 15.445 celdas | Investigar 1–2 (empleo por sector) | Agregar a 1 km o a área postal antes de publicar. `-1` es supresión, nunca cero. |
| `prh-ytj-v3` | 2026-09-21 | HTTP 200 · 89.816 para `location=Helsinki` | Investigar 3 (empresas por sector) | Confirmar la licencia en avoindata.prh.fi. El script guarda solo conteos y no pasa nombres a la IA. |
| `hsy-land-cover` | catálogo revisado el 2026-09-28 | sin prueba con fecha propia | Investigar 4 (expansión 2016 → 2024) | Probar los dos cortes y elegir la variable (superficie impermeable). |
| `hsy-rakennukset-paivittyva` | 2026-09-21 | HTTP 200 · 154.154 edificios | Edificación por década (aún sin pliego) | Licencia de esta capa por confirmar. Solo agregados por área postal. |
| `vipunen-education` | catálogo revisado el 2026-09-28 | sin prueba con fecha propia | Aprender 2 (oferta educativa) | Reconfirmar la licencia y elegir el conjunto (de 47). |
| `overture-buildings` | 2026-09-21 | 258.743 edificios en el bbox; 66 % con altura | Capa 3D de edificios (opcional) | Revisar la distribución de alturas (media ≈ 5 m, sospechosa) frente a los pisos de HSY antes de mostrar nada. ODbL. |

---

## 3. Caídas: reintentar desde otra red

| Fuente (id) | Error de la prueba (2026-09-21) | Para qué serviría |
|---|---|---|
| `hel-3d-citydb-wfs` | timeout a 40 s y 45 s | Altura oficial por edificio en Helsinki |
| `hel-avoindata-wfs` / `helsinki-city-wfs` | timeout (kartta.hel.fi) | Distritos oficiales de Helsinki |
| `hri-ckan-api` | HTTP 403 | Catálogo HRI. Revisar el user agent de `scripts/probar_fuentes.py`. |
| `syke-wfs` | 200 con error dentro | Áreas protegidas y calidad de aguas |

Google Open Buildings **no cubre Finlandia** (`google-open-buildings`, probado el 2026-09-21). No hay nada que reintentar.

---

## 4. Inconsistencias del catálogo que hay que cerrar

1. **Tres conteos distintos.**
   - `docs/catalogo/fuentes.json` tiene 49 fuentes (revisado el 2026-09-28).
   - `catalogo/` tiene 26 fichas.
   - El informe PDF del 26 de octubre dice 63.

   La app lee los dos primeros y lo dice en el pliego «El catálogo».
2. **Paavo 2025 frente a 2026.**
   - `fuentes.json` registra `pno_tilasto_2025` con 168 áreas.
   - `catalogo/sf-paavo-2026.md` registra `pno_tilasto_2026` con 167 áreas.

   Hay que elegir una y explicar la diferencia.
3. **`fuentes.json` no tiene fecha de prueba por fuente.** Remite a `docs/catalogo/pruebas/`, que no existe. Mientras tanto, la app muestra «sin prueba con fecha propia; catálogo revisado el 28 sep 2026».

---

## 5. Correcciones al Figma del grupo (fuentes mal citadas)

1. **Moverse** cita «informe del proyecto · HSL · 26 oct 2026». La app ya cita HSL GTFS, con el horario válido del 18 sep al 16 nov 2026 y probado el 21 sep 2026, y saca los conteos del lago (`update-report.json`).
2. **Llegar** dice «corte documentado 26 oct 2026». La vigencia es 2025 y la prueba es del 21 sep 2026.
3. **Investigar** prometía OpenAlex y el alcance de 15 minutos. Ahora son páginas en blanco (filas 6 y 10 de la sección 1).
4. **Aprender** no tenía datos. Ahora tiene dos pliegos pendientes (Paavo `ko_*`, Vipunen), un hueco (lengua materna) y «Lo que estos datos no pueden decirte».

## 6. Aviso de vigencia

El horario GTFS de HSL **vence el 2026-11-16**. Antes de esa fecha hay que correr `python3 -m etl.helsinki.run` con el feed nuevo. Si no se hace, la app mostrará el sello «vigencia vencida».
