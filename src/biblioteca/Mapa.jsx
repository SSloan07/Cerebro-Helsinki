import { useEffect, useRef, useState } from 'react'
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
