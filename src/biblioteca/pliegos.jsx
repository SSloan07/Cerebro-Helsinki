import { createContext, useContext, useMemo, useState } from 'react'
import { Mapa } from './Mapa.jsx'
import { Cerrar, Icono } from './iconos.jsx'
import { CATALOGO, ETIQUETA_ESTADO, fecha, ficha, numero, useParadas } from './datos.js'

// Notas al pie: el superíndice y su línea en el pie se iluminan juntos; la línea abre la ficha.
export const Notas = createContext({ activa: null, setActiva: () => {}, abrir: () => {}, registro: [] })

export function Ref({ n }) {
  const { activa, setActiva } = useContext(Notas)
  return <sup className={`ref ${activa === n ? 'activa' : ''}`} onMouseEnter={() => setActiva(n)} onMouseLeave={() => setActiva(null)}><a href={`#nota-${n}`} aria-label={`Nota ${n}`}>{n}</a></sup>
}

function lineaDeFuente(datos) {
  if (!datos) return 'Fuente sin ficha en el catálogo.'
  const prueba = datos.probado ? `Probado el ${fecha(datos.probado)}.` : datos.revisionCatalogo ? `Sin prueba con fecha propia; catálogo revisado el ${fecha(datos.revisionCatalogo)}.` : 'Sin fecha de prueba.'
  return `${datos.productor} · ${datos.nombre}. Vigencia: ${(datos.vigencia || 'sin declarar').replace(/\.\s*$/, '')}. ${prueba} ${datos.licencia || 'Licencia sin declarar'}.`
}

function PieDeNotas({ notas }) {
  const { activa, setActiva, abrir, registro } = useContext(Notas)
  if (!notas?.length) return null
  return <ol className="notas">{notas.map((nota, indice) => {
    const n = indice + 1
    return <li key={n} id={`nota-${n}`} className={activa === n ? 'activa' : ''} onMouseEnter={() => setActiva(n)} onMouseLeave={() => setActiva(null)}>
      <span className="notas-n">{n}</span>
      <span>{nota.detalle ? `${nota.detalle} ` : ''}{nota.fuente ? lineaDeFuente(ficha(nota.fuente, registro)) : null}
        {nota.fuente && <> <button type="button" className="enlace" onClick={() => abrir(nota.fuente)}>Ver ficha</button></>}</span>
    </li>
  })}</ol>
}

export function Pliego({ libro, indice, figura, titulo, children, notas, ancho = false }) {
  const folio = indice * 2 + 1
  if (ancho) return <article className="pliego pliego-ancho">
    <section className="pagina pagina-lectura">
      <header className="cabeza"><span>{libro.titulo} · {indice + 1} de {libro.pliegos.length}</span><span>{folio}</span></header>
      <h2 className="titulo-pliego">{titulo}</h2>
      <div className="cuerpo-lectura">{children}</div>
      <PieDeNotas notas={notas} />
    </section>
  </article>
  return <article className="pliego">
    <section className="pagina pagina-figura">
      <header className="cabeza"><span>{libro.titulo}</span><span>{folio}</span></header>
      <div className="figura">{figura}</div>
    </section>
    <section className="pagina pagina-lectura">
      <header className="cabeza"><span>{indice + 1} de {libro.pliegos.length}</span><span>{folio + 1}</span></header>
      <h2 className="titulo-pliego">{titulo}</h2>
      <div className="cuerpo-lectura">{children}</div>
      <PieDeNotas notas={notas} />
    </section>
  </article>
}

export function Placa({ libro, rotulo, gris = false, trama = false, children }) {
  return <div className={`placa ${gris ? 'gris' : ''} ${trama ? 'trama' : ''}`} data-color={libro.color}>
    <div className="placa-contenido">{children}</div>
    <span className="placa-rotulo">{rotulo}</span>
  </div>
}

// Esquemas en gris de la figura que vendrá: forma sin cifras.
const ESQUEMAS = {
  mapa3d: <g>{[[60, 150, 46, 60], [110, 128, 40, 90], [154, 150, 50, 44], [210, 132, 44, 70], [262, 152, 52, 34], [92, 196, 50, 30], [150, 200, 56, 52], [212, 196, 48, 22]].map(([x, y, w, h], i) => <g key={i}><path d={`M${x} ${y}h${w}l14 -10h-${w}z`} className="es-claro" /><rect x={x} y={y} width={w} height={h} className="es-medio" /><path d={`M${x + w} ${y}l14 -10v${h}l-14 10z`} className="es-oscuro" /></g>)}</g>,
  enjambre: <g>{Array.from({ length: 60 }, (_, i) => <circle key={i} cx={30 + (i * 5.1) % 300} cy={150 + ((i * 37) % 5 - 2) * 9} r="4.5" className="es-medio" />)}<path d="M24 196h312" className="es-linea" /></g>,
  dispersion: <g><path d="M40 40v200h280" className="es-linea" />{Array.from({ length: 34 }, (_, i) => <circle key={i} cx={60 + (i * 53) % 250} cy={220 - ((i * 29) % 150) - (i % 3) * 8} r="5" className="es-medio" />)}</g>,
  barras: <g>{[250, 200, 170, 120, 90, 60].map((w, i) => <rect key={i} x="40" y={50 + i * 34} width={w} height="16" className="es-medio" />)}</g>,
  columnas: <g>{[[70, 70], [100, 120], [130, 60], [160, 150], [190, 90], [220, 40], [250, 110], [280, 70]].map(([x, h], i) => <g key={i}><rect x={x} y={220 - h} width="16" height={h} className="es-medio" /><path d={`M${x + 16} ${220 - h}l8 -6v${h}l-8 6z`} className="es-oscuro" /></g>)}<path d="M50 222h270" className="es-linea" /></g>,
  cortina: <g><rect x="40" y="40" width="140" height="200" className="es-claro" /><rect x="180" y="40" width="140" height="200" className="es-medio" /><path d="M180 30v220" className="es-linea grueso" /><circle cx="180" cy="140" r="12" className="es-oscuro" /></g>,
}

function Esquema({ tipo }) {
  return <svg className="esquema" viewBox="0 0 360 280" aria-hidden="true">{ESQUEMAS[tipo]}</svg>
}

function Semaforo({ color }) {
  const texto = { verde: 'Verde: se puede usar', amarillo: 'Amarillo: se usa con una condición', rojo: 'Rojo: no se publica tal cual', sin: 'Sin semáforo' }[color]
  return <span className={`semaforo ${color}`}><i aria-hidden="true" />{texto}</span>
}

export function Pendiente({ libro, indice, pliego }) {
  const { registro } = useContext(Notas)
  const fuentes = pliego.fuentes.map(id => ficha(id, registro)).filter(Boolean)
  return <Pliego libro={libro} indice={indice} titulo={pliego.titulo} notas={pliego.fuentes.map(fuente => ({ fuente }))}
    figura={<Placa libro={libro} gris rotulo="Pendiente de ingesta"><Esquema tipo={pliego.figura} /><p className="placa-nota">Así se verá cuando el dato esté en el lago.</p></Placa>}>
    <p className="entrada">{pliego.promesa}</p>
    {pliego.aviso && <p className="aviso"><b>Ojo:</b> {pliego.aviso}</p>}
    {fuentes.map((fuente, i) => <dl className="ficha-breve" key={fuente.id}>
      <dt>Fuente</dt><dd>{fuente.productor} · {fuente.nombre}<Ref n={i + 1} /></dd>
      <dt>Estado</dt><dd>{ETIQUETA_ESTADO[fuente.estado] || fuente.estado} <Semaforo color={fuente.semaforo} /></dd>
      <dt>Prueba</dt><dd>{fuente.probado ? `${fecha(fuente.probado)} · ${fuente.resultado || 'respondió'}` : `Sin prueba con fecha propia (catálogo revisado el ${fecha(fuente.revisionCatalogo)})`}</dd>
      {fuente.personas && <><dt>Personas</dt><dd>{fuente.personas}</dd></>}
    </dl>)}
    <h3 className="subtitulo">Qué falta para llenar esta página</h3>
    <ol className="pasos">{pliego.falta.map(paso => <li key={paso}>{paso}</li>)}</ol>
  </Pliego>
}

export function Hueco({ libro, indice, pliego }) {
  const { registro } = useContext(Notas)
  const conFicha = pliego.candidatas.filter(candidata => candidata.id)
  return <Pliego libro={libro} indice={indice} titulo={pliego.titulo} notas={conFicha.map(candidata => ({ fuente: candidata.id }))}
    figura={<Placa libro={libro} gris trama rotulo="Hueco declarado"><p className="placa-grande">Esta página se deja en blanco a propósito.</p></Placa>}>
    <p className="entrada">{pliego.porque}</p>
    <ul className="candidatas">{pliego.candidatas.map(candidata => {
      const datos = candidata.id ? ficha(candidata.id, registro) : null
      const n = candidata.id ? conFicha.indexOf(candidata) + 1 : null
      return <li key={candidata.id || candidata.nombre}>
        <span className="candidata-nombre">{datos?.nombre || candidata.nombre}{n && <Ref n={n} />}</span>
        <span className={`insignia ${datos ? datos.estado : 'sin-sondear'}`}>{datos ? ETIQUETA_ESTADO[datos.estado] || datos.estado : 'Sin sondear'}</span>
        <span className="candidata-nota">{candidata.nota}</span>
      </li>
    })}</ul>
  </Pliego>
}

const ORDEN_MUNICIPIOS = ['091', '049', '092', '235']

export function Municipios({ libro, indice, pliego, lago }) {
  const [seleccion, setSeleccion] = useState('091')
  const [resaltado, setResaltado] = useState(null)
  const municipios = lago.municipios?.features || []
  const ordenados = ORDEN_MUNICIPIOS.map(codigo => municipios.find(f => f.properties.municipality_code === codigo)).filter(Boolean)
  const elegido = ordenados.find(f => f.properties.municipality_code === seleccion)?.properties
  return <Pliego libro={libro} indice={indice} titulo={pliego.titulo} notas={[{ fuente: 'fi-municipal-boundaries' }]}
    figura={lago.municipios
      ? <Mapa municipios={lago.municipios} seleccion={seleccion} resaltado={resaltado} onSeleccion={setSeleccion} onResaltado={setResaltado} etiqueta="Mapa de los cuatro municipios" />
      : <Placa libro={libro} gris rotulo="Sin límites municipales"><p className="placa-grande">No se pudieron leer los límites del lago.</p></Placa>}>
    <ul className="lista-municipios">{ordenados.map(({ properties: m }) => <li key={m.municipality_code}>
      <button type="button" className={`${seleccion === m.municipality_code ? 'elegido' : ''} ${resaltado === m.municipality_code ? 'resaltado' : ''}`}
        onClick={() => setSeleccion(m.municipality_code)} onMouseEnter={() => setResaltado(m.municipality_code)} onMouseLeave={() => setResaltado(null)} aria-pressed={seleccion === m.municipality_code}>
        <span className="codigo">{m.municipality_code}</span><span className="nombre-grande">{m.name}</span><span className="nombre-sv">{m.name_sv}</span>
      </button>
    </li>)}</ul>
    <p className="lectura-texto">El proyecto cubre estos {numero(ordenados.length)} municipios del área metropolitana<Ref n={1} />. {elegido && <>Elegiste <b>{elegido.name}</b>, código oficial {elegido.municipality_code}: todos los cruces de datos se hacen por ese código, nunca por el nombre.</>}</p>
    <p className="lectura-texto tenue">Los límites están generalizados a escala 1:1.000.000. Sirven para comparar municipios, no barrios.</p>
  </Pliego>
}

export function Paradas({ libro, indice, pliego, lago }) {
  const paradas = useParadas()
  const [resaltado, setResaltado] = useState(null)
  const [vivos, setVivos] = useState(false)
  const [estadoVivos, setEstadoVivos] = useState(null)
  const conteos = lago.reporte?.counts
  const nombres = Object.fromEntries((lago.municipios?.features || []).map(f => [f.properties.municipality_code, f.properties.name]))
  const porMunicipio = ORDEN_MUNICIPIOS.map(codigo => [codigo, conteos?.stops_by_municipality?.[codigo]]).filter(([, valor]) => valor != null)
  const maximo = Math.max(...porMunicipio.map(([, valor]) => valor), 1)
  const zonas = useMemo(() => {
    const cuenta = {}
    for (const f of paradas.datos?.features || []) cuenta[f.properties.zone_id || 'sin zona'] = (cuenta[f.properties.zone_id || 'sin zona'] || 0) + 1
    return Object.entries(cuenta).sort(([a], [b]) => a.localeCompare(b))
  }, [paradas.datos])
  const maxZona = Math.max(...zonas.map(([, valor]) => valor), 1)
  const fin = conteos?.service_period_end
  const dias = fin ? Math.ceil((new Date(`${fin.slice(0, 4)}-${fin.slice(4, 6)}-${fin.slice(6, 8)}T23:59:59Z`) - Date.now()) / 86400000) : null

  const notas = [{ fuente: 'hsl-gtfs-stops' }, { detalle: 'Cálculo propio sobre el mismo archivo de paradas del lago, por el campo zone_id.', fuente: 'hsl-gtfs-stops' }]
  if (vivos) notas.push({ fuente: 'hsl-gtfs-realtime-vehicles' })

  return <Pliego libro={libro} indice={indice} titulo={pliego.titulo} notas={notas}
    figura={<>
      {lago.municipios && <Mapa municipios={lago.municipios} color="--azul" colorFuerte="--azul" resaltado={resaltado} onResaltado={setResaltado} paradas={paradas.datos} vivos={vivos} onVivos={setEstadoVivos} etiqueta="Mapa de paradas HSL por zona tarifaria" />}
      <div className="leyenda">
        {['A', 'B', 'C', 'D'].map(zona => <span key={zona}><i className={`punto zona-${zona.toLowerCase()}`} />Zona {zona}</span>)}
        <label className="interruptor"><input type="checkbox" checked={vivos} onChange={evento => setVivos(evento.target.checked)} /><span>Vehículos en vivo</span></label>
      </div>
      {vivos && <p className="estado-vivo" role="status">{!estadoVivos || estadoVivos.estado === 'consultando' ? 'Consultando el feed en vivo de HSL…' : estadoVivos.estado === 'vivo' ? <>{numero(estadoVivos.total)} vehículos reportados por HSL ahora mismo<Ref n={3} />.</> : `El feed en vivo no respondió (${estadoVivos.motivo}). No se muestran posiciones programadas como si fueran en vivo.`}</p>}
    </>}>
    {conteos ? <>
      <p className="cifra-grande">{numero(conteos.mapped_stop_count)}</p>
      <p className="cifra-texto">puntos de abordaje HSL dentro de los cuatro municipios<Ref n={1} /></p>
      {dias != null && dias <= 30 && <p className={`sello ${dias < 0 ? 'vencido' : ''}`}>{dias < 0 ? `Vigencia vencida el ${fecha(fin)}` : `El horario vence el ${fecha(fin)}, en ${dias} días`}</p>}
      <table className="barras" aria-label="Paradas por municipio">
        <tbody>{porMunicipio.map(([codigo, valor]) => <tr key={codigo} className={resaltado === codigo ? 'resaltado' : ''} onMouseEnter={() => setResaltado(codigo)} onMouseLeave={() => setResaltado(null)}>
          <th scope="row">{nombres[codigo] || codigo}</th>
          <td className="barra"><span style={{ '--ancho': `${(valor / maximo) * 100}%` }} /></td>
          <td className="valor">{numero(valor)}</td>
        </tr>)}</tbody>
      </table>
      <h3 className="subtitulo">Por zona tarifaria<Ref n={2} /></h3>
      {paradas.cargando ? <p className="cargando">Leyendo las paradas del lago…</p>
        : paradas.error ? <p className="errata">No se pudo leer el archivo de paradas: {paradas.error}.</p>
        : <table className="barras compacta" aria-label="Paradas por zona tarifaria"><tbody>{zonas.map(([zona, valor]) => <tr key={zona}>
          <th scope="row">Zona {zona}</th><td className="barra"><span className={`zona-${zona.toLowerCase()}`} style={{ '--ancho': `${(valor / maxZona) * 100}%` }} /></td><td className="valor">{numero(valor)}</td>
        </tr>)}</tbody></table>}
      <p className="lectura-texto tenue">Una parada cercana es un comienzo, no un viaje: este dato no mide frecuencia, demanda ni tiempos de recorrido.</p>
    </> : <p className="errata">No se pudo leer el reporte del lago, así que no se muestran conteos.</p>}
  </Pliego>
}

export function Limites({ libro, indice, pliego }) {
  const items = [
    ['Si te reconocerán tu título', 'El reconocimiento de estudios extranjeros no aparece en ninguna fuente abierta del catálogo.'],
    ['Qué idioma exige cada puesto', 'No hay datos de requisitos de idioma por ocupación.'],
    ['Cuánto gana una persona extranjera', 'No hay ingreso ni salario por origen o lengua materna.'],
    ['Cómo se contrata en la práctica', 'Los datos agregados no muestran discriminación, redes ni tiempos de búsqueda.'],
    ['Tu caso', 'Esta app compara zonas y sectores. No predice el futuro de ninguna persona.'],
  ]
  return <Pliego libro={libro} indice={indice} titulo={pliego.titulo}
    figura={<Placa libro={libro} rotulo="Límites a la vista"><Icono nombre="libro" tamano={120} /></Placa>}>
    <ul className="limites">{items.map(([titulo, texto]) => <li key={titulo}><b>{titulo}</b><span>{texto}</span></li>)}</ul>
  </Pliego>
}

const ORDEN_ESTADOS = ['integrada', 'candidata', 'condicionada', 'caida', 'descartada', 'no_existe']

export function Catalogo({ libro, indice, pliego }) {
  const { abrir } = useContext(Notas)
  const [encima, setEncima] = useState(null)
  const fuentes = CATALOGO.fuentes
  const grupos = ORDEN_ESTADOS.map(estado => [estado, fuentes.filter(f => f.estado === estado)]).filter(([, lista]) => lista.length)
  const familias = new Set(fuentes.map(f => f.familia)).size
  return <Pliego libro={libro} indice={indice} titulo={pliego.titulo} notas={[{ detalle: `Conteo sobre docs/catalogo/fuentes.json, revisado el ${fecha(CATALOGO.revisado)}. Existe un segundo catálogo (catalogo/, 26 fichas probadas el 21 sep 2026) que aún no está unificado con este.` }]}
    figura={<div className="estante-fichas">
      {grupos.map(([estado, lista]) => <div className="cajon" key={estado}>
        <div className="cajon-fichas">{lista.map(f => <button type="button" key={f.id} className={`ficha-cuadro ${f.semaforo}`} aria-label={`${f.nombre}: ${ETIQUETA_ESTADO[estado]}, semáforo ${f.semaforo}`}
          onMouseEnter={() => setEncima(f)} onFocus={() => setEncima(f)} onMouseLeave={() => setEncima(null)} onClick={() => abrir(f.id)} />)}</div>
        <span className="cajon-rotulo">{ETIQUETA_ESTADO[estado]}</span>
      </div>)}
      <p className="ficha-encima" aria-live="polite">{encima ? encima.nombre : 'Cada cuadro es una fuente. El color es su semáforo.'}</p>
    </div>}>
    <p className="cifra-grande">{numero(fuentes.length)}</p>
    <p className="cifra-texto">fuentes catalogadas, de {numero(familias)} familias<Ref n={1} /></p>
    <dl className="estados">{grupos.map(([estado, lista]) => <div key={estado}><dt><span className="valor">{numero(lista.length)}</span> {ETIQUETA_ESTADO[estado]}</dt><dd>{CATALOGO.vocabulario.estado[estado]}</dd></div>)}</dl>
  </Pliego>
}

export function Fichas({ libro, indice, pliego }) {
  const { abrir } = useContext(Notas)
  const [estado, setEstado] = useState('')
  const [semaforo, setSemaforo] = useState('')
  const [orden, setOrden] = useState('estado')
  const filas = CATALOGO.fuentes
    .filter(f => (!estado || f.estado === estado) && (!semaforo || f.semaforo === semaforo))
    .sort((a, b) => orden === 'nombre' ? a.nombre.localeCompare(b.nombre, 'es') : ORDEN_ESTADOS.indexOf(a.estado) - ORDEN_ESTADOS.indexOf(b.estado) || a.nombre.localeCompare(b.nombre, 'es'))
  return <Pliego libro={libro} indice={indice} titulo={pliego.titulo} ancho notas={[{ detalle: `docs/catalogo/fuentes.json, revisado el ${fecha(CATALOGO.revisado)}.` }]}>
    <div className="filtros">
      <label>Estado<select value={estado} onChange={evento => setEstado(evento.target.value)}><option value="">Todos</option>{ORDEN_ESTADOS.map(e => <option key={e} value={e}>{ETIQUETA_ESTADO[e]}</option>)}</select></label>
      <label>Semáforo<select value={semaforo} onChange={evento => setSemaforo(evento.target.value)}><option value="">Todos</option><option value="verde">Verde</option><option value="amarillo">Amarillo</option><option value="rojo">Rojo</option></select></label>
      <span className="filtros-conteo">{numero(filas.length)} de {numero(CATALOGO.fuentes.length)} fuentes</span>
    </div>
    <div className="tabla-envoltura">
      <table className="tabla-fichas">
        <thead><tr>
          <th aria-sort={orden === 'nombre' ? 'ascending' : 'none'}><button type="button" onClick={() => setOrden('nombre')}>Fuente</button></th>
          <th>Familia</th>
          <th aria-sort={orden === 'estado' ? 'ascending' : 'none'}><button type="button" onClick={() => setOrden('estado')}>Estado</button></th>
          <th>Semáforo</th><th>Licencia</th><th>Por qué</th>
        </tr></thead>
        <tbody>{filas.length ? filas.map(f => <tr key={f.id}>
          <td><button type="button" className="enlace" onClick={() => abrir(f.id)}>{f.nombre}</button><small>{f.productor}</small></td>
          <td>{f.familia}</td>
          <td><span className={`insignia ${f.estado}`}>{ETIQUETA_ESTADO[f.estado]}</span></td>
          <td><span className={`semaforo ${f.semaforo}`}><i aria-hidden="true" />{f.semaforo}</span></td>
          <td>{f.licencia}</td>
          <td className="razon">{f.razon}</td>
        </tr>) : <tr><td colSpan="6" className="vacio">Ninguna fuente cumple esos dos filtros a la vez.</td></tr>}</tbody>
      </table>
    </div>
  </Pliego>
}

export function NoMostramos({ libro, indice, pliego }) {
  const items = [
    ['Direcciones por edificio', 'Con la dirección, el registro de edificios de HSY describe un hogar identificable. Solo se publican agregados por zona.'],
    ['Empresas una por una', 'Muchos empresarios individuales registran la empresa con su propio nombre. Solo se publican conteos por sector.'],
    ['Celdas con uno o dos empleos', 'Una celda así puede señalar a un solo empleador. La rejilla se agrega antes de publicar.'],
    ['Contactos de Service Map', 'Personas de contacto, correos y teléfonos se descartan en la ingesta.'],
    ['Reportes ciudadanos (Open311)', 'Se descartaron: describen a quien reporta y el lugar donde vive.'],
    ['Eficiencia energética por edificio', 'Casi ningún edificio tiene clase energética, y la que hay apunta a hogares concretos.'],
    ['Tu perfil', 'Lo que eliges en la app vive en la dirección de la página. No se guarda en ningún servidor.'],
  ]
  return <Pliego libro={libro} indice={indice} titulo={pliego.titulo}
    figura={<Placa libro={libro} rotulo="Proteger también es decidir"><Icono nombre="ficha" tamano={120} /></Placa>}>
    <ul className="limites">{items.map(([titulo, texto]) => <li key={titulo}><b>{titulo}</b><span>{texto}</span></li>)}</ul>
    <p className="lectura-texto tenue">Un volumen quedó sin escribir: <b>Conectar</b>. No responde ninguna de las tres preguntas y su fuente, Service Map, sigue condicionada y sin ingerir.</p>
  </Pliego>
}

export const VISTAS = { municipios: Municipios, paradas: Paradas, limites: Limites, catalogo: Catalogo, fichas: Fichas, noMostramos: NoMostramos }

export function FichaFuente({ id, registro, onCerrar }) {
  const datos = ficha(id, registro)
  return <aside className="cajon-ficha" role="dialog" aria-modal="false" aria-labelledby="ficha-titulo">
    <button type="button" className="cerrar" onClick={onCerrar} aria-label="Cerrar la ficha"><Cerrar /></button>
    {datos ? <>
      <h2 id="ficha-titulo">{datos.nombre}</h2>
      <p className="ficha-productor">{datos.productor}</p>
      <dl>
        <dt>Estado</dt><dd>{ETIQUETA_ESTADO[datos.estado] || datos.estado}</dd>
        <dt>Semáforo</dt><dd><Semaforo color={datos.semaforo} /></dd>
        <dt>Vigencia</dt><dd>{datos.vigencia || 'Sin declarar'}</dd>
        <dt>Probado</dt><dd>{datos.probado ? `${fecha(datos.probado)} (${datos.probadoEn})` : `Sin prueba con fecha propia; catálogo revisado el ${fecha(datos.revisionCatalogo)}`}</dd>
        {datos.resultado && <><dt>Resultado</dt><dd>{datos.resultado}</dd></>}
        <dt>Licencia</dt><dd>{datos.licencia || 'Sin declarar'}</dd>
        <dt>Personas</dt><dd>{datos.personas || 'Sin declarar'}</dd>
        {datos.limites && <><dt>Límites</dt><dd>{datos.limites}</dd></>}
        <dt>Ficha</dt><dd><code>{datos.catalogo}</code></dd>
      </dl>
      {datos.documentacion && <a className="enlace" href={datos.documentacion} target="_blank" rel="noreferrer">Abrir la fuente original</a>}
    </> : <p>No hay ficha para «{id}» en ningún catálogo.</p>}
  </aside>
}
