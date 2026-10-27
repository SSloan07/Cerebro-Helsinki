import { useEffect, useMemo, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import urlDelWorker from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'

// MapLibre 6 busca su worker junto al módulo; empaquetado por Vite hay que decirle dónde quedó.
maplibregl.setWorkerUrl(urlDelWorker)

const VACIO = { type: 'FeatureCollection', features: [] }
const token = nombre => getComputedStyle(document.documentElement).getPropertyValue(nombre).trim()

function limites(coleccion) {
  const bounds = new maplibregl.LngLatBounds()
  for (const feature of coleccion?.features || []) {
    const poligonos = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates
    for (const poligono of poligonos) for (const [lon, lat] of poligono[0]) bounds.extend([lon, lat])
  }
  return bounds.isEmpty() ? null : bounds
}

// Mapa sin teselas de fondo: solo lo que sale del lago, sobre el papel de la página.
export function Mapa({ municipios, color = '--salvia', colorFuerte = '--salvia-fuerte', seleccion, resaltado, onSeleccion, onResaltado, paradas, vivos = false, onVivos, etiqueta }) {
  const contenedor = useRef(null)
  const mapa = useRef(null)
  const [listo, setListo] = useState(false)
  const callbacks = useRef({})
  callbacks.current = { onSeleccion, onResaltado, onVivos }

  useEffect(() => {
    if (!contenedor.current || !municipios) return
    const map = new maplibregl.Map({
      container: contenedor.current,
      style: { version: 8, sources: {}, layers: [{ id: 'papel', type: 'background', paint: { 'background-color': token('--papel-mapa') } }] },
      attributionControl: false, dragRotate: false, pitchWithRotate: false, touchPitch: false, minZoom: 7, maxZoom: 15,
    })
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    mapa.current = map
    const caja = limites(municipios)
    const encuadrar = () => { map.resize(); if (caja) map.fitBounds(caja, { padding: 28, duration: 0 }) }
    const observador = new ResizeObserver(encuadrar)
    observador.observe(contenedor.current)

    map.on('load', () => {
      encuadrar()
      map.addSource('municipios', { type: 'geojson', data: municipios, promoteId: 'municipality_code' })
      map.addLayer({ id: 'municipios-relleno', type: 'fill', source: 'municipios', paint: {
        'fill-color': ['case', ['boolean', ['feature-state', 'seleccion'], false], token(colorFuerte), token(color)],
        'fill-opacity': ['case', ['boolean', ['feature-state', 'resaltado'], false], 0.95, paradas ? 0.35 : 0.75],
      } })
      map.addLayer({ id: 'municipios-borde', type: 'line', source: 'municipios', paint: {
        'line-color': token('--tinta'), 'line-width': ['case', ['boolean', ['feature-state', 'resaltado'], false], 2, 0.8],
      } })
      map.addSource('paradas', { type: 'geojson', data: paradas || VACIO })
      map.addLayer({ id: 'paradas', type: 'circle', source: 'paradas', paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 1.1, 12, 3, 15, 5],
        'circle-color': ['match', ['get', 'zone_id'], 'A', token('--zona-a'), 'B', token('--zona-b'), 'C', token('--zona-c'), token('--zona-d')],
        'circle-opacity': 0.85,
      } })
      map.addSource('vivos', { type: 'geojson', data: VACIO })
      map.addLayer({ id: 'vivos', type: 'circle', source: 'vivos', paint: {
        'circle-radius': 4, 'circle-color': token('--vivo'), 'circle-stroke-color': token('--papel'), 'circle-stroke-width': 1.2,
      } })

      let encima = null
      const marcar = (codigo, estado) => codigo && map.setFeatureState({ source: 'municipios', id: codigo }, estado)
      map.on('mousemove', 'municipios-relleno', evento => {
        const codigo = evento.features?.[0]?.id
        if (codigo === encima) return
        marcar(encima, { resaltado: false })
        encima = codigo
        marcar(codigo, { resaltado: true })
        map.getCanvas().style.cursor = 'pointer'
        callbacks.current.onResaltado?.(codigo)
      })
      map.on('mouseleave', 'municipios-relleno', () => {
        marcar(encima, { resaltado: false })
        encima = null
        map.getCanvas().style.cursor = ''
        callbacks.current.onResaltado?.(null)
      })
      map.on('click', 'municipios-relleno', evento => callbacks.current.onSeleccion?.(evento.features?.[0]?.id))
      setListo(true)
    })
    return () => { observador.disconnect(); map.remove(); mapa.current = null; setListo(false) }
  }, [municipios])

  useEffect(() => {
    const map = mapa.current
    if (!listo || !municipios) return
    for (const feature of municipios.features) {
      const codigo = feature.properties.municipality_code
      map.setFeatureState({ source: 'municipios', id: codigo }, { seleccion: codigo === seleccion, resaltado: codigo === resaltado })
    }
  }, [listo, seleccion, resaltado, municipios])

  useEffect(() => {
    if (listo) mapa.current.getSource('paradas')?.setData(paradas || VACIO)
  }, [listo, paradas])

  useEffect(() => {
    const map = mapa.current
    if (!listo) return
    if (!vivos) { map.getSource('vivos')?.setData(VACIO); return }
    let activo = true
    const pedir = async () => {
      callbacks.current.onVivos?.({ estado: 'consultando' })
      try {
        const bbox = limites(municipios).toArray().flat().join(',')
        const respuesta = await fetch(`/api/live-mobility?bbox=${encodeURIComponent(bbox)}`, { cache: 'no-store' })
        const carga = await respuesta.json()
        if (!activo) return
        if (!respuesta.ok || carga.status !== 'live') {
          map.getSource('vivos')?.setData(VACIO)
          callbacks.current.onVivos?.({ estado: 'caido', motivo: carga.reason || `HTTP ${respuesta.status}` })
          return
        }
        map.getSource('vivos')?.setData(carga.data)
        callbacks.current.onVivos?.({ estado: 'vivo', total: carga.vehicle_count, hora: carga.feed_timestamp || carga.retrieved_at })
      } catch (error) {
        if (!activo) return
        map.getSource('vivos')?.setData(VACIO)
        callbacks.current.onVivos?.({ estado: 'caido', motivo: error.message })
      }
    }
    pedir()
    const reloj = setInterval(pedir, 15000)
    return () => { activo = false; clearInterval(reloj) }
  }, [listo, vivos, municipios])

  return <div className="mapa" role="region" aria-label={etiqueta}>
    <div ref={contenedor} className="mapa-lienzo" />
    {!listo && <div className="mapa-estado">Dibujando el mapa…</div>}
  </div>
}

const hexARgb = hex => hex.replace('#', '').match(/../g).map(par => parseInt(par, 16))
const mezclar = (a, b, t) => `rgb(${hexARgb(a).map((canal, i) => Math.round(canal + (hexARgb(b)[i] - canal) * t)).join(',')})`

// Rampa de 7 pasos entre el color claro y el fuerte del volumen; cortes por cuantiles de los valores reales.
export function rampa(valores, color, colorFuerte) {
  const ordenados = valores.filter(valor => valor != null).sort((a, b) => a - b)
  // MapLibre exige cortes estrictamente crecientes: con muchos valores repetidos (p. ej. ceros) quedan menos pasos.
  const cortes = [...new Set([1, 2, 3, 4, 5, 6].map(i => ordenados[Math.floor((i / 7) * (ordenados.length - 1))]))]
    .filter(corte => corte != null && corte > (ordenados[0] ?? 0))
  const pasos = cortes.length + 1
  const colores = Array.from({ length: pasos }, (_, i) => mezclar(token('--papel'), token(colorFuerte), 0.12 + (pasos > 1 ? i / (pasos - 1) : 1) * 0.88))
  return { cortes, colores, minimo: ordenados[0] ?? 0, maximo: ordenados.at(-1) ?? 0, color, colorFuerte }
}

function imagenTrama() {
  const lado = 12
  const datos = new Uint8Array(lado * lado * 4)
  const [r, g, b] = hexARgb(token('--tinta'))
  const [fr, fg, fb] = hexARgb(token('--gris-placa'))
  for (let y = 0; y < lado; y++) for (let x = 0; x < lado; x++) {
    const raya = (x + y) % lado < 1.5
    datos.set(raya ? [r, g, b, 120] : [fr, fg, fb, 255], (y * lado + x) * 4)
  }
  return { width: lado, height: lado, data: datos }
}

// Áreas postales: coroplético (2D) o extrusión (3D) de una métrica. Los null van con trama, nunca con color.
export function MapaAreas({ areas, municipios, valor, escala, tresD = false, seleccion = [], resaltado, onElegir, onResaltado, etiqueta }) {
  const contenedor = useRef(null)
  const mapa = useRef(null)
  const [listo, setListo] = useState(false)
  const callbacks = useRef({})
  callbacks.current = { onElegir, onResaltado }

  const datos = useMemo(() => ({ type: 'FeatureCollection', features: areas.features.map(f => ({ ...f, properties: { ...f.properties, valor: valor(f.properties) } })) }), [areas, valor])

  useEffect(() => {
    if (!contenedor.current) return
    const map = new maplibregl.Map({
      container: contenedor.current,
      style: { version: 8, sources: {}, layers: [{ id: 'papel', type: 'background', paint: { 'background-color': token('--papel-mapa') } }] },
      attributionControl: false, dragRotate: true, pitchWithRotate: true, maxPitch: 60, minZoom: 7, maxZoom: 15,
    })
    map.addControl(new maplibregl.NavigationControl({ showCompass: true, visualizePitch: true }), 'top-right')
    mapa.current = map
    const caja = limites(municipios || areas)
    const encuadrar = () => { map.resize(); if (caja) map.fitBounds(caja, { padding: 24, duration: 0 }) }
    const observador = new ResizeObserver(encuadrar)
    observador.observe(contenedor.current)
    map.on('load', () => {
      encuadrar()
      map.addImage('trama', imagenTrama())
      map.addSource('areas', { type: 'geojson', data: datos, promoteId: 'postal_code' })
      map.addLayer({ id: 'areas-relleno', type: 'fill', source: 'areas', paint: { 'fill-color': token('--gris-placa') } })
      map.addLayer({ id: 'areas-trama', type: 'fill', source: 'areas', filter: ['==', ['get', 'valor'], null], paint: { 'fill-pattern': 'trama' } })
      map.addLayer({ id: 'areas-3d', type: 'fill-extrusion', source: 'areas', filter: ['!=', ['get', 'valor'], null], layout: { visibility: 'none' }, paint: { 'fill-extrusion-opacity': 0.92 } })
      map.addLayer({ id: 'areas-borde', type: 'line', source: 'areas', paint: { 'line-color': token('--papel'), 'line-width': 0.6 } })
      if (municipios) {
        map.addSource('municipios', { type: 'geojson', data: municipios })
        map.addLayer({ id: 'municipios-borde', type: 'line', source: 'municipios', paint: { 'line-color': token('--tinta'), 'line-width': 1.1 } })
      }
      map.addLayer({ id: 'areas-foco', type: 'line', source: 'areas', paint: {
        'line-color': token('--tinta'),
        'line-width': ['case', ['!=', ['feature-state', 'eleccion'], null], 3, ['boolean', ['feature-state', 'resaltado'], false], 2, 0],
      } })
      let encima = null
      map.on('mousemove', 'areas-relleno', evento => {
        const codigo = evento.features?.[0]?.id
        if (codigo === encima) return
        if (encima) map.setFeatureState({ source: 'areas', id: encima }, { resaltado: false })
        encima = codigo
        if (codigo) map.setFeatureState({ source: 'areas', id: codigo }, { resaltado: true })
        map.getCanvas().style.cursor = 'pointer'
        callbacks.current.onResaltado?.(codigo)
      })
      map.on('mouseleave', 'areas-relleno', () => {
        if (encima) map.setFeatureState({ source: 'areas', id: encima }, { resaltado: false })
        encima = null
        map.getCanvas().style.cursor = ''
        callbacks.current.onResaltado?.(null)
      })
      map.on('click', 'areas-relleno', evento => callbacks.current.onElegir?.(evento.features?.[0]?.id))
      setListo(true)
    })
    return () => { observador.disconnect(); map.remove(); mapa.current = null; setListo(false) }
  }, [areas, municipios])

  useEffect(() => {
    const map = mapa.current
    if (!listo) return
    map.getSource('areas').setData(datos)
    const numero = ['to-number', ['get', 'valor'], 0]
    const color = escala.cortes.length ? ['step', numero, escala.colores[0], ...escala.cortes.flatMap((corte, i) => [corte, escala.colores[i + 1]])] : escala.colores[0]
    map.setPaintProperty('areas-relleno', 'fill-color', ['case', ['==', ['get', 'valor'], null], token('--gris-placa'), color])
    const rango = Math.max(escala.maximo - escala.minimo, 1)
    map.setPaintProperty('areas-3d', 'fill-extrusion-color', color)
    map.setPaintProperty('areas-3d', 'fill-extrusion-height', ['*', 2600, ['/', ['-', numero, escala.minimo], rango]])
  }, [listo, datos, escala])

  useEffect(() => {
    const map = mapa.current
    if (!listo) return
    map.setLayoutProperty('areas-3d', 'visibility', tresD ? 'visible' : 'none')
    map.easeTo({ pitch: tresD ? 52 : 0, bearing: tresD ? -12 : 0, duration: 700 })
  }, [listo, tresD])

  useEffect(() => {
    const map = mapa.current
    if (!listo) return
    for (const f of areas.features) map.setFeatureState({ source: 'areas', id: f.id }, { eleccion: seleccion.includes(f.id) ? f.id : null, resaltado: f.id === resaltado })
  }, [listo, seleccion, resaltado, areas])

  return <div className="mapa" role="region" aria-label={etiqueta}>
    <div ref={contenedor} className="mapa-lienzo" />
    {!listo && <div className="mapa-estado">Dibujando las áreas postales…</div>}
  </div>
}
