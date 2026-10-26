import { useCallback, useEffect, useRef, useState } from 'react'
import { LIBROS, coberturaDe } from './libros.js'
import { useLago, numero } from './datos.js'
import { Flecha, Icono } from './iconos.jsx'
import { FichaFuente, Hueco, Notas, Pendiente, VISTAS } from './pliegos.jsx'

const SIN_MOVIMIENTO = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Estado en la URL: ?libro=habitar&leer=1&pliego=4. Sirve para compartir una cifra exacta.
function leerUrl() {
  const p = new URLSearchParams(window.location.search)
  const libro = LIBROS.find(item => item.id === p.get('libro'))
  const pliego = Math.min(Math.max(Number(p.get('pliego')) || 1, 1), libro?.pliegos.length || 1)
  return { libro: libro?.id || null, leer: p.get('leer') === '1', pliego }
}

function escribirUrl({ libro, leer, pliego }, reemplazar = false) {
  const p = new URLSearchParams()
  if (libro) p.set('libro', libro)
  if (libro && leer) { p.set('leer', '1'); p.set('pliego', String(pliego)) }
  const destino = p.toString() ? `?${p}` : window.location.pathname
  window.history[reemplazar ? 'replaceState' : 'pushState'](null, '', destino)
}

export function App() {
  const lago = useLago()
  const [ruta, setRuta] = useState(leerUrl)
  const [sacando, setSacando] = useState(null)
  const [abriendo, setAbriendo] = useState(false)
  const [nota, setNota] = useState(null)
  const [ficha, setFicha] = useState(null)

  const ir = useCallback((siguiente, reemplazar, subir = true) => {
    escribirUrl(siguiente, reemplazar)
    setRuta(siguiente)
    setNota(null)
    if (subir) window.scrollTo({ top: 0, behavior: SIN_MOVIMIENTO ? 'auto' : 'smooth' })
  }, [])

  useEffect(() => {
    const volver = () => setRuta(leerUrl())
    window.addEventListener('popstate', volver)
    return () => window.removeEventListener('popstate', volver)
  }, [])

  useEffect(() => {
    const tecla = evento => { if (evento.key === 'Escape') setFicha(null) }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [])

  const sacar = id => {
    if (SIN_MOVIMIENTO) return ir({ libro: id, leer: false, pliego: 1 })
    setSacando(id)
    setTimeout(() => { setSacando(null); ir({ libro: id, leer: false, pliego: 1 }) }, 620)
  }

  const abrir = () => {
    if (SIN_MOVIMIENTO) return ir({ ...ruta, leer: true, pliego: 1 })
    setAbriendo(true)
    setTimeout(() => { setAbriendo(false); ir({ ...ruta, leer: true, pliego: 1 }) }, 560)
  }

  const libro = LIBROS.find(item => item.id === ruta.libro)
  const contextoNotas = { activa: nota, setActiva: setNota, abrir: setFicha, registro: lago.registro || [] }

  return <Notas.Provider value={contextoNotas}>
    <div className="biblioteca" data-color={libro?.color}>
      <header className="encabezado">
        <button type="button" className="marca" onClick={() => ir({ libro: null, leer: false, pliego: 1 })}>Cerebro<br />Helsinki</button>
        <span className="lema">Una biblioteca para empezar de nuevo</span>
        <span className="coordenadas">60°10′ N · 24°56′ E</span>
      </header>
      {lago.errores.length > 0 && <p className="errata general" role="alert">Parte del lago no se pudo leer ({lago.errores.join('; ')}). Las páginas que dependen de esos archivos lo dicen en su lugar.</p>}
      <main>
        {!libro && <Estante sacando={sacando} onSacar={sacar} />}
        {libro && !ruta.leer && <Portada libro={libro} abriendo={abriendo} onAbrir={abrir} onVolver={() => ir({ libro: null, leer: false, pliego: 1 })} />}
        {libro && ruta.leer && <Lectura libro={libro} indice={ruta.pliego - 1} lago={lago}
          onPliego={n => ir({ ...ruta, pliego: n }, true, false)}
          onLibro={id => ir({ libro: id, leer: true, pliego: 1 })}
          onVolver={() => ir({ libro: null, leer: false, pliego: 1 })} />}
      </main>
      <footer className="colofon">
        <span>Un proyecto sobre migración, ciudad y posibilidades · Taller de Datos, EAFIT 2026-2</span>
        <span>Grupo: nombres por confirmar</span>
      </footer>
      {ficha && <FichaFuente id={ficha} registro={lago.registro || []} onCerrar={() => setFicha(null)} />}
    </div>
  </Notas.Provider>
}

function Lomo({ libro, numeroVol, estado, onSacar }) {
  const { conDatos, total } = coberturaDe(libro)
  return <li className={`lomo-celda ${estado}`} data-color={libro.color}>
    <button type="button" className="lomo" onClick={onSacar}
      aria-label={`Volumen ${numeroVol}: ${libro.titulo}. ${libro.subtitulo}. ${conDatos} de ${total} pliegos con datos.`}>
      <span className="lomo-pestana" aria-hidden="true" />
      <span className="lomo-numero">{String(numeroVol).padStart(2, '0')}</span>
      <Icono nombre={libro.icono} />
      <span className="lomo-titulo">{libro.titulo}</span>
      <span className="lomo-pie">Helsinki · Vol. {String(numeroVol).padStart(2, '0')}</span>
    </button>
    <span className="lomo-subtitulo">{libro.subtitulo}</span>
    <span className="lomo-cobertura" aria-hidden="true">{Array.from({ length: total }, (_, i) => <i key={i} className={i < conDatos ? 'lleno' : ''} />)}</span>
  </li>
}

function Estante({ sacando, onSacar }) {
  return <section className="estante-pagina">
    <div className="estante-cabeza">
      <h1>Aquí empieza<br />tu próxima historia.</h1>
      <div className="estante-nota">
        <p>Llegar a una ciudad también es aprender a pertenecer.</p>
        <p className="tenue">Cada libro responde una pregunta con datos abiertos. Las barras bajo cada lomo dicen cuántas de sus páginas ya tienen datos.</p>
      </div>
    </div>
    <ol className={`estante ${sacando ? 'sacando' : ''}`}>
      {LIBROS.map((libro, i) => <Lomo key={libro.id} libro={libro} numeroVol={i + 1} estado={sacando === libro.id ? 'sacado' : sacando ? 'apagado' : ''} onSacar={() => onSacar(libro.id)} />)}
    </ol>
  </section>
}

function Portada({ libro, abriendo, onAbrir, onVolver }) {
  const vol = String(LIBROS.indexOf(libro) + 1).padStart(2, '0')
  const { conDatos, total } = coberturaDe(libro)
  return <section className="portada-pagina">
    <button type="button" className="volver" onClick={onVolver}><Flecha izquierda /> Volver al estante</button>
    <div className="portada-rejilla">
      <div className="portada-texto">
        <h1>{libro.portada.titulo}</h1>
        <p>{libro.portada.texto}</p>
        {libro.pregunta && <p className="tenue">Responde la pregunta {libro.pregunta} de la app. Pliegos con datos del lago hoy: {numero(conDatos)} de {numero(total)}. Los demás dicen qué les falta.</p>}
        <button type="button" className="enlace-fuerte" onClick={onAbrir}>Abre el libro para explorar <Flecha /></button>
      </div>
      <button type="button" className={`portada ${abriendo ? 'abriendo' : ''}`} data-color={libro.color} onClick={onAbrir} aria-label={`Abrir ${libro.titulo}`}>
        <span className="portada-serie">Cerebro Helsinki · Vol. {vol}</span>
        <span className="portada-titulo">{libro.titulo}</span>
        <span className="portada-subtitulo">{libro.subtitulo}</span>
        <Icono nombre={libro.icono} tamano={120} />
        <span className="portada-accion">Abrir este capítulo <Flecha /></span>
      </button>
    </div>
  </section>
}

function Lectura({ libro, indice, lago, onPliego, onLibro, onVolver }) {
  const pliego = libro.pliegos[indice]
  const total = libro.pliegos.length
  const posicion = LIBROS.indexOf(libro)
  const siguiente = LIBROS[(posicion + 1) % LIBROS.length]

  useEffect(() => {
    const tecla = evento => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(evento.target.tagName)) return
      if (evento.key === 'ArrowRight' && indice < total - 1) onPliego(indice + 2)
      if (evento.key === 'ArrowLeft' && indice > 0) onPliego(indice)
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [indice, total, onPliego])

  const marco = useRef(null)
  useEffect(() => {
    const arriba = marco.current?.getBoundingClientRect().top
    if (arriba < 0) marco.current.scrollIntoView({ block: 'start', behavior: SIN_MOVIMIENTO ? 'auto' : 'smooth' })
  }, [indice])

  const Vista = pliego.tipo === 'pendiente' ? Pendiente : pliego.tipo === 'hueco' ? Hueco : VISTAS[pliego.vista]
  return <section className="lectura-pagina">
    <div className="lectura-barra">
      <button type="button" className="volver" onClick={onVolver}><Flecha izquierda /> Devolver al estante</button>
      <span className="lectura-posicion">Lectura {String(posicion + 1).padStart(2, '0')} / {String(LIBROS.length).padStart(2, '0')}</span>
    </div>
    <div className="marco-pliego" ref={marco}>
      <div className="costado">
        <button type="button" className="hoja" disabled={indice === 0} onClick={() => onPliego(indice)}
          aria-label={indice > 0 ? `Pliego anterior: ${libro.pliegos[indice - 1].titulo}` : 'No hay pliego anterior'} title={libro.pliegos[indice - 1]?.titulo}><Flecha izquierda /></button>
      </div>
      <div className="hojeo" key={`${libro.id}-${indice}`}>
        <Vista libro={libro} indice={indice} pliego={pliego} lago={lago} />
      </div>
      <div className="costado">
        <button type="button" className="hoja" disabled={indice === total - 1} onClick={() => onPliego(indice + 2)}
          aria-label={indice < total - 1 ? `Pliego siguiente: ${libro.pliegos[indice + 1].titulo}` : 'No hay pliego siguiente'} title={libro.pliegos[indice + 1]?.titulo}><Flecha /></button>
      </div>
    </div>
    <nav className="paginador" aria-label={`Pliegos de ${libro.titulo}`}>
      <ol>{libro.pliegos.map((item, i) => <li key={item.id}>
        <button type="button" className={`punto-pliego ${item.tipo} ${i === indice ? 'actual' : ''}`} aria-current={i === indice ? 'page' : undefined}
          aria-label={`Pliego ${i + 1}: ${item.titulo}${item.tipo === 'datos' ? '' : item.tipo === 'pendiente' ? ' (pendiente de ingesta)' : item.tipo === 'hueco' ? ' (hueco declarado)' : ''}`}
          title={item.titulo} onClick={() => onPliego(i + 1)}>{i + 1}</button>
      </li>)}</ol>
    </nav>
    <nav className="libros-nav" aria-label="Otros libros">
      <ol>{LIBROS.map(item => <li key={item.id}><button type="button" data-color={item.color} className={item.id === libro.id ? 'actual' : ''} aria-current={item.id === libro.id ? 'true' : undefined} onClick={() => onLibro(item.id)}>{item.titulo}</button></li>)}</ol>
      <button type="button" className="enlace-fuerte" onClick={() => onLibro(siguiente.id)}>Siguiente libro <Flecha /></button>
    </nav>
  </section>
}
