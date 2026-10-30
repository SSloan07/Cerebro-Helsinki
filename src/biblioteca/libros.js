// El estante. Cada libro responde una pregunta; cada pliego es una vista.
// tipo: 'datos' (sale del lago) · 'pendiente' (fuente probada, falta ingerirla) · 'hueco' (no hay fuente) · 'texto'.

export const LIBROS = [
  {
    id: 'llegar', titulo: 'Llegar', subtitulo: 'Tu primer capítulo', color: 'salvia', icono: 'brote',
    portada: { titulo: 'Empezar de nuevo, sin empezar solo.', texto: 'Antes de comparar zonas conviene saber de qué ciudad hablamos: cuatro municipios, cada uno con su código oficial y sus propios datos.' },
    pliegos: [
      { id: 'municipios', tipo: 'datos', vista: 'municipios', titulo: 'Cuatro municipios. Muchas formas de empezar.' },
      { id: 'poblacion', tipo: 'datos', vista: 'poblacion', titulo: '¿Cuánta gente vive en cada municipio?' },
      { id: 'ahora', tipo: 'datos', vista: 'ahora', titulo: 'Y ahora mismo, ¿cómo está la ciudad?' },
    ],
  },
  {
    id: 'habitar', titulo: 'Habitar', subtitulo: 'Un lugar propio', color: 'terracota', icono: 'casa', pregunta: 1,
    portada: { titulo: 'Un hogar que encaje contigo.', texto: 'Una dirección es más que un precio. Aquí se compara el ingreso disponible de quienes ya viven en cada zona, cuánto se alquila y qué tan cerca queda el transporte.' },
    pliegos: [
      { id: 'ingreso', tipo: 'datos', vista: 'ingreso', titulo: '¿Cuánto ingresan quienes viven en cada zona?' },
      { id: 'distribucion', tipo: 'datos', vista: 'distribucion', titulo: '¿Esta zona está arriba o en el medio?' },
      { id: 'alquiler', tipo: 'datos', vista: 'alquiler', titulo: '¿Dónde se alquila, y con qué ingreso alrededor?' },
      { id: 'moverse', tipo: 'datos', vista: 'paradas', titulo: 'Hacer tuya la ciudad.' },
      { id: 'precio', tipo: 'datos', vista: 'costos', titulo: '¿Cuánto cuesta vivir aquí, frente a lo que se gana?' },
    ],
  },
  {
    id: 'investigar', titulo: 'Investigar', subtitulo: 'Preguntas que abren puertas', color: 'lavanda', icono: 'lupa', pregunta: 2,
    portada: { titulo: 'Una pregunta puede cambiar tu camino.', texto: 'Dónde está el empleo, en qué sectores se reúne y hacia dónde crece la ciudad: las pistas para saber a qué puestos se puede aspirar.' },
    pliegos: [
      { id: 'empleo', tipo: 'datos', vista: 'empleoZonas', titulo: '¿Dónde se reúne cada sector?' },
      { id: 'sectores', tipo: 'datos', vista: 'sectores', titulo: '¿Qué pesa cada sector en la ciudad?' },
      { id: 'desempleo', tipo: 'datos', vista: 'desempleo', titulo: '¿Dónde cuesta más encontrar trabajo?' },
      { id: 'empresas', tipo: 'datos', vista: 'empresas', titulo: '¿Cuántas empresas hay por sector?' },
      { id: 'expansion', tipo: 'datos', vista: 'expansion', titulo: '¿Hacia dónde crece la ciudad?' },
      { id: 'innovacion', tipo: 'hueco', titulo: 'Innovación, vacantes y alcance: lo que no encontramos abierto.',
        porque: 'Ninguna fuente del catálogo mide investigación, vacantes ni tiempos de viaje sin pedir llave.',
        candidatas: [
          { nombre: 'Investigación e instituciones', nota: 'OpenAlex respondió el 30 oct 2026 (518 instituciones finlandesas con ciudad Helsinki), pero sin llave comparte un cupo diario mínimo con todos los usuarios de la misma red y pide una llave gratuita para uso estable. No se integró: el sistema no depende de ninguna llave. Crossref: sin sondear.' },
          { nombre: 'Vacantes', nota: 'Työmarkkinatori (portal público de empleo): sin sondear.' },
          { id: 'digitransit-routing', nota: '¿Quién llega en 15 minutos? Calcular rutas exige la API de Digitransit, que pide llave.' },
        ] },
    ],
  },
  {
    id: 'aprender', titulo: 'Aprender', subtitulo: 'Crecer sin fronteras', color: 'mostaza', icono: 'libro', pregunta: 3,
    portada: { titulo: 'Tu experiencia puede crecer aquí.', texto: 'Lo que ya sabes no se queda en tu país de origen. Este libro busca qué dicen los datos abiertos sobre formarse, validar y crecer siendo extranjero.' },
    pliegos: [
      { id: 'educacion', tipo: 'datos', vista: 'educacion', titulo: '¿Qué nivel educativo hay en cada zona?' },
      { id: 'oferta', tipo: 'datos', vista: 'oferta', titulo: '¿Dónde se puede estudiar?' },
      { id: 'lengua', tipo: 'datos', vista: 'empleoNacionalidad', titulo: '¿Cómo le va en el empleo a quien llegó de fuera?' },
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
