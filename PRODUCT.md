# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Personas extranjeras, con dos momentos de uso igual de importantes:

- **Antes de mudarse:** evalúan desde fuera de Finlandia si vale la pena mudarse al área metropolitana de Helsinki (Helsinki, Espoo, Vantaa, Kauniainen) y a qué zona. Comparan zonas y sectores, muchas veces sin hablar finés.
- **Ya instaladas:** viven allí y buscan dónde crecer: otra zona, otro sector o reconvertirse.

Audiencia secundaria: el profesor y los grupos del Taller de Datos de EAFIT 2026-2. Evalúan el sistema en clase, con la app abierta en pantalla, y auditan cifras al azar hasta su fuente.

## Product Purpose

Una app de análisis de datos (no una landing) que responde con datos abiertos tres preguntas:

1. **Ingreso de residentes por zona.** Se reformuló desde «prospecto salarial», porque no hay fuente de salario por zona. El dato es el ingreso de residentes (Paavo) y hay que decir que no es salario.
2. **A qué posiciones se puede aspirar**, según la capacidad de innovación y la expansión territorial de la ciudad.
3. **Prospecto de escalabilidad laboral** de una persona extranjera que migra.

Éxito: la persona compara zonas y sectores con cifras que puede rastrear hasta su fuente, y entiende con la misma claridad lo que los datos no pueden decirle.

## Positioning

Cada cifra dice de dónde salió, qué periodo cubre y cuándo se probó, a un clic. Los huecos (lo que no existe abierto para Helsinki) se muestran como hallazgos, no se esconden. Un portal de relocalización o un comparador de costo de vida no hace ninguna de las dos cosas.

## Operating Context

- Se usa en escritorio y en teléfono. El piso técnico exige que abra en un teléfono.
- La presentación en clase es con el sistema abierto en pantalla, sin diapositivas.
- En la revisión cruzada, otro grupo lleva 3 cifras al azar hasta su fuente original. El estado compartible por URL ayuda a hacerlo.

## Capabilities and Constraints

- Reemplaza el gemelo digital actual (Overview, Twin, Mobility, Climate, Innovation, Services). Hay que registrarlo como vuelta atrás en el README.
- Interfaz **solo en español**.
- Stack existente: React 19 + Vite + MapLibre GL, con despliegue previsto en Vercel. Sin llaves pagas.
- **Google Open Buildings no cubre Finlandia** (probado el 2026-09-21). El 3D sale de áreas postales extruidas y, en su caso, de Overture buildings (ODbL, alturas sin validar).
- Ninguna cifra se publica si no sale del lago y pasa por `verificar.py`. Nada de cifras escritas a mano.
- No se muestran: edificios con dirección, empresas individuales, celdas de empleo con 1–2 empleos, contactos de Service Map ni Open311.
- El perfil del usuario (sector, educación, lenguas) no se guarda en ningún servidor ni en almacenamiento persistente.
- **Sin decidir:** fuentes para salario por ocupación, empleo por lengua materna, vacantes e innovación. No están sondeadas y P3 depende de ellas.

## Evidence on Hand

- **Ingerido:** límites municipales (Statistics Finland 2025), 6.027 paradas HSL y GTFS-Realtime (`public/data/`).
- **Catalogado y probado, sin ingerir:** Paavo (167 áreas postales), rejilla de empleo HSY 2024, PRH/YTJ (solo conteos), cobertura del suelo HSY 2016–2024, edificios HSY (solo agregados), Overture buildings, Vipunen, stat.hel.fi. Ver `catalogo/`, `docs/catalogo/fuentes.json` y `Context-docs/informe-datos-gemelo-digital.pdf`.
- **Ausente (no inventar):** salario por zona u ocupación, empleo o ingreso por origen, vacantes, indicadores de innovación o I+D.

## Product Principles

1. Si una cifra no muestra fuente, periodo y fecha de prueba, no se muestra.
2. Un hueco declarado vale más que un proxy disfrazado: se nombra el dato por lo que es.
3. La app ayuda a comparar y no predice el futuro de nadie: nada de puntajes de éxito ni de salarios estimados por persona.
4. La protección es proporcional: se agrega antes de publicar y lo personal no se guarda.

## Accessibility & Inclusion

Lectores no nativos del finés (y quizá tampoco del español técnico): las etiquetas se escriben en lenguaje claro y los términos finlandeses (Paavo, TOL, kunta) se explican. Tiene que poder usarse en teléfono.
