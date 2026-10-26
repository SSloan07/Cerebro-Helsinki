# Brief del front · «Biblioteca de una nueva vida» (impeccable · shape)

Versión del 2026-10-26. Reemplaza el plan anterior, que estaba hecho a mano.

Bases de este brief:
- `PRODUCT.md`.
- El Figma del grupo «Cerebro Helsinki — Biblioteca de una nueva vida» (archivo `XFD3WyvLKby8n0Ip6T1KcU`), recorrido en el prototipo el 2026-10-26.
- `catalogo/` y `Context-docs/informe-datos-gemelo-digital.pdf`.

Shape no escribe código: esto se confirma antes de construir.

> **Estado:** el brief ya está construido en `src/biblioteca/`. Este documento guarda el **porqué** de las decisiones.
> Para implementar o conectar datos, la referencia es `docs/guia-implementacion-front.md`.
> Diferencias con lo construido:
> - «Mi perfil (carné)» todavía no está implementado.
> - Las flechas para pasar de pliego quedaron a los costados del libro.

---

## 1. Trabajo y audiencia

- **Quién:** personas extranjeras antes y después de mudarse al área metropolitana de Helsinki, y el profesor y los grupos del taller, que auditan cifras en clase.
- **Modo de la superficie:** *Operate*. Es una app de análisis y la persona viene a comparar. La metáfora de la biblioteca da el tono, la paleta, la tipografía y el gesto propio, pero nunca reemplaza controles estándar: pestañas, selectores, tablas ordenables, mapa con zoom.
- **Entrada:** por las preguntas. El estante es la portada y cada libro es una pregunta.

## 2. Resultado y prueba

- **Tarea principal:** comparar zonas y sectores con cifras rastreables, y ver con la misma claridad lo que los datos no cubren.
- **Lo propio:** cada cifra lleva su nota al pie (fuente, vigencia, fecha de prueba) y cada hueco es una página visible. El prototipo ya trae ambas cosas: la nota al pie bajo cada pliego y la placa gris de «Investigar».

## 3. Dirección elegida

**La dirección la fija el grupo con su Figma.** Por regla de impeccable, eso va por encima del sorteo, así que las cuatro cartas de `.impeccable/mocks/decision/` quedan descartadas.

### Mundo visual (se conserva del Figma)

- **Paleta:** fondo marfil cálido, tinta verde oscura y un color por volumen:
  - salvia (Llegar)
  - terracota (Habitar)
  - azul gris (Moverse; pasa a ser la capa de transporte)
  - mostaza (Aprender)
  - verde (Conectar; sale del estante, ver §4)
  - lavanda (Investigar)
- **Tipografía:** serif de alto contraste para títulos y para las cifras grandes (la de «6.027»), y una sans de trabajo para el texto, las etiquetas y las tablas.
- **Componentes:** lomo de libro (componente `Libro / Lomo`), portada, pliego de dos páginas, nota al pie con regla fina y navegación inferior entre libros con subrayado del color del volumen.

### Ajustes para que represente datos

1. **La página izquierda pasa a ser la figura.** La placa con el ícono (ECHAR RAÍCES, HACER ESPACIO…) hoy es decorativa y se reemplaza por el mapa o la gráfica de ese pliego, sobre el color del volumen. El ícono queda solo en el lomo y en la portada.
2. **Un libro tiene varios pliegos.** Hoy hay un pliego por libro; cada pregunta necesita entre 3 y 5. Se pasa página con flechas, teclado (← →) o deslizando, con un indicador «Pliego 2 / 5» junto al «Lectura 02 / 06» que ya existe.
3. **La nota al pie se vuelve un enlace.** Cada cifra lleva un superíndice. Al pasar el cursor se ilumina su línea en el pie, y al hacer clic se abre el cajón de la fuente con entidad, campo, vigencia, fecha de prueba, licencia y enlace a la ficha.
4. **Las rampas de datos salen del color del volumen.** Cada volumen deriva una rampa secuencial de 5–7 pasos de su color, oscurecida hasta tener contraste suficiente sobre marfil. Así Habitar es terracota, Investigar es lavanda y Aprender es mostaza. Lo protegido se dibuja con trama, nunca con color.
5. **Las cifras en tablas usan la sans con números tabulares.** La serif se reserva para la cifra grande de cada pliego.

### Gesto propio

**Sacar el libro del estante.** El libro se levanta, los demás se apagan y aparece la portada. Ya está animado en el Figma (frames «Extraer» y «Motion»). Se conserva tal cual y es la única coreografía grande de la app. Dentro del libro, el gesto es pasar página y nada más.

## 4. Alcance: el estante

| Lomo | Pregunta | Qué responde |
|---|---|---|
| **01 Llegar** | Introducción | El territorio: 4 municipios y su población. Es el único volumen que ya tiene datos en el lago. |
| **02 Habitar** | P1 | Ingreso de residentes por zona. Moverse se integra aquí como capa de transporte. |
| **03 Investigar** | P2 | A qué posiciones aspirar según el tejido productivo y la expansión territorial. |
| **04 Aprender** | P3 | Escalabilidad laboral de una persona extranjera. |
| **05 Fuentes y huecos** | Colofón | El catálogo completo, el semáforo y lo que se decidió no mostrar. |

**Conectar sale del estante.** No responde ninguna de las 3 preguntas y Service Map está en amarillo y sin ingerir. Se registra como vuelta atrás en el README. El lomo verde puede quedar en el colofón como «volumen no escrito», con su razón.

### Pliegos por volumen

**02 Habitar (P1)**
1. Mapa 3D de las 167 áreas postales, con la altura y el color según la métrica (ingreso por habitante, ingreso por hogar, % alquiler, densidad). A la derecha, la ficha comparativa A·B frente al promedio metropolitano.
2. Distribución de las 167 áreas (beeswarm), con A y B marcadas.
3. Ingreso × % alquiler: dónde se puede rentar y con qué nivel de ingreso alrededor.
4. *Moverse*: paradas por área postal (cruce Paavo × paradas), con capa opcional de vehículos en vivo.
5. Página en blanco: salario por zona y precio de alquiler. StatFin 13mu solo trae compraventa.

**03 Investigar (P2)**
1. Columnas de empleo por sector (rejilla HSY agregada a 1 km), con el sector del perfil por defecto.
2. Peso de cada sector en el área metropolitana. Al hacer clic en una barra cambia el sector del mapa.
3. Tejido empresarial: conteos de empresas por municipio y sector (PRH, solo conteos).
4. Expansión 2016 → 2024: una cortina sobre la superficie impermeable.
5. Edificación por década, agregada por área postal.
6. Página en blanco: innovación (OpenAlex no está sondeado), vacantes, y alcance de 15 minutos (el ruteo de Digitransit pide llave).

**04 Aprender (P3)**
1. Nivel educativo por área (Paavo `ko_*`) frente al del perfil.
2. Oferta educativa por municipio (Vipunen).
3. Empleo por lengua materna, solo si stat.hel.fi o StatFin traen el desglose. Si no, página en blanco.
4. «Lo que estos datos no pueden decirte»: reconocimiento de títulos, idioma exigido por puesto, salario por origen.

### Antimetas (confirmadas)

- Nada de panel corporativo genérico.
- Nada de 3D decorativo: el 3D solo aparece donde la altura codifica la métrica, con un interruptor a 2D.
- Nada de puntajes ni predicciones por persona.

## 5. Estados y rangos

| Estado | En el vocabulario del libro |
|---|---|
| Cargando | La página «se imprime»: líneas y formas en el color del volumen, sin spinner. |
| Hueco | Página en blanco con la placa gris (como la de Investigar en el Figma). Dice qué faltaría, por qué no está y qué fuente lo llenaría. Nunca muestra ceros ni datos de ejemplo. |
| Protegido | Trama sobre la zona o la celda, con la nota «dato suprimido por la fuente». No cuenta en los promedios. |
| Error | Una «fe de erratas» en el pliego con el error concreto, el último snapshot válido si existe y un botón para reintentar. El resto del libro sigue funcionando. |
| Vencido | Sello «vigencia vencida el …» junto a la cifra. El feed GTFS vence el 2026-11-16. |
| Selección vacía | La ficha A·B muestra el promedio metropolitano y la instrucción «toca dos zonas». |

**Rangos:**
- 167 áreas postales, 4 municipios.
- Rejilla de empleo: unas 15.445 celdas antes de agregar.
- Sectores TOL A–X.
- 6.027 paradas.
- Cada pliego muestra a lo sumo una cifra grande.

## 6. Interacción y layout

- **Escritorio (1440):**
  - Estante con 5 lomos.
  - Portada con el texto del capítulo y el botón «Abrir este capítulo».
  - Pliego de dos páginas: la izquierda lleva la figura y la derecha la lectura, la tabla y la nota al pie.
  - Debajo, la navegación entre libros y «Siguiente libro →», como en el Figma.
- **Teléfono (390):**
  - El estante pasa a ser una lista vertical de lomos acostados.
  - El pliego se apila: primero la figura y luego la lectura.
  - El mapa ocupa el ancho completo con un panel deslizable.
  - Las notas al pie suben a un mínimo de 13 px, porque en el Figma rondan los 10 px.
- **Mi perfil (carné de biblioteca):** sector, educación y lenguas. Solo resalta lo propio en las figuras. Vive en la URL y en memoria, nunca en un servidor ni en `localStorage`.
- **URL compartible:** `?libro=habitar&pliego=1&a=00530&b=02100&m=ingreso`. Sirve para la presentación y para la auditoría de 3 cifras.
- **Brushing:** pasar el cursor por una zona en el mapa la ilumina en la tabla y en la gráfica, y al revés.

## 7. Restricciones y decisiones abiertas

**Correcciones al Figma antes de construir** (anotarlas en la bitácora):

1. **Moverse** cita «informe del proyecto · HSL · 26 oct 2026». Un informe no es una fuente. Debe decir HSL GTFS, vigencia del feed 2026-09-18 → 2026-11-16 y probado 2026-09-20. Los conteos por municipio tienen que salir del lago, no del PDF.
2. **Llegar** dice «corte documentado: 26 oct 2026». Mezcla la fecha del informe con la vigencia (2025) y la fecha de prueba.
3. **Investigar** promete OpenAlex y el alcance de «15 minutos». Ninguna de las dos fuentes existe hoy en el catálogo, así que pasan a páginas en blanco hasta que se sondeen.
4. **Aprender** no tiene ningún dato («propuesta editorial»). Necesita Paavo `ko_*` y Vipunen, o quedarse como hueco declarado.

**Otras restricciones:**
- Stack React + Vite + MapLibre. Para el 3D se exploran MapLibre `fill-extrusion` y deck.gl (tramo Vistas, ≥ 2 herramientas).
- Fuentes tipográficas: confirmar con el compañero cuáles son las del Figma y su licencia antes de usarlas.

**Decisiones abiertas:**
- **Rastreo para P1 y P3:** salario por ocupación (StatFin), empleo por lengua, vacantes, OpenAlex.
- **Orden de construcción sugerido:**
  1. Llegar, que ya tiene datos.
  2. Habitar, después de ingerir Paavo y escribir `verificar.py`.
  3. Investigar.
  4. Aprender.
