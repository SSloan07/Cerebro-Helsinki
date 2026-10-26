// El estante. Cada libro responde una pregunta; cada pliego es una vista.
// tipo: 'datos' (sale del lago) · 'pendiente' (fuente probada, falta ingerirla) · 'hueco' (no hay fuente) · 'texto'.

export const LIBROS = [
  {
    id: 'llegar', titulo: 'Llegar', subtitulo: 'Tu primer capítulo', color: 'salvia', icono: 'brote',
    portada: { titulo: 'Empezar de nuevo, sin empezar solo.', texto: 'Antes de comparar zonas conviene saber de qué ciudad hablamos: cuatro municipios, cada uno con su código oficial y sus propios datos.' },
    pliegos: [
      { id: 'municipios', tipo: 'datos', vista: 'municipios', titulo: 'Cuatro municipios. Muchas formas de empezar.' },
      { id: 'poblacion', tipo: 'pendiente', figura: 'barras', titulo: '¿Cuánta gente vive en cada municipio?',
        promesa: 'La población de cada municipio al 31 de diciembre, y con ella el denominador para comparar paradas, empleos o servicios por cada mil habitantes.',
        fuentes: ['statfin-population-11ra'], falta: ['Ingerir la tabla 11ra de StatFin al lago.', 'Cruzar por código municipal (091, 049, 092, 235), nunca por nombre.'] },
    ],
  },
  {
    id: 'habitar', titulo: 'Habitar', subtitulo: 'Un lugar propio', color: 'terracota', icono: 'casa', pregunta: 1,
    portada: { titulo: 'Un hogar que encaje contigo.', texto: 'Una dirección es más que un precio. Aquí se compara el ingreso de quienes ya viven en cada zona, cuánto se alquila y qué tan cerca queda el transporte.' },
    pliegos: [
      { id: 'ingreso', tipo: 'pendiente', figura: 'mapa3d', titulo: '¿Cuánto ingresan quienes viven en cada zona?',
        promesa: 'Las 167 áreas postales levantadas en 3D: la altura y el color dicen el ingreso medio de sus residentes. Tocas dos zonas y se comparan con el promedio metropolitano.',
        aviso: 'Ingreso de residentes no es salario: incluye pensiones y transferencias, y se mide donde la persona vive, no donde trabaja.',
        fuentes: ['sf-paavo-2026'], falta: ['Ingerir Paavo 2026 (WFS de Statistics Finland) al lago.', 'Confirmar los campos hr_ktu y tr_ktu y su año de referencia.', 'Escribir su contrato y pasarlo por verificar.py.'] },
      { id: 'distribucion', tipo: 'pendiente', figura: 'enjambre', titulo: '¿Esta zona está arriba o en el medio?',
        promesa: 'Las 167 áreas en una sola línea, de menor a mayor ingreso, con tus dos zonas marcadas.',
        fuentes: ['sf-paavo-2026'], falta: ['Misma ingesta de Paavo.'] },
      { id: 'alquiler', tipo: 'pendiente', figura: 'dispersion', titulo: '¿Dónde se alquila, y con qué ingreso alrededor?',
        promesa: 'Cada área según el porcentaje de hogares que alquilan y el ingreso medio de sus residentes.',
        fuentes: ['sf-paavo-2026'], falta: ['Misma ingesta de Paavo (campo te_vuok_as).'] },
      { id: 'moverse', tipo: 'datos', vista: 'paradas', titulo: 'Hacer tuya la ciudad.' },
      { id: 'precio', tipo: 'hueco', titulo: 'Lo que cuesta vivir aquí, todavía sin fuente.',
        porque: 'No hay una fuente abierta de salario por zona, y la de precios de vivienda solo cubre compraventa.',
        candidatas: [
          { id: 'statfin-ashi-13mu', nota: 'Precio de vivienda usada por código postal: compraventa, no alquiler. Solo se consultaron los metadatos.' },
          { id: 'numbeo', nota: 'Costo de vida: sus términos prohíben el uso por API sin permiso.' },
          { id: 'inside-airbnb', nota: 'Alquiler de corta estancia: no cubre Helsinki.' },
          { nombre: 'Salario por zona', nota: 'No se encontró ninguna fuente abierta. Sin sondear: la estructura salarial de StatFin por ocupación.' },
        ] },
    ],
  },
  {
    id: 'investigar', titulo: 'Investigar', subtitulo: 'Preguntas que abren puertas', color: 'lavanda', icono: 'lupa', pregunta: 2,
    portada: { titulo: 'Una pregunta puede cambiar tu camino.', texto: 'Dónde está el empleo, en qué sectores se reúne y hacia dónde crece la ciudad: las pistas para saber a qué puestos se puede aspirar.' },
    pliegos: [
      { id: 'empleo', tipo: 'pendiente', figura: 'columnas', titulo: '¿Dónde se reúne cada sector?',
        promesa: 'Columnas de empleo por sector sobre el mapa, agregadas a 1 km para que ninguna celda señale a una sola empresa.',
        fuentes: ['hsy-tyopaikkaruudukko-2024'], falta: ['Ingerir la rejilla de empleo de HSY.', 'Agregar a 1 km o a área postal antes de publicar; las celdas suprimidas (-1) se dibujan con trama, nunca como cero.'] },
      { id: 'sectores', tipo: 'pendiente', figura: 'barras', titulo: '¿Qué pesa cada sector en la ciudad?',
        promesa: 'Los empleos por sector (TOL 2008, letras A–X) en los cuatro municipios. Al tocar un sector, el mapa cambia.',
        fuentes: ['hsy-tyopaikkaruudukko-2024'], falta: ['Misma ingesta de la rejilla de empleo.'] },
      { id: 'empresas', tipo: 'pendiente', figura: 'barras', titulo: '¿Cuántas empresas hay por sector?',
        promesa: 'Conteos de empresas por municipio y sector. Nunca registros individuales: muchos llevan el nombre de una persona.',
        fuentes: ['prh-ytj-v3'], falta: ['Script que guarde solo conteos, sin nombres.', 'Confirmar la licencia en avoindata.prh.fi.'] },
      { id: 'expansion', tipo: 'pendiente', figura: 'cortina', titulo: '¿Hacia dónde crece la ciudad?',
        promesa: 'La superficie impermeable de 2016 y de 2024 con una cortina para comparar los dos años.',
        fuentes: ['hsy-land-cover'], falta: ['Ingerir la cobertura del suelo de HSY en sus dos cortes.'] },
      { id: 'innovacion', tipo: 'hueco', titulo: 'Innovación, vacantes y alcance: lo que no encontramos abierto.',
        porque: 'Ninguna fuente del catálogo mide investigación, vacantes ni tiempos de viaje sin pedir llave.',
        candidatas: [
          { nombre: 'Investigación e instituciones', nota: 'OpenAlex y Crossref: sin sondear.' },
          { nombre: 'Vacantes', nota: 'Työmarkkinatori (portal público de empleo): sin sondear.' },
          { id: 'digitransit-routing', nota: '¿Quién llega en 15 minutos? Calcular rutas exige la API de Digitransit, que pide llave.' },
        ] },
    ],
  },
  {
    id: 'aprender', titulo: 'Aprender', subtitulo: 'Crecer sin fronteras', color: 'mostaza', icono: 'libro', pregunta: 3,
    portada: { titulo: 'Tu experiencia puede crecer aquí.', texto: 'Lo que ya sabes no se queda en tu país de origen. Este libro busca qué dicen los datos abiertos sobre formarse, validar y crecer siendo extranjero.' },
    pliegos: [
      { id: 'educacion', tipo: 'pendiente', figura: 'mapa3d', titulo: '¿Qué nivel educativo hay en cada zona?',
        promesa: 'La proporción de residentes con educación superior por área postal, para ubicar dónde tu formación es más o menos común.',
        fuentes: ['sf-paavo-2026'], falta: ['Ingesta de Paavo (campos ko_*).'] },
      { id: 'oferta', tipo: 'pendiente', figura: 'barras', titulo: '¿Dónde se puede estudiar o validar?',
        promesa: 'Matrícula y titulación por municipio.',
        fuentes: ['vipunen-education'], falta: ['Ingerir Vipunen.', 'Reconfirmar su licencia.'] },
      { id: 'lengua', tipo: 'hueco', titulo: '¿Cómo le va en el empleo a quien habla otra lengua?',
        porque: 'Ninguna fuente del catálogo trae empleo o ingreso por lengua materna u origen.',
        candidatas: [
          { id: 'helsinki-region-statistics', nota: 'Series regionales de stat.hel.fi: trae empleo por distrito; falta confirmar si se desglosa por lengua.' },
          { nombre: 'Empleo por origen', nota: 'Tablas de StatFin por lengua materna: sin sondear.' },
        ] },
      { id: 'limites', tipo: 'texto', vista: 'limites', titulo: 'Lo que estos datos no pueden decirte.' },
    ],
  },
  {
    id: 'fuentes', titulo: 'Fuentes', subtitulo: 'De dónde sale cada cifra', color: 'verde', icono: 'ficha',
    portada: { titulo: 'Toda cifra tiene un origen.', texto: 'El catálogo completo: las fuentes que entraron, las que se cayeron, las que descartamos y por qué. También lo que decidimos no mostrar.' },
    pliegos: [
      { id: 'catalogo', tipo: 'datos', vista: 'catalogo', titulo: 'El catálogo, también lo que no sirvió.' },
      { id: 'fichas', tipo: 'datos', vista: 'fichas', titulo: 'Todas las fichas.' },
      { id: 'no-mostramos', tipo: 'texto', vista: 'noMostramos', titulo: 'Lo que decidimos no mostrar.' },
    ],
  },
]

export const coberturaDe = libro => ({ conDatos: libro.pliegos.filter(pliego => pliego.tipo === 'datos').length, total: libro.pliegos.length })
