import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { Mapa, MapaAreas, rampa } from './Mapa.jsx'
import { Placa, Pliego, Ref } from './pliegos.jsx'
import { numero, useAreas, usePoblacion } from './datos.js'

// Lo que el usuario eligió y se comparte entre pliegos (y queda en la URL): dos zonas y un sector.
export const Seleccion = createContext({ zonas: [], setZonas: () => {}, sector: 'J', setSector: () => {} })

const FUENTE = 'stat-fi-postal-areas-paavo'
const NOMBRE_MUNICIPIO = { '091': 'Helsinki', '049': 'Espoo', '092': 'Vantaa', '235': 'Kauniainen' }
const formatoPorcentaje = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const porcentaje = valor => `${formatoPorcentaje.format(valor)} %`
const euros = valor => `${numero(Math.round(valor))} €`

// Secciones TOL 2008 (etiquetas oficiales de la tabla PxWeb 12f5, traducidas).
export const SECTORES = {
  A: 'Agricultura, silvicultura y pesca', B: 'Minas y canteras', C: 'Industria manufacturera', D: 'Electricidad, gas y climatización',
  E: 'Agua, saneamiento y residuos', F: 'Construcción', G: 'Comercio y reparación de vehículos', H: 'Transporte y almacenamiento',
  I: 'Alojamiento y restauración', J: 'Información y comunicación', K: 'Finanzas y seguros', L: 'Actividades inmobiliarias',
  M: 'Actividades profesionales, científicas y técnicas', N: 'Servicios administrativos y de apoyo', O: 'Administración pública y defensa',
  P: 'Educación', Q: 'Salud y servicios sociales', R: 'Artes y entretenimiento', S: 'Otros servicios',
  T: 'Hogares como empleadores', U: 'Organismos extraterritoriales', X: 'Sector desconocido',
}

const sumar = (features, campo) => features.reduce((total, f) => total + (f.properties[campo] ?? 0), 0)
function ponderado(features, campo, peso) {
  let suma = 0, pesos = 0
  for (const { properties: p } of features) if (p[campo] != null && p[peso]) { suma += p[campo] * p[peso]; pesos += p[peso] }
  return pesos ? suma / pesos : null
}
function razon(features, parte, total) {
  const validas = features.filter(f => f.properties[parte] != null && f.properties[total] != null)
  const denominador = sumar(validas, total)
  return denominador ? (100 * sumar(validas, parte)) / denominador : null
}

function tasaDesempleo(features) {
  const validas = features.filter(f => f.properties.unemployed != null && f.properties.employed != null)
  const activos = sumar(validas, 'unemployed') + sumar(validas, 'employed')
  return activos ? (100 * sumar(validas, 'unemployed')) / activos : null
}

const METRICAS = {
  ingreso: { boton: 'Ingreso medio', etiqueta: 'ingreso disponible medio por residente adulto', unidad: '€ al año', valor: p => p.income_mean, formato: euros,
    referencia: fs => ponderado(fs, 'income_mean', 'adults'), metodo: 'Promedio metropolitano: cálculo propio, ponderado por residentes de 18 años o más, sobre las áreas con dato.' },
  mediana: { boton: 'Ingreso mediano', etiqueta: 'ingreso disponible mediano por residente adulto', unidad: '€ al año', valor: p => p.income_median, formato: euros,
    referencia: null, metodo: 'Las medianas de cada área no se pueden promediar: no hay valor metropolitano para esta métrica.' },
  hogar: { boton: 'Por hogar', etiqueta: 'ingreso disponible medio por hogar', unidad: '€ al año', valor: p => p.household_income_mean, formato: euros,
    referencia: fs => ponderado(fs, 'household_income_mean', 'households'), metodo: 'Promedio metropolitano: cálculo propio, ponderado por número de hogares.' },
  alquiler: { boton: 'Alquiler', etiqueta: 'de los hogares viven en alquiler', unidad: '%', valor: p => p.rented_share, formato: porcentaje,
    referencia: fs => razon(fs, 'rented_households', 'households'), metodo: 'Proporción metropolitana: cálculo propio, hogares en alquiler sobre hogares totales.' },
  educacion: { boton: 'Universitaria', etiqueta: 'de los adultos tiene un título universitario', unidad: '%', valor: p => p.higher_education_share, formato: porcentaje,
    referencia: fs => razon(fs, 'higher_education', 'adults'), metodo: 'Proporción metropolitana: cálculo propio, adultos con título universitario (grado o posgrado) sobre adultos de 18 años o más.' },
  desempleo: { boton: 'Desempleo', etiqueta: 'de la población activa está desempleada', unidad: '%', valor: p => p.unemployment_rate, formato: porcentaje,
    referencia: tasaDesempleo,
    metodo: 'Tasa metropolitana: cálculo propio, desempleados sobre ocupados más desempleados.' },
}

function useEleccion() {
  const { zonas, setZonas } = useContext(Seleccion)
  const elegir = useCallback(codigo => {
    if (!codigo) return
    setZonas(previas => previas.includes(codigo) ? previas.filter(z => z !== codigo) : [...previas, codigo].slice(-2))
  }, [setZonas])
  return [zonas, elegir, () => setZonas([])]
}

// Envoltorio común: el archivo de áreas con sus estados de carga y error.
function ConAreas({ libro, indice, pliego, children }) {
  const areas = useAreas()
  if (areas.cargando) return <Pliego libro={libro} indice={indice} titulo={pliego.titulo}
    figura={<Placa libro={libro} gris rotulo="Se imprime"><p className="placa-nota">Leyendo las 167 áreas postales del lago…</p></Placa>}><p className="cargando">Cargando Paavo…</p></Pliego>
  if (areas.error) return <Pliego libro={libro} indice={indice} titulo={pliego.titulo}
    figura={<Placa libro={libro} gris trama rotulo="Fe de erratas"><p className="placa-grande">No se pudo leer el archivo.</p></Placa>}><p className="errata">No se pudo leer postal_areas.geojson: {areas.error}. No se muestran cifras.</p></Pliego>
  return children(areas.datos)
}

function Leyenda({ escala, formato }) {
  return <div className="leyenda-rampa">
    <span className="leyenda-extremo">{formato(escala.minimo)}</span>
    <span className="leyenda-pasos">{escala.colores.map(color => <i key={color} style={{ background: color }} />)}</span>
    <span className="leyenda-extremo">{formato(escala.maximo)}</span>
    <span className="leyenda-trama"><i aria-hidden="true" />Dato suprimido o sin residentes</span>
  </div>
}

function FichaZona({ letra, area, metrica, referencia, onQuitar }) {
  if (!area) return <div className="zona vacia"><span className="zona-letra">{letra}</span><p>Toca un área en el mapa para fijarla aquí.</p></div>
  const p = area.properties
  const valor = metrica.valor(p)
  const diferencia = valor != null && referencia ? ((valor - referencia) / referencia) * 100 : null
  return <div className="zona">
    <span className="zona-letra">{letra}</span>
    <button type="button" className="zona-quitar" onClick={onQuitar} aria-label={`Quitar la zona ${letra}`}>Quitar</button>
    <p className="zona-nombre">{p.name_fi}</p>
    <p className="zona-codigo">{p.postal_code} · {NOMBRE_MUNICIPIO[p.municipality_code]}</p>
    <p className="zona-valor">{valor == null ? 'Dato suprimido' : metrica.formato(valor)}</p>
    {diferencia != null && <p className="zona-diferencia">{diferencia >= 0 ? '+' : '−'}{formatoPorcentaje.format(Math.abs(diferencia))} % frente al área metropolitana</p>}
  </div>
}

function Ranking({ features, metrica, onElegir, zonas }) {
  const con = features.filter(f => metrica.valor(f.properties) != null).sort((a, b) => metrica.valor(b.properties) - metrica.valor(a.properties))
  const filas = [['Más altas', con.slice(0, 5)], ['Más bajas', con.slice(-5).reverse()]]
  return <div className="ranking">{filas.map(([titulo, lista]) => <table key={titulo} className="tabla-ranking">
    <caption>{titulo}</caption>
    <tbody>{lista.map(f => <tr key={f.id} className={zonas.includes(f.id) ? 'elegida' : ''}>
      <th scope="row"><button type="button" className="enlace" onClick={() => onElegir(f.id)}>{f.properties.name_fi}</button><small>{f.id} · {NOMBRE_MUNICIPIO[f.properties.municipality_code]}</small></th>
      <td>{metrica.formato(metrica.valor(f.properties))}</td>
    </tr>)}</tbody>
  </table>)}</div>
}

// Un pliego de mapa por áreas postales: métrica, 2D/3D, comparación A·B y ranking.
function PliegoMapa({ libro, indice, pliego, metricas, aviso, extra }) {
  const [clave, setClave] = useState(metricas[0])
  const [tresD, setTresD] = useState(false)
  const [resaltado, setResaltado] = useState(null)
  const [zonas, elegir] = useEleccion()
  const metrica = METRICAS[clave]
  return <ConAreas libro={libro} indice={indice} pliego={pliego}>{datos => {
    const features = datos.features
    const escala = rampa(features.map(f => metrica.valor(f.properties)), `--${libro.color}`, `--${libro.color}-fuerte`)
    const referencia = metrica.referencia?.(features) ?? null
    const elegidas = zonas.map(codigo => features.find(f => f.id === codigo))
    const encima = features.find(f => f.id === resaltado)
    const suprimidas = features.filter(f => metrica.valor(f.properties) == null).length
    const notas = [{ fuente: FUENTE }, { detalle: metrica.metodo }]
    return <Pliego libro={libro} indice={indice} titulo={pliego.titulo} notas={notas}
      figura={<>
        <div className="controles-mapa">
          {metricas.length > 1 && <div className="segmentado" role="group" aria-label="Métrica del mapa">{metricas.map(k =>
            <button type="button" key={k} aria-pressed={k === clave} onClick={() => setClave(k)}>{METRICAS[k].boton}</button>)}</div>}
          <label className="interruptor"><input type="checkbox" checked={tresD} onChange={evento => setTresD(evento.target.checked)} /><span>Ver en 3D</span></label>
        </div>
        <MapaAreas areas={datos} municipios={null} valor={metrica.valor} escala={escala} tresD={tresD} seleccion={zonas} resaltado={resaltado}
          onElegir={elegir} onResaltado={setResaltado} etiqueta={`Mapa de áreas postales: ${metrica.etiqueta}`} />
        <Leyenda escala={escala} formato={metrica.formato} />
        <p className="estado-vivo" aria-live="polite">{encima ? `${encima.properties.name_fi} (${encima.id}): ${metrica.valor(encima.properties) == null ? 'dato suprimido' : metrica.formato(metrica.valor(encima.properties))}` : 'Pasa el cursor por un área; tócala para compararla. En 3D, la altura es la misma métrica que el color.'}</p>
      </>}>
      {referencia != null && <>
        <p className="cifra-grande">{metrica.formato(referencia)}</p>
        <p className="cifra-texto">{metrica.etiqueta} en el área metropolitana, 2024<Ref n={1} /><Ref n={2} /></p>
      </>}
      {referencia == null && <p className="entrada">{metrica.etiqueta[0].toUpperCase() + metrica.etiqueta.slice(1)} por área postal, 2024<Ref n={1} />. {metrica.metodo}<Ref n={2} /></p>}
      {aviso && <p className="aviso"><b>Ojo:</b> {aviso}</p>}
      <div className="comparacion">
        {['A', 'B'].map((letra, i) => <FichaZona key={letra} letra={letra} area={elegidas[i]} metrica={metrica} referencia={referencia} onQuitar={() => elegir(zonas[i])} />)}
      </div>
      <Ranking features={features} metrica={metrica} onElegir={elegir} zonas={zonas} />
      {suprimidas > 0 && <p className="lectura-texto tenue">{numero(suprimidas)} de {numero(features.length)} áreas no tienen dato para esta métrica: Statistics Finland lo suprime por baja población o el área no tiene residentes. Se dibujan con trama.</p>}
      {extra}
    </Pliego>
  }}</ConAreas>
}

export const Ingreso = props => <PliegoMapa {...props} metricas={['ingreso', 'mediana', 'hogar']}
  aviso="es ingreso disponible de quienes viven en cada zona (después de impuestos y con pensiones y transferencias), no el salario de un puesto." />
export const Educacion = props => <PliegoMapa {...props} metricas={['educacion']} />
export const Desempleo = props => <PliegoMapa {...props} metricas={['desempleo']}
  aviso="la tasa se mide donde vive la persona, no donde trabaja, y no distingue por origen ni por lengua." />

// Enjambre: las 167 áreas en una línea, de menor a mayor ingreso.
export function Distribucion({ libro, indice, pliego }) {
  const [zonas, elegir] = useEleccion()
  const [encima, setEncima] = useState(null)
  const metrica = METRICAS.ingreso
  return <ConAreas libro={libro} indice={indice} pliego={pliego}>{datos => {
    const con = datos.features.filter(f => metrica.valor(f.properties) != null).sort((a, b) => metrica.valor(a.properties) - metrica.valor(b.properties))
    const min = metrica.valor(con[0].properties), max = metrica.valor(con.at(-1).properties)
    const x = v => 30 + ((v - min) / (max - min)) * 540
    const pilas = new Map()
    const puntos = con.map(f => {
      const px = x(metrica.valor(f.properties)), columna = Math.round(px / 9)
      const altura = pilas.get(columna) || 0
      pilas.set(columna, altura + 1)
      return { f, px, py: 200 - altura * 9 }
    })
    const referencia = metrica.referencia(datos.features)
    const mediana = metrica.valor(con[Math.floor(con.length / 2)].properties)
    const posicion = codigo => { const i = con.findIndex(f => f.id === codigo); return i < 0 ? null : Math.round((100 * i) / (con.length - 1)) }
    const actual = puntos.find(p => p.f.id === encima)
    return <Pliego libro={libro} indice={indice} titulo={pliego.titulo}
      notas={[{ fuente: FUENTE }, { detalle: `Cálculo propio sobre postal_areas.geojson: ${numero(con.length)} áreas con dato, ordenadas por ingreso medio.` }, { detalle: METRICAS.ingreso.metodo }]}
      figura={<div className="grafica">
        <svg viewBox="0 0 600 260" className="enjambre" role="img" aria-label={`Ingreso medio de ${con.length} áreas postales, de ${euros(min)} a ${euros(max)}`}>
          <line x1={x(referencia)} x2={x(referencia)} y1="20" y2="210" className="linea-referencia" />
          <text x={x(referencia)} y="14" className="texto-referencia" textAnchor="middle">promedio metropolitano</text>
          {puntos.map(({ f, px, py }) => {
            const letra = zonas.indexOf(f.id)
            return <circle key={f.id} cx={px} cy={py} r={letra >= 0 ? 7 : 4.2} className={`punto-area ${letra >= 0 ? 'elegido' : ''} ${encima === f.id ? 'encima' : ''}`}
              onMouseEnter={() => setEncima(f.id)} onMouseLeave={() => setEncima(null)} onClick={() => elegir(f.id)}>
              <title>{f.properties.name_fi} ({f.id}): {euros(metrica.valor(f.properties))}</title>
            </circle>
          })}
          <line x1="30" x2="570" y1="212" y2="212" className="eje" />
          <text x="30" y="234" className="texto-eje">{euros(min)}</text>
          <text x="570" y="234" className="texto-eje" textAnchor="end">{euros(max)}</text>
        </svg>
        <p className="estado-vivo" aria-live="polite">{actual ? `${actual.f.properties.name_fi} (${actual.f.id}): ${euros(metrica.valor(actual.f.properties))}` : 'Cada punto es un área postal. Toca uno para fijarlo como zona A o B.'}</p>
      </div>}>
      <p className="entrada">La mitad de las áreas tiene un ingreso medio por adulto por debajo de <b>{euros(mediana)}</b><Ref n={2} />. El promedio metropolitano, ponderado por adultos, es {euros(referencia)}<Ref n={3} />.</p>
      <ul className="limites">{zonas.length ? zonas.map((codigo, i) => {
        const f = datos.features.find(item => item.id === codigo)
        const v = f && metrica.valor(f.properties)
        return <li key={codigo}><b>Zona {'AB'[i]} · {f?.properties.name_fi}</b><span>{v == null ? 'Sin dato de ingreso: suprimido o sin residentes.' : `${euros(v)}: más alto que el ${posicion(codigo)} % de las áreas con dato.`}</span></li>
      }) : <li><b>Todavía no hay zonas elegidas</b><span>Elige dos zonas aquí o en el mapa del pliego anterior: se recuerdan entre pliegos.</span></li>}</ul>
    </Pliego>
  }}</ConAreas>
}

// Dispersión: alquiler frente a ingreso.
export function Alquiler({ libro, indice, pliego }) {
  const [zonas, elegir] = useEleccion()
  const [encima, setEncima] = useState(null)
  return <ConAreas libro={libro} indice={indice} pliego={pliego}>{datos => {
    const con = datos.features.filter(f => f.properties.rented_share != null && f.properties.income_mean != null)
    const ingresos = con.map(f => f.properties.income_mean)
    const yMin = Math.min(...ingresos), yMax = Math.max(...ingresos)
    const x = v => 50 + (v / 100) * 520, y = v => 220 - ((v - yMin) / (yMax - yMin)) * 190
    const n = con.length
    const mx = con.reduce((s, f) => s + f.properties.rented_share, 0) / n, my = ingresos.reduce((s, v) => s + v, 0) / n
    let sxy = 0, sxx = 0, syy = 0
    for (const f of con) { const dx = f.properties.rented_share - mx, dy = f.properties.income_mean - my; sxy += dx * dy; sxx += dx * dx; syy += dy * dy }
    const r = sxy / Math.sqrt(sxx * syy)
    const actual = con.find(f => f.id === encima)
    return <Pliego libro={libro} indice={indice} titulo={pliego.titulo}
      notas={[{ fuente: FUENTE }, { detalle: `Coeficiente de correlación de Pearson: cálculo propio sobre las ${numero(n)} áreas con ambos datos.` }]}
      figura={<div className="grafica">
        <svg viewBox="0 0 600 270" className="dispersion" role="img" aria-label="Áreas postales según el porcentaje de hogares en alquiler y el ingreso medio de sus residentes">
          {[0, 25, 50, 75, 100].map(t => <g key={t}><line x1={x(t)} x2={x(t)} y1="25" y2="222" className="rejilla" /><text x={x(t)} y="242" className="texto-eje" textAnchor="middle">{t} %</text></g>)}
          <text x="310" y="264" className="texto-eje" textAnchor="middle">hogares en alquiler</text>
          <text x="46" y="30" className="texto-eje" textAnchor="end">{euros(yMax)}</text>
          <text x="46" y="222" className="texto-eje" textAnchor="end">{euros(yMin)}</text>
          {con.map(f => {
            const letra = zonas.indexOf(f.id)
            return <circle key={f.id} cx={x(f.properties.rented_share)} cy={y(f.properties.income_mean)} r={letra >= 0 ? 7 : 4.2}
              className={`punto-area ${letra >= 0 ? 'elegido' : ''} ${encima === f.id ? 'encima' : ''}`}
              onMouseEnter={() => setEncima(f.id)} onMouseLeave={() => setEncima(null)} onClick={() => elegir(f.id)}>
              <title>{f.properties.name_fi} ({f.id}): {porcentaje(f.properties.rented_share)} en alquiler, {euros(f.properties.income_mean)}</title>
            </circle>
          })}
        </svg>
        <p className="estado-vivo" aria-live="polite">{actual ? `${actual.properties.name_fi}: ${porcentaje(actual.properties.rented_share)} de hogares en alquiler, ${euros(actual.properties.income_mean)} de ingreso medio` : 'Cada punto es un área postal. A la derecha se alquila más; arriba se gana más.'}</p>
      </div>}>
      <p className="entrada">En las {numero(n)} áreas con ambos datos, el coeficiente de correlación entre alquiler e ingreso es <b>r = {r.toLocaleString('es-ES', { maximumFractionDigits: 2 })}</b><Ref n={2} />: {r < -0.3 ? 'donde más se alquila, el ingreso medio tiende a ser menor.' : r > 0.3 ? 'donde más se alquila, el ingreso medio tiende a ser mayor.' : 'no hay una relación clara entre las dos cosas.'} Es una asociación entre zonas, no dice nada de cada hogar<Ref n={1} />.</p>
      <p className="lectura-texto tenue">Paavo dice cuántos hogares alquilan, no cuánto cuesta el alquiler. El precio sigue siendo un hueco (último pliego de este libro).</p>
      <div className="comparacion">{['A', 'B'].map((letra, i) => {
        const f = datos.features.find(item => item.id === zonas[i])
        return f ? <div className="zona" key={letra}><span className="zona-letra">{letra}</span><p className="zona-nombre">{f.properties.name_fi}</p><p className="zona-codigo">{f.id}</p>
          <p className="zona-valor">{f.properties.rented_share == null ? 'Sin dato' : porcentaje(f.properties.rented_share)}</p><p className="zona-diferencia">de los hogares alquila</p></div>
          : <div className="zona vacia" key={letra}><span className="zona-letra">{letra}</span><p>Toca un punto para fijarlo.</p></div>
      })}</div>
    </Pliego>
  }}</ConAreas>
}

// Empleo por sector: mapa de empleos del sector elegido por área postal.
export function EmpleoZonas({ libro, indice, pliego }) {
  const { sector, setSector } = useContext(Seleccion)
  const [tresD, setTresD] = useState(true)
  const [resaltado, setResaltado] = useState(null)
  const [zonas, elegir] = useEleccion()
  const valor = useCallback(p => p.jobs_by_sector?.[sector] ?? null, [sector])
  return <ConAreas libro={libro} indice={indice} pliego={pliego}>{datos => {
    const features = datos.features
    const formato = v => `${numero(v)} empleos`
    const escala = rampa(features.map(f => valor(f.properties)), `--${libro.color}`, `--${libro.color}-fuerte`)
    const total = features.reduce((s, f) => s + (valor(f.properties) ?? 0), 0)
    const totalTodos = features.reduce((s, f) => s + (f.properties.jobs_total ?? 0), 0)
    const top = features.filter(f => valor(f.properties)).sort((a, b) => valor(b.properties) - valor(a.properties)).slice(0, 6)
    const encima = features.find(f => f.id === resaltado)
    return <Pliego libro={libro} indice={indice} titulo={pliego.titulo}
      notas={[{ fuente: FUENTE }, { detalle: 'Participación del sector: cálculo propio, empleos del sector sobre empleos totales de las 167 áreas.' },
        { detalle: 'Se usa Paavo por área postal y no la rejilla de 250 m de HSY (hsy-tyopaikkaruudukko-2024): Paavo ya viene agregado y protegido, y la rejilla puede señalar a un solo empleador.' }]}
      figura={<>
        <div className="controles-mapa">
          <label className="selector">Sector<select value={sector} onChange={evento => setSector(evento.target.value)}>
            {Object.entries(SECTORES).map(([letra, nombre]) => <option key={letra} value={letra}>{letra} · {nombre}</option>)}</select></label>
          <label className="interruptor"><input type="checkbox" checked={tresD} onChange={evento => setTresD(evento.target.checked)} /><span>Ver en 3D</span></label>
        </div>
        <MapaAreas areas={datos} valor={valor} escala={escala} tresD={tresD} seleccion={zonas} resaltado={resaltado} onElegir={elegir} onResaltado={setResaltado}
          etiqueta={`Empleos de ${SECTORES[sector]} por área postal`} />
        <Leyenda escala={escala} formato={formato} />
        <p className="estado-vivo" aria-live="polite">{encima ? `${encima.properties.name_fi} (${encima.id}): ${valor(encima.properties) == null ? 'dato suprimido' : formato(valor(encima.properties))}` : 'Los empleos se cuentan donde está el lugar de trabajo, no donde vive la persona.'}</p>
      </>}>
      <p className="cifra-grande">{numero(total)}</p>
      <p className="cifra-texto">empleos en {SECTORES[sector].toLowerCase()} en los cuatro municipios, 2024<Ref n={1} />: el {porcentaje((100 * total) / totalTodos)} del total<Ref n={2} /></p>
      <table className="tabla-ranking ancha"><caption>Dónde se concentran<Ref n={3} /></caption><tbody>{top.map(f => <tr key={f.id} className={zonas.includes(f.id) ? 'elegida' : ''}>
        <th scope="row"><button type="button" className="enlace" onClick={() => elegir(f.id)}>{f.properties.name_fi}</button><small>{f.id} · {NOMBRE_MUNICIPIO[f.properties.municipality_code]}</small></th>
        <td>{numero(valor(f.properties))}</td>
      </tr>)}</tbody></table>
      <p className="lectura-texto tenue">Esto dice dónde hay puestos de un sector, no cuántas vacantes hay ni qué piden. Las vacantes siguen siendo un hueco (último pliego de este libro).</p>
    </Pliego>
  }}</ConAreas>
}

// Peso de cada sector en el área metropolitana; tocar una barra cambia el sector del mapa.
export function Sectores({ libro, indice, pliego }) {
  const { sector, setSector } = useContext(Seleccion)
  return <ConAreas libro={libro} indice={indice} pliego={pliego}>{datos => {
    const totales = Object.keys(SECTORES).map(letra => [letra, datos.features.reduce((s, f) => s + (f.properties.jobs_by_sector?.[letra] ?? 0), 0)]).sort((a, b) => b[1] - a[1])
    const total = totales.reduce((s, [, v]) => s + v, 0)
    const maximo = totales[0][1]
    return <Pliego libro={libro} indice={indice} titulo={pliego.titulo} ancho
      notas={[{ fuente: FUENTE }, { detalle: 'Suma propia de los empleos por sección TOL 2008 de las 167 áreas postales.' }]}>
      <p className="entrada">{numero(total)} empleos en los cuatro municipios en 2024<Ref n={1} />, por sector<Ref n={2} />. Toca un sector para verlo en el mapa del pliego anterior.</p>
      <table className="barras sectores"><tbody>{totales.map(([letra, valor]) => <tr key={letra} className={letra === sector ? 'resaltado' : ''}>
        <th scope="row"><button type="button" className="enlace" aria-pressed={letra === sector} onClick={() => setSector(letra)}>{letra} · {SECTORES[letra]}</button></th>
        <td className="barra"><span style={{ '--ancho': `${(valor / maximo) * 100}%` }} /></td>
        <td className="valor">{numero(valor)}</td>
        <td className="valor tenue">{porcentaje((100 * valor) / total)}</td>
      </tr>)}</tbody></table>
    </Pliego>
  }}</ConAreas>
}

// Población oficial por municipio (StatFin 11ra).
export function Poblacion({ libro, indice, pliego, lago }) {
  const poblacion = usePoblacion()
  const [resaltado, setResaltado] = useState(null)
  const valores = poblacion.datos?.population_by_municipality
  const orden = valores ? Object.entries(valores).sort((a, b) => b[1] - a[1]) : []
  const total = orden.reduce((s, [, v]) => s + v, 0)
  return <Pliego libro={libro} indice={indice} titulo={pliego.titulo}
    notas={[{ fuente: 'statfin-population-11ra' }, { detalle: 'Total y participación: suma propia de los cuatro municipios.' }]}
    figura={lago.municipios ? <Mapa municipios={lago.municipios} resaltado={resaltado} onResaltado={setResaltado} etiqueta="Mapa de los cuatro municipios" />
      : <Placa libro={libro} gris rotulo="Sin límites municipales"><p className="placa-grande">No se pudieron leer los límites del lago.</p></Placa>}>
    {poblacion.cargando ? <p className="cargando">Leyendo la población del lago…</p>
      : poblacion.error ? <p className="errata">No se pudo leer population.json: {poblacion.error}. No se muestran cifras.</p>
      : <>
        <p className="cifra-grande">{numero(total)}</p>
        <p className="cifra-texto">habitantes en los cuatro municipios al 31 de diciembre de 2025<Ref n={1} /><Ref n={2} /></p>
        <table className="barras"><tbody>{orden.map(([codigo, valor]) => <tr key={codigo} className={resaltado === codigo ? 'resaltado' : ''} onMouseEnter={() => setResaltado(codigo)} onMouseLeave={() => setResaltado(null)}>
          <th scope="row">{NOMBRE_MUNICIPIO[codigo]}</th>
          <td className="barra"><span style={{ '--ancho': `${(valor / orden[0][1]) * 100}%` }} /></td>
          <td className="valor">{numero(valor)}</td>
          <td className="valor tenue">{porcentaje((100 * valor) / total)}</td>
        </tr>)}</tbody></table>
        <p className="lectura-texto tenue">Es la cifra oficial para calcular tasas. Las áreas postales de Paavo son de 2024 y no suman exactamente estos totales.</p>
      </>}
  </Pliego>
}

export const VISTAS_AREAS = { ingreso: Ingreso, distribucion: Distribucion, alquiler: Alquiler, educacion: Educacion, desempleo: Desempleo, empleoZonas: EmpleoZonas, sectores: Sectores, poblacion: Poblacion }
