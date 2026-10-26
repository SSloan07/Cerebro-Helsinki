import { useEffect, useState } from 'react'
import catalogo from '../../docs/catalogo/fuentes.json'
import pruebas from '../../data/metadata/candidate_probes.json'

// Fichas detalladas del catálogo (catalogo/*.md). Se leen tal cual, sin copiarlas a mano.
const fichasMd = import.meta.glob('../../catalogo/*.md', { query: '?raw', import: 'default', eager: true })

const CAMPOS_MD = { Proveedor: 'productor', Familia: 'familia', Documentación: 'documentacion', Estado: 'estado',
  'Resultado de la prueba': 'resultado', Licencia: 'licencia', personas: 'personas', Semáforo: 'semaforo',
  Vigencia: 'vigencia', probado: 'probado', 'Límites y trampas': 'limites', 'Qué pregunta ayuda a responder': 'uso' }

const limpiar = valor => valor.replace(/\*\*/g, '').replace(/`/g, '').trim()

function leerFichaMd(texto) {
  const ficha = { nombre: limpiar(texto.split('\n')[0].replace(/^#\s*/, '')) }
  for (const linea of texto.split('\n')) {
    const celdas = linea.split('|').map(celda => celda.trim())
    if (celdas.length < 4) continue
    const campo = CAMPOS_MD[limpiar(celdas[1])]
    if (campo) ficha[campo] = limpiar(celdas.slice(2, -1).join('|'))
    if (limpiar(celdas[1]) === 'id') ficha.id = limpiar(celdas[2])
  }
  return ficha
}

const FICHAS_MD = Object.fromEntries(Object.values(fichasMd).map(leerFichaMd).filter(ficha => ficha.id).map(ficha => [ficha.id, ficha]))
const FICHAS_JSON = Object.fromEntries(catalogo.fuentes.map(fuente => [fuente.id, fuente]))
export const PRUEBAS = Object.fromEntries(pruebas.probes.map(prueba => [prueba.id, prueba]))
export const CATALOGO = catalogo

const SEMAFOROS = ['verde', 'amarillo', 'rojo']
const normalizarSemaforo = valor => SEMAFOROS.find(color => (valor || '').toLowerCase().includes(color)) || 'sin'

const ESTADOS = [['no existe', 'no_existe'], ['caída', 'caida'], ['descartada', 'descartada'], ['condicionada', 'condicionada'], ['integrada', 'integrada'], ['candidata', 'candidata']]
const normalizarEstado = valor => ESTADOS.find(([texto]) => (valor || '').toLowerCase().includes(texto))?.[1] || valor || 'sin estado'

export const ETIQUETA_ESTADO = { integrada: 'Integrada', candidata: 'Candidata', condicionada: 'Condicionada', caida: 'Caída', descartada: 'Descartada', no_existe: 'No existe para Helsinki' }

// Une lo que se sabe de una fuente: ficha del catálogo, prueba con fecha y, si está integrada, el registro del lago.
export function ficha(id, registro = []) {
  const md = FICHAS_MD[id]
  const json = FICHAS_JSON[id]
  const prueba = PRUEBAS[id]
  const lago = registro.find(fuente => fuente.id === id)
  if (!md && !json && !lago) return null
  return {
    id,
    nombre: md?.nombre || json?.nombre || lago?.dataset_name,
    productor: md?.productor || json?.productor || lago?.provider,
    estado: normalizarEstado(lago?.integration_status === 'integrated' ? 'integrada' : md?.estado || json?.estado),
    semaforo: normalizarSemaforo(md?.semaforo || json?.semaforo),
    licencia: md?.licencia || json?.licencia || lago?.license,
    vigencia: vigenciaGtfs(lago?.period_covered) || md?.vigencia || json?.vigencia || lago?.period_covered,
    probado: lago?.consulted_at || prueba?.probed_at?.slice(0, 10) || null,
    probadoEn: lago ? 'registro del lago' : prueba ? 'prueba de candidatas' : null,
    resultado: md?.resultado || describirPrueba(prueba),
    personas: md?.personas || json?.personas,
    limites: md?.limites || json?.proteccion || json?.razon || lago?.limitations,
    documentacion: md?.documentacion || json?.documentacion || lago?.url,
    catalogo: md ? `catalogo/${id}.md` : json ? 'docs/catalogo/fuentes.json' : 'public/data/sources.json',
    revisionCatalogo: !md && json ? catalogo.revisado : null,
  }
}

// El registro del ETL guarda la vigencia del horario como «GTFS validity AAAAMMDD–AAAAMMDD».
function vigenciaGtfs(texto) {
  const rango = texto?.match(/(\d{8})\s*[–-]\s*(\d{8})/)
  return rango ? `Horario válido del ${fecha(rango[1])} al ${fecha(rango[2])}` : null
}

function describirPrueba(prueba) {
  if (!prueba) return null
  if (prueba.error) return prueba.error
  const conteo = prueba.number_matched ?? prueba.record_count
  return `HTTP ${prueba.http_status}${conteo != null ? ` · ${numero(conteo)} registros` : ''}`
}

const formatoNumero = new Intl.NumberFormat('es-ES', { useGrouping: 'always' })
export const numero = valor => formatoNumero.format(valor)
const formatoFecha = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
export const fecha = iso => {
  if (!iso) return 'sin fecha'
  const limpio = /^\d{8}$/.test(iso) ? `${iso.slice(0, 4)}-${iso.slice(4, 6)}-${iso.slice(6, 8)}` : iso.slice(0, 10)
  return formatoFecha.format(new Date(`${limpio}T00:00:00Z`))
}

async function pedir(ruta) {
  const respuesta = await fetch(ruta)
  if (!respuesta.ok) throw new Error(`${ruta} respondió ${respuesta.status}`)
  return respuesta.json()
}

// Lo que hay hoy en el lago publicado (public/data), generado por el ETL.
export function useLago() {
  const [lago, setLago] = useState({ cargando: true, errores: [] })
  useEffect(() => {
    let vivo = true
    Promise.allSettled([pedir('/data/municipalities.geojson'), pedir('/data/sources.json'), pedir('/data/update-report.json')])
      .then(([municipios, registro, reporte]) => {
        if (!vivo) return
        setLago({ cargando: false,
          municipios: municipios.value || null, registro: registro.value?.sources || [], reporte: reporte.value || null,
          errores: [municipios, registro, reporte].filter(item => item.status === 'rejected').map(item => item.reason.message) })
      })
    return () => { vivo = false }
  }, [])
  return lago
}

export function useParadas() {
  const [paradas, setParadas] = useState({ cargando: true })
  useEffect(() => {
    let vivo = true
    pedir('/data/transit_stops.geojson')
      .then(datos => vivo && setParadas({ cargando: false, datos }))
      .catch(error => vivo && setParadas({ cargando: false, error: error.message }))
    return () => { vivo = false }
  }, [])
  return paradas
}
