import { useMemo, useState } from 'react'
import { Mapa } from './Mapa.jsx'
import { Placa, Pliego, Ref } from './pliegos.jsx'
import { SECTORES } from './pliegosAreas.jsx'
import { horaHelsinki, numero, useEducacion, useEmpresas, useEnVivo, useNacionalidad, useRentas, useSalarios, useSuelo } from './datos.js'

const NOMBRE_MUNICIPIO = { '091': 'Helsinki', '049': 'Espoo', '092': 'Vantaa', '235': 'Kauniainen' }
const ORDEN = ['091', '049', '092', '235']
const decimal = (valor, cifras = 1) => valor.toLocaleString('es-ES', { minimumFractionDigits: cifras, maximumFractionDigits: cifras })
const porcentaje = valor => `${decimal(valor)} %`
const sinMapa = libro => <Placa libro={libro} gris rotulo="Sin límites municipales"><p className="placa-grande">No se pudieron leer los límites del lago.</p></Placa>

// Los tres estados de un archivo del lago: cargando, error o datos.
function Archivo({ estado, nombre, children }) {
  if (estado.cargando) return <p className="cargando">Leyendo {nombre} del lago…</p>
  if (estado.error) return <p className="errata">No se pudo leer {nombre}: {estado.error}. No se muestran cifras.</p>
  return children(estado.datos)
}

const trimestre = clave => `${clave.slice(5)}.º trimestre de ${clave.slice(0, 4)}`

// ── Habitar 5 · Salario y alquiler ───────────────────────────────────────────
export function Costos({ libro, indice, pliego, lago }) {
  const rentas = useRentas(), salarios = useSalarios()
  const [metros, setMetros] = useState(40)
  const [resaltado, setResaltado] = useState(null)
  return <Pliego libro={libro} indice={indice} titulo={pliego.titulo}
    notas={[{ fuente: 'statfin-rents-15fa' }, { fuente: 'statfin-earnings-15b2' }, { detalle: 'Alquiler de un piso de ejemplo y su peso sobre el salario mediano: cálculo propio. El tamaño lo eliges tú; no es un dato de la fuente.' }]}
    figura={lago.municipios ? <Mapa municipios={lago.municipios} resaltado={resaltado} onResaltado={setResaltado} etiqueta="Mapa de los cuatro municipios" /> : sinMapa(libro)}>
    <Archivo estado={rentas} nombre="rents.json">{r => <Archivo estado={salarios} nombre="earnings.json">{e => {
      const ultimo = r.latest_quarter
      const filas = ['091', '049', '092', 'pks'].map(codigo => ({ codigo, nombre: { pks: 'Gran Helsinki', '049': 'Espoo y Kauniainen' }[codigo] || r.area_names[codigo], ...r.series[codigo]?.[ultimo] })).filter(f => f.eur_per_m2 != null)
      const mediana = e.earnings.total.median
      const maximo = Math.max(...filas.map(f => f.eur_per_m2))
      return <>
        <p className="entrada">El alquiler medio en el Gran Helsinki es de <b>{decimal(filas.find(f => f.codigo === 'pks')?.eur_per_m2 ?? 0, 2)} € por m²</b> al mes ({trimestre(ultimo)}, mercado libre)<Ref n={1} />. El salario mediano de quienes trabajan a tiempo completo en Uusimaa es de <b>{numero(mediana)} € brutos</b> al mes (2024)<Ref n={2} />.</p>
        <table className="barras" aria-label="Alquiler medio por m² y ciudad">
          <tbody>{filas.map(f => <tr key={f.codigo} className={resaltado === f.codigo ? 'resaltado' : ''} onMouseEnter={() => setResaltado(f.codigo)} onMouseLeave={() => setResaltado(null)}>
            <th scope="row">{f.nombre}</th><td className="barra"><span style={{ '--ancho': `${(f.eur_per_m2 / maximo) * 100}%` }} /></td><td className="valor">{decimal(f.eur_per_m2, 2)} €</td>
          </tr>)}</tbody>
        </table>
        <h3 className="subtitulo">¿Y un piso de {metros} m²?<Ref n={3} /></h3>
        <label className="deslizador">Tamaño del piso: {metros} m²<input type="range" min="20" max="120" step="5" value={metros} onChange={evento => setMetros(Number(evento.target.value))} /></label>
        <table className="barras compacta" aria-label="Alquiler de un piso de ejemplo">
          <tbody>{filas.map(f => {
            const mensual = f.eur_per_m2 * metros
            return <tr key={f.codigo}><th scope="row">{f.nombre}</th><td className="valor ancho">{numero(Math.round(mensual))} € / mes</td><td className="valor">{porcentaje((100 * mensual) / mediana)}</td></tr>
          })}</tbody>
        </table>
        <p className="lectura-texto tenue">La última columna es ese alquiler sobre el salario mediano bruto de Uusimaa. Es un ejemplo para pensar la escala, no tu caso: el salario es regional y bruto (antes de impuestos), y el alquiler es un promedio de contratos vigentes, no el precio de un anuncio. Hay datos por ciudad, no por barrio.</p>
        <p className="lectura-texto tenue">Rango salarial en Uusimaa: el 10 % que menos gana recibe hasta {numero(e.earnings.total.p10)} € y el 10 % que más gana, desde {numero(e.earnings.total.p90)} €.</p>
      </>
    }}</Archivo>}</Archivo>
  </Pliego>
}

// ── Investigar 4 · Empresas por sector ──────────────────────────────────────
export function Empresas({ libro, indice, pliego, lago }) {
  const empresas = useEmpresas()
  const [seleccion, setSeleccion] = useState('091')
  const [resaltado, setResaltado] = useState(null)
  return <Pliego libro={libro} indice={indice} titulo={pliego.titulo}
    notas={[{ fuente: 'prh-ytj-companies' }, { detalle: 'Las secciones agrupan las divisiones de la clasificación TOL 2008; el agrupado es del ETL. Solo se guardaron conteos, nunca registros de empresas.' }]}
    figura={lago.municipios ? <Mapa municipios={lago.municipios} seleccion={seleccion} resaltado={resaltado} onSeleccion={setSeleccion} onResaltado={setResaltado} etiqueta="Elige un municipio" /> : sinMapa(libro)}>
    <Archivo estado={empresas} nombre="companies.json">{datos => {
      const municipio = datos.by_municipality[seleccion]
      const filas = Object.entries(municipio.sections).sort(([, a], [, b]) => (b ?? -1) - (a ?? -1))
      const maximo = Math.max(...filas.map(([, valor]) => valor ?? 0), 1)
      return <>
        <p className="cifra-grande">{numero(municipio.total)}</p>
        <p className="cifra-texto">empresas registradas con domicilio en {municipio.name}<Ref n={1} /></p>
        <table className="barras" aria-label={`Empresas por sector en ${municipio.name}`}>
          <tbody>{filas.map(([letra, valor]) => <tr key={letra}>
            <th scope="row" title={SECTORES[letra]}>{letra} · {SECTORES[letra]}</th>
            <td className="barra">{valor != null && <span style={{ '--ancho': `${(valor / maximo) * 100}%` }} />}</td>
            <td className="valor">{valor == null ? <span className="oculto" title={`Menos de ${datos.min_cell} empresas: se oculta`}>&lt; {datos.min_cell}</span> : numero(valor)}</td>
          </tr>)}</tbody>
        </table>
        <p className="lectura-texto tenue">{numero(municipio.without_activity)} empresas no declaran actividad principal y solo cuentan en el total. Esto cuenta empresas, no empleos: una empresa de una persona pesa igual que una de mil. El sector L (inmobiliarias) es el más grande porque el registro incluye las sociedades de vivienda de cada edificio. Los sectores con menos de {datos.min_cell} empresas se ocultan<Ref n={2} />.</p>
      </>
    }}</Archivo>
  </Pliego>
}

// ── Investigar 5 · Expansión ────────────────────────────────────────────────
const COLORES_LINEA = { '091': '--lavanda-fuerte', '049': '--terracota-fuerte', '092': '--mostaza-fuerte', '235': '--verde-fuerte' }

export function Expansion({ libro, indice, pliego }) {
  const suelo = useSuelo()
  const [anio, setAnio] = useState(null)
  const [resaltado, setResaltado] = useState(null)
  return <Pliego libro={libro} indice={indice} titulo={pliego.titulo}
    notas={[{ fuente: 'hsy-land-cover' }, { detalle: 'Cambio entre ediciones y participación de cada municipio: cálculo propio sobre land_cover.json.' }]}
    figura={<Archivo estado={suelo} nombre="land_cover.json">{datos => {
      const anios = datos.years
      const maximo = Math.max(...ORDEN.flatMap(codigo => anios.map(a => datos.by_municipality[codigo][a].impermeable_km2)))
      const x = i => 56 + (i / (anios.length - 1)) * 470, y = valor => 220 - (valor / maximo) * 190
      return <div className="grafica">
        <svg viewBox="0 0 600 270" className="dispersion" role="img" aria-label="Superficie impermeable por municipio y año">
          {[0, 0.5, 1].map(t => <g key={t}><line x1="56" x2="526" y1={y(maximo * t)} y2={y(maximo * t)} className="rejilla" /><text x="50" y={y(maximo * t) + 4} className="texto-eje" textAnchor="end">{numero(Math.round(maximo * t))}</text></g>)}
          {anios.map((a, i) => <text key={a} x={x(i)} y="244" className="texto-eje" textAnchor="middle">{a}</text>)}
          <text x="6" y="16" className="texto-eje">km²</text>
          {ORDEN.map(codigo => <g key={codigo} className={`linea-municipio ${resaltado && resaltado !== codigo ? 'apagada' : ''}`} style={{ '--linea': `var(${COLORES_LINEA[codigo]})` }}>
            <polyline points={anios.map((a, i) => `${x(i)},${y(datos.by_municipality[codigo][a].impermeable_km2)}`).join(' ')} />
            {anios.map((a, i) => <circle key={a} cx={x(i)} cy={y(datos.by_municipality[codigo][a].impermeable_km2)} r={String(anio ?? anios.at(-1)) === String(a) ? 5.5 : 3.2}><title>{NOMBRE_MUNICIPIO[codigo]} {a}: {decimal(datos.by_municipality[codigo][a].impermeable_km2, 2)} km²</title></circle>)}
          </g>)}
        </svg>
        <div className="leyenda">{ORDEN.map(codigo => <span key={codigo} onMouseEnter={() => setResaltado(codigo)} onMouseLeave={() => setResaltado(null)}><i className="punto" style={{ background: `var(${COLORES_LINEA[codigo]})` }} />{NOMBRE_MUNICIPIO[codigo]}</span>)}</div>
      </div>
    }}</Archivo>}>
    <Archivo estado={suelo} nombre="land_cover.json">{datos => {
      const anios = datos.years, primero = anios[0], elegido = anio ?? anios.at(-1)
      const filas = ORDEN.map(codigo => {
        const inicio = datos.by_municipality[codigo][primero].impermeable_km2, ahora = datos.by_municipality[codigo][elegido].impermeable_km2
        return { codigo, inicio, ahora, cambio: inicio ? (100 * (ahora - inicio)) / inicio : null }
      })
      const total = filas.reduce((suma, f) => suma + f.ahora, 0), totalInicio = filas.reduce((suma, f) => suma + f.inicio, 0)
      // Una ciudad que se construye no se «des-sella» en los cuatro municipios a la vez: si pasa, es el método de esa edición.
      const bajan = anios.slice(1).filter((a, i) => ORDEN.every(codigo => datos.by_municipality[codigo][a].impermeable_km2 < datos.by_municipality[codigo][anios[i]].impermeable_km2))
      return <>
        <p className="entrada">La superficie impermeable (edificios, calles pavimentadas y otras superficies selladas) de los cuatro municipios pasó de <b>{decimal(totalInicio, 1)} km²</b> en {primero} a <b>{decimal(total, 1)} km²</b> en {elegido}<Ref n={1} />.</p>
        <label className="deslizador">Año: {elegido}<input type="range" min="0" max={anios.length - 1} step="1" value={anios.indexOf(elegido)} onChange={evento => setAnio(anios[Number(evento.target.value)])} /></label>
        <table className="barras" aria-label="Superficie impermeable y cambio desde 2016">
          <tbody>{filas.map(f => <tr key={f.codigo} className={resaltado === f.codigo ? 'resaltado' : ''} onMouseEnter={() => setResaltado(f.codigo)} onMouseLeave={() => setResaltado(null)}>
            <th scope="row">{NOMBRE_MUNICIPIO[f.codigo]}</th>
            <td className="valor ancho">{decimal(f.ahora, 1)} km²</td>
            <td className="valor">{f.cambio == null ? '—' : `${f.cambio >= 0 ? '+' : '−'}${decimal(Math.abs(f.cambio))} %`}</td>
          </tr>)}</tbody>
        </table>
        {bajan.length > 0 && <p className="aviso"><b>Ojo:</b> en {bajan.join(' y ')} la superficie sellada baja en los cuatro municipios a la vez. Es más probable que sea un cambio de imágenes o de clasificación de esa edición que una ciudad que se «des-sella»; por eso conviene leer la tendencia entre {primero} y {anios.at(-1)} y no año a año.</p>}
        <p className="lectura-texto tenue">La última columna es el cambio desde {primero}<Ref n={2} />. Cada edición sale de imágenes y clasificaciones distintas: una variación pequeña puede ser un cambio de método y no construcción nueva. No dice qué se construyó ni para quién.</p>
      </>
    }}</Archivo>
  </Pliego>
}

// ── Aprender 2 · Oferta educativa ───────────────────────────────────────────
const NIVELES = { comprehensive: 'Educación básica', upper_secondary: 'Bachillerato general', vocational: 'Formación profesional', applied_sciences: 'Universidad de ciencias aplicadas', university: 'Universidad' }

export function Oferta({ libro, indice, pliego, lago }) {
  const educacion = useEducacion()
  const [seleccion, setSeleccion] = useState('091')
  const [resaltado, setResaltado] = useState(null)
  return <Pliego libro={libro} indice={indice} titulo={pliego.titulo}
    notas={[{ fuente: 'statfin-education-11c4' }, { detalle: 'Participación de estudiantes de lengua extranjera: cálculo propio (de lengua extranjera ÷ estudiantes).' }]}
    figura={lago.municipios ? <Mapa municipios={lago.municipios} seleccion={seleccion} resaltado={resaltado} onSeleccion={setSeleccion} onResaltado={setResaltado} etiqueta="Elige un municipio" /> : sinMapa(libro)}>
    <Archivo estado={educacion} nombre="education.json">{datos => {
      const sectores = datos.by_municipality[seleccion]
      const total = Object.values(sectores).reduce((suma, s) => suma + (s.students ?? 0), 0)
      const extranjeros = Object.values(sectores).reduce((suma, s) => suma + (s.foreign_language_students ?? 0), 0)
      return <>
        <p className="cifra-grande">{numero(total)}</p>
        <p className="cifra-texto">estudiantes en instituciones de {NOMBRE_MUNICIPIO[seleccion]} en {datos.year}, {numero(extranjeros)} de lengua materna extranjera<Ref n={1} /></p>
        <table className="barras" aria-label={`Estudiantes por nivel en ${NOMBRE_MUNICIPIO[seleccion]}`}>
          <thead><tr><th scope="col" className="sr">Nivel</th><th scope="col" className="sr">Barra</th><th scope="col" className="valor">Estudiantes</th><th scope="col" className="valor">Lengua extranjera</th></tr></thead>
          <tbody>{Object.entries(NIVELES).map(([clave, nombre]) => {
            const s = sectores[clave]
            return <tr key={clave}><th scope="row">{nombre}</th>
              <td className="barra"><span style={{ '--ancho': `${((s.students ?? 0) / Math.max(...Object.values(sectores).map(v => v.students ?? 0), 1)) * 100}%` }} /></td>
              <td className="valor">{s.students == null ? '—' : numero(s.students)}</td>
              <td className="valor">{s.foreign_language_students == null || !s.students ? '—' : porcentaje((100 * s.foreign_language_students) / s.students)}<Ref n={2} /></td></tr>
          })}</tbody>
        </table>
        <p className="lectura-texto tenue">Las cifras cuentan a los estudiantes donde está la institución, no donde viven, y no dicen si una institución reconoce títulos de otro país ni qué ayudas ofrece.</p>
      </>
    }}</Archivo>
  </Pliego>
}

// ── Aprender 3 · Empleo según nacionalidad ──────────────────────────────────
export function EmpleoNacionalidad({ libro, indice, pliego }) {
  const nacionalidad = useNacionalidad()
  return <Pliego libro={libro} indice={indice} titulo={pliego.titulo}
    notas={[{ fuente: 'statfin-employment-nationality-115f' }, { detalle: 'Tasa de empleo (ocupados ÷ población de 18 a 64 años) y brecha frente a la ciudadanía finlandesa: cálculo propio sobre employment_nationality.json.' }]}
    figura={<Archivo estado={nacionalidad} nombre="employment_nationality.json">{datos => {
      const grupos = Object.entries(datos.groups).filter(([, g]) => g.employment_rate != null)
      return <div className="grafica">
        <svg viewBox="0 0 600 270" className="dispersion" role="img" aria-label="Tasa de empleo por nacionalidad en Uusimaa">
          {grupos.map(([codigo, g], i) => <g key={codigo} transform={`translate(0 ${i * 40 + 14})`}>
            <text x="150" y="16" className="texto-eje" textAnchor="end">{NOMBRE_GRUPO[codigo]}</text>
            <rect x="160" y="2" width={(g.employment_rate / 100) * 380} height="22" className={`barra-grupo ${codigo === '246' ? 'base' : ''}`}><title>{NOMBRE_GRUPO[codigo]}: {porcentaje(g.employment_rate)}</title></rect>
            <text x={160 + (g.employment_rate / 100) * 380 + 8} y="18" className="texto-eje">{porcentaje(g.employment_rate)}</text>
          </g>)}
        </svg>
        <p className="estado-vivo">Ocupados como porcentaje de la población de 18 a 64 años, Uusimaa, {datos.year}.</p>
      </div>
    }}</Archivo>}>
    <Archivo estado={nacionalidad} nombre="employment_nationality.json">{datos => {
      const base = datos.groups['246'], extranjeros = Object.entries(datos.groups).filter(([codigo]) => codigo !== '246' && codigo !== 'MUU' && datos.groups[codigo].employment_rate != null)
      const ocupados = extranjeros.reduce((suma, [, g]) => suma + g.employed, 0), poblacion = extranjeros.reduce((suma, [, g]) => suma + g.population_18_64, 0)
      const tasa = (100 * ocupados) / poblacion
      return <>
        <p className="entrada">En Uusimaa, <b>{porcentaje(base.employment_rate)}</b> de los ciudadanos finlandeses de 18 a 64 años tiene empleo<Ref n={1} />. Entre quienes tienen nacionalidad de otro país (Europa, África, América y Asia) es <b>{porcentaje(tasa)}</b><Ref n={2} />, {decimal(base.employment_rate - tasa)} puntos menos.</p>
        <table className="barras compacta" aria-label="Desempleo por nacionalidad">
          <thead><tr><th scope="col">Nacionalidad</th><th scope="col" className="valor">Empleo</th><th scope="col" className="valor">Desempleo</th></tr></thead>
          <tbody>{Object.entries(datos.groups).map(([codigo, g]) => <tr key={codigo}><th scope="row">{NOMBRE_GRUPO[codigo]}</th><td className="valor">{g.employment_rate == null ? '—' : porcentaje(g.employment_rate)}</td><td className="valor">{g.unemployment_rate == null ? '—' : porcentaje(g.unemployment_rate)}</td></tr>)}</tbody>
        </table>
        <p className="aviso"><b>Ojo:</b> es nacionalidad, no lengua materna ni origen, y es la región de Uusimaa, no un municipio. Quien se naturalizó cuenta como finlandés. La tabla por lengua de Statistics Finland no tiene desglose regional.</p>
      </>
    }}</Archivo>
  </Pliego>
}
const NOMBRE_GRUPO = { 246: 'Finlandia', EUR: 'Resto de Europa', AFR: 'África', AME: 'América', AAS: 'Asia', MUU: 'Otra o desconocida' }

// ── Llegar 3 · Ahora mismo (tiempo real) ────────────────────────────────────
function Contornos({ municipios, estaciones, valor, etiqueta }) {
  const { caminos, ancho, alto, punto } = useMemo(() => {
    const anillos = municipios.features.flatMap(f => (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates).map(poligono => poligono[0]))
    const lons = anillos.flat().map(c => c[0]), lats = anillos.flat().map(c => c[1])
    const minLon = Math.min(...lons), maxLon = Math.max(...lons), minLat = Math.min(...lats), maxLat = Math.max(...lats)
    const escala = Math.cos(((minLat + maxLat) / 2) * Math.PI / 180), ancho = 600, alto = Math.round((ancho * (maxLat - minLat)) / ((maxLon - minLon) * escala))
    const proyectar = ([lon, lat]) => [((lon - minLon) / (maxLon - minLon)) * ancho, ((maxLat - lat) / (maxLat - minLat)) * alto]
    return { ancho, alto, punto: proyectar, caminos: anillos.map(anillo => `M${anillo.map(c => proyectar(c).map(n => n.toFixed(1)).join(',')).join('L')}Z`) }
  }, [municipios])
  return <svg viewBox={`0 0 ${ancho} ${alto}`} className="mapa-vivo" role="img" aria-label={etiqueta}>
    {caminos.map((d, i) => <path key={i} d={d} className="contorno" />)}
    {estaciones.map(e => { const [cx, cy] = punto([e.lon, e.lat]); const v = valor(e); return v ? <circle key={e.id} cx={cx} cy={cy} r={v.radio} style={{ fill: v.color }} className="estacion"><title>{v.titulo}</title></circle> : null })}
  </svg>
}

const formatoCorto = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Helsinki' })
const horaCorta = iso => formatoCorto.format(new Date(iso))
const mezcla = (t) => `color-mix(in srgb, var(--verde-fuerte) ${Math.round((1 - t) * 100)}%, var(--terracota-fuerte))`

function EstadoVivo({ vivo, nombre }) {
  if (vivo.estado === 'consultando') return <p className="cargando" role="status">Consultando {nombre}…</p>
  if (vivo.estado === 'caido') return <p className="errata" role="status">{nombre} no respondió ({vivo.motivo}). No se muestra ningún valor anterior como si fuera de ahora.</p>
  return null
}

export function Ahora({ libro, indice, pliego, lago }) {
  const clima = useEnVivo('/api/live-weather', 300000), aire = useEnVivo('/api/live-air', 60000), trafico = useEnVivo('/api/live-traffic', 60000), trenes = useEnVivo('/api/live-trains', 30000)
  const [capa, setCapa] = useState('aire')
  const estaciones = capa === 'aire' ? aire.datos?.stations || [] : trafico.datos?.stations || []
  const maxFlujo = Math.max(...(trafico.datos?.stations || []).map(s => s.vehicles_per_hour), 1)
  const maxIndice = Math.max(...(aire.datos?.stations || []).map(s => s.index ?? 0), 1)
  const valor = capa === 'aire'
    ? e => e.index == null ? null : { radio: 9, color: mezcla(e.index / maxIndice), titulo: `${e.name}: índice ${e.index}` }
    : e => ({ radio: 3 + 7 * Math.sqrt(e.vehicles_per_hour / maxFlujo), color: 'var(--azul-fuerte)', titulo: `${e.name}: ${numero(e.vehicles_per_hour)} vehículos en la última hora` })
  const notas = [{ detalle: `Se consulta al abrir la página y cada minuto; la hora de cada dato es la de la fuente.`, fuente: 'fmi-weather' }, { fuente: 'hsy-air-quality-now' }, { fuente: 'digitraffic-road-tms' }, { fuente: 'digitraffic-rail' }]
  return <Pliego libro={libro} indice={indice} titulo={pliego.titulo} notas={notas}
    figura={<>
      {lago.municipios ? <Contornos municipios={lago.municipios} estaciones={estaciones} valor={valor} etiqueta={capa === 'aire' ? 'Estaciones de calidad del aire' : 'Estaciones de conteo de tráfico'} /> : sinMapa(libro)}
      <div className="leyenda">
        <span><input type="radio" id="capa-aire" name="capa" checked={capa === 'aire'} onChange={() => setCapa('aire')} /><label htmlFor="capa-aire">Calidad del aire</label></span>
        <span><input type="radio" id="capa-trafico" name="capa" checked={capa === 'trafico'} onChange={() => setCapa('trafico')} /><label htmlFor="capa-trafico">Tráfico en carreteras</label></span>
      </div>
      <p className="estado-vivo">{capa === 'aire' ? 'Cada punto es una estación de HSY; más rojo es peor aire.' : 'Cada punto es una estación de la red vial estatal; más grande, más vehículos.'}</p>
    </>}>
    <EstadoVivo vivo={clima} nombre="el tiempo de FMI" />
    {clima.estado === 'vivo' && <>
      <p className="cifra-grande">{decimal(clima.datos.observations.temperature_c)} °C</p>
      <p className="cifra-texto">en Kaisaniemi, centro de Helsinki, a las {horaHelsinki(clima.datos.observed_at)}<Ref n={1} />. Viento {decimal(clima.datos.observations.wind_ms)} m/s{clima.datos.observations.humidity_pct != null && <>, humedad {numero(clima.datos.observations.humidity_pct)} %</>}{clima.datos.observations.rain_mm_1h != null && <>, lluvia de la última hora {decimal(clima.datos.observations.rain_mm_1h)} mm</>}.</p>
    </>}
    <h3 className="subtitulo">Aire<Ref n={2} /></h3>
    <EstadoVivo vivo={aire} nombre="la red de calidad del aire de HSY" />
    {aire.estado === 'vivo' && <table className="barras compacta" aria-label="Índice de calidad del aire por estación"><tbody>{[...aire.datos.stations].sort((a, b) => (b.index ?? -1) - (a.index ?? -1)).map(s => <tr key={s.id}>
      <th scope="row">{s.name}</th><td className="valor">{s.index ?? '—'}</td></tr>)}</tbody></table>}
    {aire.estado === 'vivo' && <p className="lectura-texto tenue">Índice de calidad del aire de HSY a las {horaHelsinki(aire.datos.observed_at)}: un número menor es mejor aire. Mide cada estación, no tu calle.</p>}
    <h3 className="subtitulo">Carreteras<Ref n={3} /></h3>
    <EstadoVivo vivo={trafico} nombre="las estaciones de tráfico de Digitraffic" />
    {trafico.estado === 'vivo' && <>
      <table className="barras compacta" aria-label="Vehículos en la última hora por municipio"><tbody>{ORDEN.filter(c => trafico.datos.by_municipality[c]).map(codigo => <tr key={codigo}>
        <th scope="row">{NOMBRE_MUNICIPIO[codigo]}</th><td className="valor ancho">{numero(trafico.datos.by_municipality[codigo].vehicles_per_hour)} veh/h</td><td className="valor tenue">{numero(trafico.datos.by_municipality[codigo].stations)} est.</td></tr>)}</tbody></table>
      <p className="lectura-texto tenue">Es la suma de las {numero(trafico.datos.station_count)} estaciones que miden en autopistas y carreteras estatales, no el tráfico total de la ciudad. No incluye calles municipales. Actualizado a las {horaHelsinki(trafico.datos.data_updated)}.</p>
    </>}
    <h3 className="subtitulo">Trenes desde la estación central<Ref n={4} /></h3>
    <EstadoVivo vivo={trenes} nombre="los trenes de Digitraffic" />
    {trenes.estado === 'vivo' && <>
      <table className="barras compacta" aria-label="Próximas salidas desde Helsinki Central"><tbody>{trenes.datos.departures.map(s => <tr key={`${s.train}-${s.scheduled}`}>
        <th scope="row">{s.train}</th><td className="valor ancho">{horaCorta(s.estimated || s.scheduled)}{s.track && <span className="tenue"> · vía {s.track}</span>}</td>
        <td className="valor ancho">{s.cancelled ? <span className="oculto">cancelado</span> : s.delay_minutes > 0 ? `+${numero(s.delay_minutes)} min` : 'a tiempo'}</td></tr>)}</tbody></table>
      <p className="lectura-texto tenue">Las próximas {numero(trenes.datos.departures.length)} salidas comerciales: {numero(trenes.datos.delayed_count)} con {numero(trenes.datos.delay_threshold_minutes)} minutos o más de retraso y {numero(trenes.datos.cancelled_count)} cancelada{trenes.datos.cancelled_count === 1 ? '' : 's'}. Hora de Helsinki. Incluye cercanías de HSL y trenes de larga distancia.</p>
    </>}
  </Pliego>
}

export const VISTAS_NUEVAS = { costos: Costos, empresas: Empresas, expansion: Expansion, oferta: Oferta, empleoNacionalidad: EmpleoNacionalidad, ahora: Ahora }
