# CLAUDE.md — Cerebro Helsinki (Taller de Datos · Gestión y Gobernanza de Datos, EAFIT 2026-2)

Este repo es el **entregable del Taller de Datos**: https://gobernanzadatos.vercel.app/tallerdatos
(profesor: Santiago Jiménez Londoño). Toda decisión de código, datos y documentación debe servir a lo que pide el taller. Léase esto antes de cambiar nada.

> Fuente: la página se renderiza en el cliente (`/tallerdatos/tallerdatos.js` + `datos.js`); el contenido de abajo se extrajo de ahí el 2026-09-21. Versión de la página: `2026-09-14`.

## 1. El encargo (láminas 1 y 18 del taller)

**Replicar, para una ciudad elegida por el grupo, el sistema de información del ejemplo (Cerebro Lima, https://cerebro-lima.vercel.app), tramo por tramo, y explorar herramientas en cada tramo.**

- Grupos de 3–4 personas. Una ciudad por grupo (Lima no vale). Aquí: **Helsinki** (Helsinki, Espoo, Vantaa, Kauniainen).
- **En cada tramo probar ≥ 2 herramientas sobre los mismos datos** antes de quedarse con una.
- **0 cifras sin fuente, sin vigencia o sin fecha de prueba.**
- Se entregan dos cosas: **el sistema funcionando** y **la bitácora de exploración** que justifica cada elección.
- "Replicar no es copiar": reconstruir para entender por qué está hecho así. Orden de prioridades: primero replicar, luego explorar, al final decidir.
- Las cuatro decisiones siguen en pie: **qué mostrar, si se puede usar, cómo protegerlo, con qué herramienta**. La IA entra en todo el recorrido, con bitácora.
- Si casi nada está abierto para la ciudad, eso es un hallazgo válido que se documenta.

## 2. Rúbrica

**El sitio NO publica una rúbrica numérica** (sin puntos, pesos ni niveles ni fecha de entrega). Los criterios de evaluación son cualitativos y están en la lámina "La entrega", más las "puertas de salida" de cada tramo. Preguntar al profesor por fecha y ponderación.

### 2.1 Qué se entrega (5 componentes)

| # | Componente | Contenido exigido |
|---|---|---|
| 1 | **El sistema** | Enlace público funcionando, **nombres del grupo visibles**. Si hay compuerta, la clave se entrega aparte al profesor. |
| 2 | **La réplica** | Repo con contrato de datos, scripts de ingesta, `verificar.py` y catálogo de fuentes **completo** (incluye las que no entraron y la razón). |
| 3 | **La exploración** | Bitácora: ≥ 2 herramientas por tramo, mismos criterios, cuál quedó y por qué. |
| 4 | **Las decisiones** | README con las 4 decisiones, bitácora de IA, resultado de las **dos revisiones entre grupos**, y posición frente a **dos reflexiones** (una de datos, una de seguridad), con evidencia del propio sistema. |
| 5 | **En clase** | Presentación corta **con el sistema abierto en pantalla, sin diapositivas**. |

### 2.2 Piso técnico (mínimo obligatorio)

- [ ] Abre desde un teléfono.
- [ ] Cada cifra muestra **fuente, vigencia y fecha de prueba a un clic**.
- [ ] Al menos una vista sobre el territorio (mapa).
- [ ] El lago se **reconstruye desde los scripts** (borrar lago → correr scripts → vuelve igual).
- [ ] Cada tramo con 2 herramientas exploradas y anotadas.
- [ ] Ninguna pieza depende de una llave paga.
- [ ] Si hay compuerta: pasa las pruebas de terminal (otro grupo no saca los datos sin clave).
- [ ] Números de la prosa salen del lago (no escritos a mano).

### 2.3 Criterio de calidad: "sistema de información" vs "vitrina"

Lo que se busca (sistema de información):
- Cada cifra dice de dónde salió, qué cubre y cuándo se probó.
- El catálogo cuenta también **lo que no sirvió y por qué**.
- Se probaron varias herramientas sobre los mismos datos y se dice por qué quedó una.
- La protección es proporcional a lo que hay que proteger **y está probada**.
- Las bitácoras muestran **correcciones y vueltas atrás**, no solo lo que salió bien.

Lo que penaliza (vitrina):
- «Fuente: datos abiertos», sin entidad, documento ni fecha.
- Solo aparece lo que funcionó.
- Primera herramienta que apareció, sin saber su licencia.
- Clave en el JavaScript, o datos de personas a la vista.
- «Lo hizo la IA» sin una sola corrección registrada (columna de correcciones vacía = no revisaron).

### 2.4 Pregunta de la presentación en clase

> ¿Qué herramienta descartaron que casi eligen, qué decidieron no mostrar, y qué tendría que cambiar —en la fuente, en la herramienta o en su propio sistema— para que la respuesta fuera otra?

## 3. La ruta: 8 tramos, cada uno con artefacto y puerta de salida

| Tramo | Dejan (artefacto) | Puerta de salida | Herramientas a explorar (≥2) |
|---|---|---|---|
| **Rastreo** | `catalogo/` con una ficha por fuente, incl. caídas y descartadas | Cada ficha con fecha de prueba, estado y licencia; fuentes de **≥ 3 familias**; decir qué no existe para la ciudad | DuckDB, Overture Maps, QGIS |
| **Pregunta** | Página: usuario, **3–6 preguntas**, escala, comparación, lista de lo que NO se muestra | Cada pregunta tiene ≥ 1 fuente integrada o un hueco declarado | kepler.gl, Cube |
| **Permiso** | Estado, licencia, personas y protección en cada ficha (semáforo) | Ninguna fuente integrada con licencia sin declarar ni datos de personas sin tratar | Presidio, OpenDP |
| **Contrato y lago** | Contrato de datos, `ingesta/`, `lago/` | Borrar el lago, correr scripts, vuelve igual | dlt, DuckDB, Polars, DuckLake, Apache Iceberg |
| **Verificación** | `verificar.py` que termina con error si algo falla | Cero fallos **y** se rompió un dato a propósito y la comprobación lo atrapó | dbt, Frictionless, Data Contract CLI, Great Expectations, Soda Core |
| **Vistas** | Sistema funcionando en un enlace | Cada cifra a un clic de su fuente; abre en teléfono; números de la prosa salen del lago | Streamlit, Datawrapper, Observable Framework, Data Studio, Metabase, MapLibre GL JS |
| **Protección** | Compuerta (si aplica), salida de pruebas de terminal, revisión de secretos del historial git | Otro grupo intentó sacar los datos sin clave y no pudo, **o** el sistema es abierto por decisión escrita | Vercel, Open Policy Agent |
| **Entrega** | README de decisiones + bitácora de exploración + bitácora de IA | Otro grupo llegó a la fuente original de **3 cifras al azar** | Git + GitHub, GitHub Actions |

**Vueltas atrás legítimas** (registrarlas en el README): pregunta sin fuente → volver al rastreo; semáforo excluye una fuente → volver a la pregunta; **verificación falla → arreglar la ingesta, NUNCA aflojar el verificador**; vista necesita cifra que no está en el lago → volver al contrato; herramienta no deja proteger → probar otra; el ataque saca algo → volver al permiso (quizá no debía publicarse).

## 4. Reglas de IA (aplican también a Claude Code en este repo)

- La IA hace buena parte del trabajo, **el grupo responde por todo**. No se delega la estrategia (qué mostrar, qué proteger, a qué fuente/herramienta creerle).
- **Bitácora de IA** obligatoria por decisión importante: herramienta, qué se encargó, qué entregó, **qué se corrigió**. Registrar las correcciones que Claude hace o que se le hacen.
- **La IA propone, el enlace dispone**: ninguna fuente entra al catálogo hasta que alguien la abre o un script la baja. No inventar portales, datasets ni rutas de API.
- Verificar licencia y última versión de cada herramienta en la fuente (en 2026 varias cambiaron de licencia: Soda Core, GX Cloud, dbt, MinIO).
- **Nada de datos personales en conversaciones con IA.**
- **Sin llaves pagas** en el sistema.
- Verificar no es mirar la pantalla: el caso Lima tuvo restos de Chile, una variable en cero, una frase falsa y cifras escritas a mano — nada rompía la página. Correr `verificar`/tests, no fiarse de la vista.
- No aflojar comprobaciones para que pasen; corregir el dato.

## 5. Ficha de fuente (catálogo)

Campos de la ficha de Lima **más dos obligatorios propios**: `probado` (fecha de la prueba) y `personas` (si trae datos de personas y cuáles). Registrar el error exacto de las que fallan (403, DNS, timeout, pide sesión). Cruzar por código territorial, nunca por nombre.

## 6. Esqueleto del README de entrega (copiar al empezar, llenar tramo a tramo)

Secciones exigidas: Para quién y qué pregunta · La réplica (qué se replicó / qué cambió, fuentes catalogadas·integradas·caídas·descartadas, huecos) · ¿Se puede usar? (tabla Fuente/Licencia/Personas/Estado/Condición) · Bitácora de exploración (Tramo, Herramienta, qué pidió para empezar, licencia, dónde quedan los datos, ¿se rehace con un comando?, estado del proyecto, qué resolvió, qué no pudo, ¿quedó? ¿por qué?) · Protección (nivel: abierto / solo agregados / compuerta / no se publica; qué y de quién; pruebas; revisión de secretos) · Herramienta elegida para las vistas · Nuestra posición (1 reflexión de datos + 1 de seguridad) · Bitácora de IA · Revisión cruzada (3 cifras auditadas, ataque recibido, vueltas atrás).

## 7. Reflexiones (elegir ≥ 1 de cada bloque y responder en el README con evidencia propia)

- **Datos:** El mapa no es el territorio · Público no es inocuo · Un dato sin dueño es un dato sin gobierno · Los datos también se mueren · ¿Más datos, más certeza? · ¿De quién es la infraestructura?
- **Seguridad:** La seguridad es una decisión de gobierno · Explorar es ampliar la superficie de ataque · Parecer protegido no es estar protegido · El dato más seguro es el que no se guarda · La herramienta que ayuda también puede actuar · La autorización separa un ejercicio de un delito (el ataque entre grupos exige acuerdo escrito previo).

## 8. Estado de este repo frente al encargo (Helsinki)

Según `README.md`/`docs/` (verificar contra el código antes de afirmar):

- Hecho: mapa MapLibre con límites de Statistics Finland, 6.027 paradas HSL GTFS, proxy GTFS-Realtime, ETL reproducible (`python3 -m etl.helsinki.run`), registro de fuentes con checksums, docs (`docs/`), pruebas (`npm test`), esquema PostGIS, sin llaves.
- **Brechas probables frente a la rúbrica** (revisar): catálogo `catalogo/` con fichas por fuente **incluidas caídas/descartadas** y ≥ 3 familias; semáforo de licencias/personas por fuente; contrato de datos + `verificar.py` que falle con dato roto a propósito; **bitácora de exploración con ≥ 2 herramientas por tramo**; **bitácora de IA con correcciones**; despliegue en Vercel (README dice que no se ha hecho) con nombres del grupo visibles; fuente/vigencia/fecha de prueba a un clic **en cada cifra**; cifras de la prosa calculadas desde el lago; prueba en teléfono; decisión de protección escrita y probada; revisión de secretos en historial git; README de decisiones con las 2 reflexiones y las 2 revisiones cruzadas; 3–6 preguntas de usuario declaradas y huecos ("pending") explícitos.
- Regla actual del repo a mantener: nada de indicadores inventados; las capas sin datos se muestran como pendientes.

## 9. Convenciones de trabajo

- Toda cifra en la UI/README debe rastrearse a fuente + vigencia + fecha de prueba; si no, no se publica.
- Antes de dar algo por hecho: `npm test`, `python3 -m etl.helsinki.run`, `npm run build`.
- No commitear credenciales ni `.env`. Revisar historial por secretos antes de entregar.
- Cambios de datos (`data/`, `public/data/`) salen del ETL, no se editan a mano.
