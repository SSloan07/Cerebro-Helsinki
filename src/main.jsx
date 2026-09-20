import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import './styles.css'
import './overrides.css'

const NAV = [
  ['overview', 'Overview', '◫'], ['twin', 'Digital Twin', '⬡'], ['mobility', 'Live Mobility', '↗'],
  ['climate', 'Climate & Energy', '☼'], ['innovation', 'Innovation & Research', '⌬'],
  ['services', 'Services & Access', '⌖'], ['sources', 'Sources & method', '≡'],
]
const EVIDENCE = { observed: 'Observed', derived: 'Derived', estimated: 'Estimated', modelled: 'Modelled', proxy: 'Proxy', declared: 'Declared' }
const CITIES = ['Espoo', 'Helsinki', 'Vantaa', 'Kauniainen']
const numberFormat = new Intl.NumberFormat('en-GB')
const timeFormat = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Helsinki' })

function useData() {
  const [data, setData] = useState({ loading: true, municipalities: null, registry: null, report: null, error: '' })
  useEffect(() => {
    Promise.allSettled([
      fetch('/data/municipalities.geojson').then(response => { if (!response.ok) throw new Error('Municipal boundaries unavailable'); return response.json() }),
      fetch('/data/sources.json').then(response => { if (!response.ok) throw new Error('Source registry unavailable'); return response.json() }),
      fetch('/data/update-report.json').then(response => { if (!response.ok) throw new Error('Update report unavailable'); return response.json() }),
    ]).then(([municipalities, registry, report]) => {
      const failed = [municipalities, registry, report].some(item => item.status === 'rejected')
      setData({ loading: false, error: failed ? 'One or more versioned datasets could not be loaded.' : '',
        municipalities: municipalities.status === 'fulfilled' ? municipalities.value : null,
        registry: registry.status === 'fulfilled' ? registry.value : null,
        report: report.status === 'fulfilled' ? report.value : null })
    })
  }, [])
  return data
}

function pointInRing(lon, lat, ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j]
    if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

function belongsTo(feature, lon, lat) {
  const { type, coordinates } = feature.geometry || {}
  const polygons = type === 'Polygon' ? [coordinates] : type === 'MultiPolygon' ? coordinates : []
  return polygons.some(polygon => polygon?.length && pointInRing(lon, lat, polygon[0]) && !polygon.slice(1).some(ring => pointInRing(lon, lat, ring)))
}

function safePopup(title, rows, onSource) {
  const content = document.createElement('div')
  const heading = document.createElement('strong')
  heading.textContent = title
  content.append(heading)
  for (const row of rows) {
    const element = document.createElement(row.small ? 'small' : 'div')
    element.textContent = row.text
    content.append(element)
  }
  if (onSource) {
    const link = document.createElement('button')
    link.type = 'button'
    link.textContent = 'Source lineage & limits ↗'
    link.addEventListener('click', onSource)
    content.append(link)
  }
  return content
}

function MapView({ data, city, sourceDetails, liveEnabled = false, stopsEnabled = true, vehiclesEnabled = true, onLiveStatus }) {
  const container = useRef(null)
  const mapRef = useRef(null)
  const lastBbox = useRef('')
  const staticStops = useRef(null)
  const snapshotRequest = useRef(null)
  const dataRef = useRef(data)
  dataRef.current = data
  const [mapStatus, setMapStatus] = useState('loading')
  const [mapMessage, setMapMessage] = useState('Loading the verified Helsinki metro layers…')

  useEffect(() => {
    if (liveEnabled) onLiveStatus?.({ status: 'checking' })
    if (!container.current || mapRef.current) return
    const map = new maplibregl.Map({
      container: container.current,
      center: [24.91, 60.19],
      zoom: 9.1,
      style: {
        version: 8,
        sources: { osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256,
          attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a> · ODbL' } },
        layers: [{ id: 'base', type: 'raster', source: 'osm' }],
      },
      attributionControl: false,
      minZoom: 7,
      maxZoom: 18,
    })
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    map.addControl(new maplibregl.AttributionControl({ compact: false }), 'bottom-right')
    mapRef.current = map
    let cancelled = false
    let refreshTimer
    let activeController
    let vehicleCache

    const requestStops = async bounds => {
      const bbox = bounds.toArray().flat().join(',')
      const key = bbox.split(',').map(value => Number(value).toFixed(3)).join(',')
      if (key === lastBbox.current) return
      lastBbox.current = key
      activeController?.abort()
      activeController = new AbortController()
      try {
        const response = await fetch(`/api/stops?bbox=${encodeURIComponent(bbox)}`, { signal: activeController.signal })
        if (!response.ok) throw new Error(`Snapshot API returned ${response.status}`)
        const payload = await response.json()
        const collection = payload.data || payload
        map.getSource('transit-stops')?.setData(collection)
        setMapStatus('ready')
        setMapMessage(`${numberFormat.format(payload.returnedFeatureCount ?? collection.features?.length ?? 0)} HSL boarding stop records in the current view · versioned GTFS snapshot`)
      } catch (error) {
        if (error.name === 'AbortError' || cancelled) return
        try {
          staticStops.current ||= await fetch('/data/transit_stops.geojson').then(response => {
            if (!response.ok) throw new Error('Local HSL snapshot unavailable')
            return response.json()
          })
          const [west, south, east, north] = bounds.toArray().flat()
          const features = staticStops.current.features.filter(feature => {
            const [lon, lat] = feature.geometry.coordinates
            return lon >= west && lon <= east && lat >= south && lat <= north
          })
          map.getSource('transit-stops')?.setData({ type: 'FeatureCollection', features })
          setMapStatus('ready')
          setMapMessage(`${numberFormat.format(features.length)} HSL boarding stop records in the current view · checked-in snapshot`)
        } catch {
          setMapStatus('error')
          setMapMessage('HSL stop snapshot unavailable. Other map layers remain available.')
        }
      }
    }

    const requestVehicles = async () => {
      const source = map.getSource('live-vehicles')
      if (!source || !map.isStyleLoaded()) return
      const bbox = map.getBounds().toArray().flat().join(',')
      try {
        const response = await fetch(`/api/live-mobility?bbox=${encodeURIComponent(bbox)}`, { cache: 'no-store' })
        const payload = await response.json()
        if (!response.ok || payload.status !== 'live') {
          source.setData({ type: 'FeatureCollection', features: [] })
          onLiveStatus?.({ status: payload.status === 'credentials_required' ? 'credentials_required' : 'unavailable',
            error: payload.reason || 'realtime_feed_unavailable', httpStatus: payload.http_status ?? response.status ?? 0,
            retrievedAt: payload.retrieved_at || new Date().toISOString(), source: payload.source || 'HSL GTFS-Realtime' })
          return
        }
        const features = payload.data.features.map(feature => {
          const [lon, lat] = feature.geometry.coordinates
          const municipality = dataRef.current.municipalities?.features?.find(boundary => belongsTo(boundary, lon, lat))
          return municipality ? { ...feature, properties: { ...feature.properties, municipality_code: municipality.properties.municipality_code, municipality: municipality.properties.name } } : null
        }).filter(Boolean)
        source.setData({ type: 'FeatureCollection', features })
        vehicleCache = { status: 'live', count: payload.vehicle_count, visible: features.length,
          feedTimestamp: payload.feed_timestamp, retrievedAt: payload.retrieved_at, entityCount: payload.entity_count }
        onLiveStatus?.(vehicleCache)
      } catch (error) {
        source.setData({ type: 'FeatureCollection', features: [] })
        onLiveStatus?.({ status: 'unavailable', error: error.message, httpStatus: 0,
          retrievedAt: new Date().toISOString(), source: 'HSL GTFS-Realtime', previous: vehicleCache || null })
      }
    }

    map.on('load', () => {
      map.addSource('municipalities', { type: 'geojson', data: dataRef.current.municipalities || { type: 'FeatureCollection', features: [] } })
      map.addLayer({ id: 'municipality-fill', type: 'fill', source: 'municipalities', paint: {
        'fill-color': ['match', ['get', 'name'], 'Helsinki', '#7ab69a', 'Espoo', '#c6d5b7', 'Vantaa', '#99bfd0', 'Kauniainen', '#d9c8a0', '#a8b8ac'],
        'fill-opacity': ['case', ['==', ['get', 'name'], city || ''], 0.65, 0.32],
      } })
      map.addLayer({ id: 'municipality-outline', type: 'line', source: 'municipalities', paint: { 'line-color': '#456052', 'line-width': 1.2 } })
      map.addSource('transit-stops', { type: 'geojson', data: { type: 'FeatureCollection', features: [] }, cluster: true, clusterRadius: 38, clusterMaxZoom: 14,
        clusterProperties: { in_helsinki: ['+', ['case', ['==', ['get', 'municipality'], 'Helsinki'], 1, 0]],
          in_espoo: ['+', ['case', ['==', ['get', 'municipality'], 'Espoo'], 1, 0]],
          in_vantaa: ['+', ['case', ['==', ['get', 'municipality'], 'Vantaa'], 1, 0]],
          in_kauniainen: ['+', ['case', ['==', ['get', 'municipality'], 'Kauniainen'], 1, 0]] } })
      map.addLayer({ id: 'stop-clusters', type: 'circle', source: 'transit-stops', filter: ['has', 'point_count'], paint: {
        'circle-color': '#397c9a', 'circle-radius': ['step', ['get', 'point_count'], 12, 50, 16, 200, 21],
        'circle-stroke-color': '#fff', 'circle-stroke-width': 2,
      } })
      map.addLayer({ id: 'stop-cluster-count', type: 'symbol', source: 'transit-stops', filter: ['has', 'point_count'], layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 9 }, paint: { 'text-color': '#fff' } })
      map.addLayer({ id: 'stop-points', type: 'circle', source: 'transit-stops', filter: ['!', ['has', 'point_count']], paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 2, 13, 5], 'circle-color': '#397c9a', 'circle-stroke-color': '#fff', 'circle-stroke-width': 1,
      } })
      map.addSource('live-vehicles', { type: 'geojson', data: { type: 'FeatureCollection', features: [] }, cluster: true, clusterRadius: 36, clusterMaxZoom: 12,
        clusterProperties: { in_helsinki: ['+', ['case', ['==', ['get', 'municipality'], 'Helsinki'], 1, 0]],
          in_espoo: ['+', ['case', ['==', ['get', 'municipality'], 'Espoo'], 1, 0]],
          in_vantaa: ['+', ['case', ['==', ['get', 'municipality'], 'Vantaa'], 1, 0]],
          in_kauniainen: ['+', ['case', ['==', ['get', 'municipality'], 'Kauniainen'], 1, 0]] } })
      map.addLayer({ id: 'live-vehicle-points', type: 'circle', source: 'live-vehicles', filter: ['!', ['has', 'point_count']], paint: {
        'circle-radius': 5, 'circle-color': '#e26949', 'circle-stroke-color': '#fff', 'circle-stroke-width': 1.5,
      } })
      map.addLayer({ id: 'live-vehicle-clusters', type: 'circle', source: 'live-vehicles', filter: ['has', 'point_count'], paint: {
        'circle-radius': ['step', ['get', 'point_count'], 11, 50, 16, 200, 21], 'circle-color': '#e26949', 'circle-stroke-color': '#fff', 'circle-stroke-width': 2,
      } })
      map.on('click', 'municipality-fill', event => {
        const feature = event.features?.[0]
        if (!feature) return
        const item = feature.properties
        new maplibregl.Popup({ offset: 8 }).setLngLat(event.lngLat).setDOMContent(safePopup(item.name, [
          { text: `${item.municipality_code} · municipal boundary · reference year ${item.reference_year}` },
          { text: 'Generalized boundary geometry · observed source data', small: true },
        ], () => sourceDetails(['fi-municipal-boundaries']))).addTo(map)
      })
      map.on('click', 'stop-points', event => {
        const feature = event.features?.[0]
        if (!feature) return
        const item = feature.properties
        new maplibregl.Popup({ offset: 8 }).setLngLat(event.lngLat).setDOMContent(safePopup(item.name, [
          { text: `${item.municipality} · HSL ${item.zone_id || 'zone unavailable'}` },
          { text: 'Static boarding point · GTFS snapshot', small: true },
        ], () => sourceDetails(['hsl-gtfs-stops']))).addTo(map)
      })
      map.on('click', 'live-vehicle-points', event => {
        const feature = event.features?.[0]
        if (!feature) return
        const item = feature.properties
        new maplibregl.Popup({ offset: 8 }).setLngLat(event.lngLat).setDOMContent(safePopup(item.label || item.vehicle_id || 'HSL vehicle', [
          { text: `${item.municipality || 'Municipality unavailable'} · route ${item.route_id || 'not supplied'}` },
          { text: item.observed_at ? `Vehicle record ${timeFormat.format(new Date(Number(item.observed_at)))}` : 'Vehicle record has no entity timestamp', small: true },
        ], () => sourceDetails(['hsl-gtfs-realtime-vehicles']))).addTo(map)
      })
      map.on('click', 'stop-clusters', event => {
        const cluster = map.queryRenderedFeatures(event.point, { layers: ['stop-clusters'] })[0]
        map.getSource('transit-stops').getClusterExpansionZoom(cluster.properties.cluster_id).then(zoom => map.easeTo({ center: cluster.geometry.coordinates, zoom }))
      })
      map.on('click', 'live-vehicle-clusters', event => {
        const cluster = map.queryRenderedFeatures(event.point, { layers: ['live-vehicle-clusters'] })[0]
        if (cluster) map.getSource('live-vehicles').getClusterExpansionZoom(cluster.properties.cluster_id).then(zoom => map.easeTo({ center: cluster.geometry.coordinates, zoom }))
      })
      for (const layer of ['municipality-fill', 'stop-points', 'stop-clusters', 'live-vehicle-points', 'live-vehicle-clusters']) {
        map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer' })
        map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = '' })
      }
      map.on('moveend', () => { requestStops(map.getBounds()); if (liveEnabled) requestVehicles() })
      map.once('idle', () => {
        requestStops(map.getBounds())
        if (liveEnabled) {
          requestVehicles()
          refreshTimer = setInterval(requestVehicles, 15000)
        }
      })
      setMapStatus('ready')
      setMapMessage('Map ready · static layers and live feeds retain separate timestamps')
    })
    return () => {
      cancelled = true
      clearInterval(refreshTimer)
      activeController?.abort()
      map.remove()
      mapRef.current = null
      if (liveEnabled) onLiveStatus?.({ status: 'unavailable', reason: 'layer_inactive' })
    }
  }, [liveEnabled, onLiveStatus])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return
    map.getSource('municipalities')?.setData(data.municipalities || { type: 'FeatureCollection', features: [] })
    if (map.getLayer('municipality-fill')) map.setPaintProperty('municipality-fill', 'fill-opacity', ['case', ['==', ['get', 'name'], city || ''], 0.65, 0.32])
    if (map.getLayer('stop-points')) map.setFilter('stop-points', city ? ['all', ['!', ['has', 'point_count']], ['==', ['get', 'municipality'], city]] : ['!', ['has', 'point_count']])
    const stopClusterFilter = city ? ['all', ['has', 'point_count'], ['>', ['get', `in_${city.toLowerCase()}`], 0]] : ['has', 'point_count']
    if (map.getLayer('stop-clusters')) map.setFilter('stop-clusters', stopClusterFilter)
    if (map.getLayer('stop-cluster-count')) map.setFilter('stop-cluster-count', stopClusterFilter)
    if (map.getLayer('live-vehicle-points')) map.setFilter('live-vehicle-points', ['all', ['!', ['has', 'point_count']], ...(city ? [['==', ['get', 'municipality'], city]] : [])])
    if (map.getLayer('live-vehicle-clusters')) map.setFilter('live-vehicle-clusters', city ? ['all', ['has', 'point_count'], ['>', ['get', `in_${city.toLowerCase()}`], 0]] : ['has', 'point_count'])
    for (const id of ['stop-points', 'stop-clusters', 'stop-cluster-count']) if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', stopsEnabled ? 'visible' : 'none')
    for (const id of ['live-vehicle-points', 'live-vehicle-clusters']) if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', vehiclesEnabled ? 'visible' : 'none')
  }, [data.municipalities, city, stopsEnabled, vehiclesEnabled, mapStatus])

  return <div className="map-shell">
    <div ref={container} className="map-canvas" />
    {data.loading && <div className="map-state">Loading municipal boundaries…</div>}
    {data.error && <div className="map-state error">{data.error}</div>}
    {mapStatus !== 'ready' && !data.loading && <div className={`map-state ${mapStatus === 'error' ? 'error' : ''}`}>{mapMessage}</div>}
  </div>
}

function App() {
  const data = useData()
  const [view, setView] = useState('overview')
  const [city, setCity] = useState('')
  const [liveStatus, setLiveStatus] = useState({ status: 'candidate' })
  const [sourceModal, setSourceModal] = useState(null)
  const [showStops, setShowStops] = useState(true)
  const [showVehicles, setShowVehicles] = useState(true)
  const boundaries = data.municipalities?.features || []
  const registry = data.registry?.sources || []
  const count = data.report?.counts || {}
  const snapshotDate = data.report?.generated_at ? timeFormat.format(new Date(data.report.generated_at)) : 'unavailable'
  const selectedView = NAV.find(([id]) => id === view)?.[1] || 'Overview'
  const sourcesIntegrated = registry.filter(source => source.integration_status === 'integrated').length
  const setLive = React.useCallback(status => setLiveStatus(status), [])

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><span /><span /><span /><span /></div><div><b>Cerebro</b><span>HELSINKI</span></div></div>
      <div className="workspace-label">URBAN INTELLIGENCE</div>
      <nav aria-label="Urban intelligence perspectives">{NAV.map(([id, label, icon]) => <button key={id} title={label} aria-label={label} className={`nav-item ${view === id ? 'active' : ''}`} onClick={() => setView(id)}><span className="nav-icon">{icon}</span><span>{label}</span>{id === 'sources' && <span className="nav-count">{registry.length || '—'}</span>}</button>)}</nav>
      <div className="sidebar-bottom"><span className="status-dot" />EVIDENCE LAYERS<span className="version">0.2</span></div>
    </aside>

    <main className="main-content">
      <header className="topbar"><div className="crumb"><span>Helsinki Metropolitan Area</span><span className="slash">/</span><strong>{selectedView}</strong></div><div className="top-actions"><span className="data-date">ETL snapshot · {snapshotDate}</span><button className="icon-button" aria-label="Open sources and method" onClick={() => setView('sources')}>i</button><div className="avatar">CH</div></div></header>
      <div className="page-wrap">
        <section className="page-heading"><div><div className="eyebrow"><span className="green-dot" />URBAN INTELLIGENCE <span className="eyebrow-sep">·</span> FINLAND</div><h1>{view === 'overview' ? 'A city system, in evidence.' : selectedView}</h1><p>{view === 'overview' ? 'A verifiable view of mobility, city structure and the public datasets behind them.' : viewDescriptions[view]}</p></div><label className="city-select">Metro area<select aria-label="Filter map by municipality" value={city} onChange={event => setCity(event.target.value)}><option value="">All four municipalities</option>{CITIES.map(name => <option key={name} value={name}>{name}</option>)}</select></label></section>

        {view === 'sources' ? <SourcesPage sources={registry} report={data.report} loading={data.loading} onDetails={ids => setSourceModal(ids)} /> : null}

        {view === 'overview' && <>
          <section className="metrics" aria-label="Verified data indicators">
            <Metric label="MUNICIPALITIES" value={boundaries.length ? String(boundaries.length) : '—'} unit="core metro areas" note="Statistics Finland · 2025 boundary layer" tone="mint" onInfo={() => setSourceModal(['fi-municipal-boundaries'])} />
            <Metric label="HSL BOARDING STOPS" value={count.mapped_stop_count ? numberFormat.format(count.mapped_stop_count) : '—'} unit="inside four municipalities" note={`GTFS validity ${count.service_period_start || 'unavailable'}–${count.service_period_end || 'unavailable'}`} tone="blue" onInfo={() => setSourceModal(['hsl-gtfs-stops'])} />
            <Metric label="LIVE VEHICLES" value={liveStatus.status === 'live' ? numberFormat.format(liveStatus.count) : 'Unavailable'} unit={liveStatus.status === 'live' ? `${numberFormat.format(liveStatus.visible)} mapped in view` : 'feed response unavailable'} note={liveStatus.status === 'live' && liveStatus.feedTimestamp ? `Feed timestamp · ${timeFormat.format(new Date(liveStatus.feedTimestamp))}` : liveStatus.error || 'No scheduled coordinates shown as live'} tone="orange" onInfo={() => setSourceModal(['hsl-gtfs-realtime-vehicles'])} />
            <Metric label="LOCAL BUILDING LAYER" value="Pending" unit="geometry integration" note="Official 3D viewer is available separately" tone="sand" onInfo={() => setSourceModal(['helsinki-3d-model', 'osm-building-footprints'])} />
          </section>
          <section className="workspace-grid">
            <div className="map-card">
              <div className="map-head"><div><div className="card-kicker">EVIDENCE LAYER · WGS84 · SOURCE LINEAGE AVAILABLE</div><h2>Helsinki metro · stops and municipal boundaries</h2></div><div className="map-controls"><button className={`layer-button ${showStops ? 'selected' : ''}`} aria-pressed={showStops} onClick={() => setShowStops(value => !value)}>● <span>GTFS stops</span></button><button className={`layer-button ${showVehicles ? 'selected' : ''}`} aria-pressed={showVehicles} onClick={() => setShowVehicles(value => !value)}>● <span>Live vehicles</span></button></div></div>
              <MapView data={data} city={city} sourceDetails={setSourceModal} liveEnabled={showVehicles} stopsEnabled={showStops} vehiclesEnabled={showVehicles} onLiveStatus={setLive} />
              <div className="map-footer"><div className="legend"><span className="legend-ramp" /> Municipal boundary <span className="legend-stop" /> HSL stop snapshot <span className="legend-vehicle" /> HSL realtime vehicle</div><span className="map-source">Statistics Finland · HSL · OSM</span></div>
            </div>
            <aside className="insight-card">
              <div className="insight-title"><div><span className="card-kicker">WHAT THIS LAYER CAN TELL YOU</span><h2>{city || 'Four-city metro view'}</h2></div><span className="spark-icon">✳</span></div>
              <p className="insight-copy">Static stop locations describe the public transport network’s boarding points. They do not measure service frequency, ridership or journey accessibility.</p>
              <div className="divider" />
              <div className="coverage-title">SOURCE QUALITY <span>{sourcesIntegrated}/{registry.length || '—'}</span></div>
              <Coverage label="Municipal boundaries" status="Observed · 2025" tone="good" />
              <Coverage label="HSL stop locations" status="Observed · static GTFS" tone="good" />
              <Coverage label="HSL vehicle positions" status={liveStatus.status === 'live' ? `Live · ${numberFormat.format(liveStatus.count)} vehicles` : 'Feed unavailable'} tone={liveStatus.status === 'live' ? 'good' : 'warn'} />
              <Coverage label="Building footprints / heights" status="Unavailable locally" tone="empty" />
              <button className="text-link" onClick={() => setView('sources')}>Inspect source lineage <span>→</span></button>
            </aside>
          </section>
          <section className="below-grid"><div className="section-card"><div className="section-header"><div><span className="card-kicker">DATA QUALITY</span><h2>Coverage before interpretation</h2></div><span className="observed-pill">{data.report?.status || 'report unavailable'}</span></div><p className="section-copy">This first integrated slice covers the four core municipalities and HSL boarding points within their official polygons. Population, housing, research, jobs and energy values stay unavailable until a source is integrated.</p>{data.report?.warnings?.map(warning => <p key={warning} className="quality-line">{warning}</p>)}</div><div className="method-card"><span className="card-kicker">METHOD NOTE</span><h2>Observed, then derived.</h2><p>Municipal polygons are official observations. Stop counts are derived by a documented point-in-polygon join. No missing indicator is represented as zero.</p><button className="text-link" onClick={() => setView('sources')}>Explore source registry <span>→</span></button></div></section>
        </>}

        {view === 'twin' && <DigitalTwinPage sources={registry} onDetails={ids => setSourceModal(ids)} />}

        {view === 'mobility' && <section className="feature-page"><div className="feature-heading"><div><span className="card-kicker">HSL · LIVE VS SCHEDULED</span><h2>Live mobility layer</h2><p>Orange markers are current GTFS-Realtime VehiclePosition records from HSL. Blue markers are static GTFS stop locations.</p></div><span className={`live-badge ${liveStatus.status === 'live' ? 'good' : 'pending'}`}>{liveStatus.status === 'live' ? 'LIVE FEED' : liveStatus.status === 'checking' ? 'CHECKING FEED' : liveStatus.status === 'credentials_required' ? 'CREDENTIALS REQUIRED' : 'FEED UNAVAILABLE'}</span></div><div className="map-card"><div className="map-head"><div><div className="card-kicker">MAP VIEW · FILTER BY MUNICIPALITY ABOVE</div><h2>Observed vehicles and scheduled stops</h2></div></div><MapView data={data} city={city} sourceDetails={setSourceModal} liveEnabled onLiveStatus={setLive} /><div className="map-footer"><div className="legend"><span className="legend-stop" /> Static stop <span className="legend-vehicle" /> Live vehicle position</div><span className="map-source">HSL provides positions, trip updates and alerts</span></div></div><div className="realtime-panel"><b>{liveStatus.status === 'live' ? `${numberFormat.format(liveStatus.count)} live VehiclePosition entities · ${numberFormat.format(liveStatus.visible)} positioned records visible in this map` : 'Real-time positions are unavailable from this runtime.'}</b><span>{liveStatus.status === 'live' ? `Provider feed time ${liveStatus.feedTimestamp ? timeFormat.format(new Date(liveStatus.feedTimestamp)) : 'not supplied'} · retrieved ${liveStatus.retrievedAt ? timeFormat.format(new Date(liveStatus.retrievedAt)) : 'unknown'}` : `${liveStatus.error || 'No response yet'} · HTTP ${liveStatus.httpStatus ?? 0} · retrieved ${liveStatus.retrievedAt ? timeFormat.format(new Date(liveStatus.retrievedAt)) : 'unknown'} · static GTFS is not used as a live fallback.`}</span><button onClick={() => setSourceModal(['hsl-gtfs-realtime-vehicles'])}>Feed details & limits ↗</button></div></section>}

        {view === 'climate' && <UnavailablePage title="Climate & Energy" intro="No current climate or building energy observations are loaded into this application." sources={[]} onDetails={ids => setSourceModal(ids)} items={['Weather observations · pending integration', 'Air quality · pending integration', 'Solar / geothermal potential · source identified, dataset not ingested', 'Building energy use · no local records']} />}
        {view === 'innovation' && <UnavailablePage title="Innovation & Research" intro="Institution, publication and company counts are withheld until linked to verifiable Helsinki-area source records." sources={[]} onDetails={ids => setSourceModal(ids)} items={['Universities and labs · pending integration', 'Technology companies and startups · unavailable', 'OpenAlex / Crossref affiliations · pending method review', 'Patents and research funding · pending integration']} />}
        {view === 'services' && <UnavailablePage title="Services & Accessibility" intro="The official Service Map documents unit locations and accessibility fields, but a reusable, bounded dataset snapshot is not yet verified." sources={registry.filter(source => source.id === 'helsinki-service-map')} onDetails={ids => setSourceModal(ids)} items={['Public service points · candidate source', 'Accessibility attributes · candidate source', 'Walking / transit travel time · unavailable', 'Housing cost and professional access · unavailable']} />}

        <footer className="footer"><span>Cerebro Helsinki · Urban Intelligence & Digital Twin</span><span>Versioned open data · <button onClick={() => setView('sources')}>Source lineage</button></span></footer>
      </div>
      {sourceModal && <SourceDetails sources={registry.filter(source => sourceModal.includes(source.id))} onClose={() => setSourceModal(null)} />}
    </main>
  </div>
}

const viewDescriptions = {
  twin: 'An official streamed city model with a clearly bounded geographic footprint.',
  mobility: 'Scheduled stop records and HSL vehicle observations have separate provenance and clocks.',
  climate: 'Environmental observations and model outputs, with uncertainty made visible.',
  innovation: 'Institutional and aggregated research signals across the Helsinki region.',
  services: 'Public facilities, accessibility evidence and urban connectivity.',
}

function Metric({ label, value, unit, note, tone, onInfo }) {
  return <article className="metric-card"><div className={`metric-icon ${tone}`} aria-hidden="true">◈</div><button className="metric-info" aria-label={`Source details for ${label}`} onClick={onInfo}>i</button><div className="metric-label">{label}</div><div className="metric-value">{value}<small>{unit}</small></div><div className="metric-note"><span className="metric-note-dot" />{note}</div></article>
}

function Coverage({ label, status, tone }) { return <div className="coverage-row"><span className={`coverage-dot ${tone}`} />{label}<span className={`status ${tone}`}>{status}</span></div> }

function SourcesPage({ sources, report, loading, onDetails }) {
  if (loading) return <section className="sources-page"><div className="empty-state">Loading the dataset registry…</div></section>
  if (!sources.length) return <section className="sources-page"><div className="empty-state">Source registry unavailable. Numeric indicators stay hidden.</div></section>
  return <section className="sources-page"><div className="sources-intro"><div><span className="card-kicker">DATA GOVERNANCE</span><h2>Sources & method</h2><p>Every integrated layer carries provider, URL, time, geography, license, evidence, confidence, method and limitations.</p></div><div className="source-summary"><b>{sources.filter(source => source.integration_status === 'integrated').length} / {sources.length}</b><span>integrated sources</span></div></div>
    <div className="source-table-wrap"><table className="source-table"><thead><tr><th>Dataset / provider</th><th>Coverage & period</th><th>Evidence / confidence</th><th>License</th><th>Status</th></tr></thead><tbody>{sources.map(source => <tr key={source.id}><td><button className="source-name" onClick={() => onDetails([source.id])}>{source.dataset_name} ↗</button><small>{source.provider}</small><p>{source.transformation}</p><p className="limitation"><b>Limits:</b> {source.limitations}</p>{source.record_count != null && <small>{numberFormat.format(source.record_count)} {source.record_count_context || 'records in the checked-in snapshot'}</small>}<a className="resource-link" href={source.resource_url || source.url} target="_blank" rel="noreferrer">Open source ↗</a></td><td>{source.geographic_coverage}<small>{source.period_covered}</small><small>Consulted {source.consulted_at}</small></td><td><span className="evidence-badge">{EVIDENCE[source.evidence_type] || source.evidence_type}</span><small>{source.confidence} confidence</small></td><td>{source.license}</td><td><span className={`integration-status ${source.integration_status}`}>{source.integration_status.replaceAll('_', ' ')}</span></td></tr>)}</tbody></table></div>
    <div className="quality-note"><span className="quality-icon">!</span><div><b>Data quality · {report?.status || 'unknown'}</b><p>Generated {report?.generated_at || 'date unavailable'}</p>{report?.warnings?.map((warning, index) => <p className="quality-warning" key={`warning-${index}`}>{warning}</p>)}{report?.errors?.map((error, index) => <p className="quality-error" key={`error-${index}`}>{error}</p>)}{report?.notes?.map((note, index) => <p key={`note-${index}`}>{note}</p>)}</div></div>
    <div className="evidence-key"><b>Evidence types</b>{Object.entries(EVIDENCE).map(([key, label]) => <span key={key}><i className={`key-dot ${key}`} />{label}</span>)}</div>
  </section>
}

function DigitalTwinPage({ sources, onDetails }) {
  const twin = sources.find(source => source.id === 'helsinki-3d-model')
  return <section className="digital-twin-page"><div className="feature-heading"><div><span className="card-kicker">HELSINKI 3D · CITY SURVEY SERVICES</span><h2>Official Helsinki 3D City Model</h2><p>Streamed from the City of Helsinki’s model viewer. The source describes a semantic CityGML model and a textured mesh.</p></div><span className="live-badge good">EXTERNAL CITY MODEL</span></div><div className="twin-frame"><iframe src="https://kartta.hel.fi/3d/" title="City of Helsinki 3D city model" loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allow="fullscreen" /><div className="frame-fallback"><span>Viewer unavailable?</span><a href="https://kartta.hel.fi/3d/" target="_blank" rel="noreferrer">Open the official Helsinki 3D viewer ↗</a></div></div><div className="twin-caption"><div><b>Coverage: Helsinki municipality only.</b><span>Espoo, Vantaa and Kauniainen do not have this viewer’s city model. The app does not claim local building geometry or attributes are loaded.</span></div><button className="text-link" onClick={() => onDetails(['helsinki-3d-model'])}>Source, license and model limits ↗</button></div><div className="twin-roadmap"><span>Available now · streamed official model</span><span>Pending · local CityGML ingest, per-building selection and 3D Tiles cache</span><span>Conversion target · viewport-limited tiles, not a whole-city browser download</span></div>{twin?.resource_url && <span className="sr-only">{twin.resource_url}</span>}</section>
}

function UnavailablePage({ title, intro, sources, items, onDetails }) {
  return <section className="unavailable-page"><div className="feature-heading"><div><span className="card-kicker">EVIDENCE STATUS</span><h2>{title}</h2><p>{intro}</p></div><span className="live-badge pending">PARTIAL COVERAGE</span></div><div className="unavailable-grid">{items.map(item => <div className="unavailable-row" key={item}><span className="coverage-dot empty" />{item}<span>Not shown as zero</span></div>)}</div>{sources.map(source => <button className="text-link" key={source.id} onClick={() => onDetails([source.id])}>Inspect {source.dataset_name} source state ↗</button>)}</section>
}

function SourceDetails({ sources, onClose }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}><section className="source-modal" role="dialog" aria-modal="true" aria-labelledby="source-modal-title"><button className="modal-close" aria-label="Close source details" onClick={onClose}>×</button><span className="card-kicker">SOURCE LINEAGE</span><h2 id="source-modal-title">Source, method & limitations</h2>{sources.map(source => <article className="modal-source" key={source.id}><b>{source.dataset_name}</b><dl><dt>Provider</dt><dd>{source.provider}</dd><dt>Period</dt><dd>{source.period_covered}</dd><dt>Geography</dt><dd>{source.geographic_coverage}</dd><dt>Evidence / confidence</dt><dd>{EVIDENCE[source.evidence_type] || source.evidence_type} · {source.confidence}</dd><dt>Consulted</dt><dd>{source.consulted_at}</dd><dt>License</dt><dd>{source.license}</dd><dt>Method</dt><dd>{source.transformation}</dd><dt>Limitations</dt><dd>{source.limitations}</dd><dt>Status</dt><dd>{source.integration_status}</dd></dl><a href={source.resource_url || source.url} target="_blank" rel="noreferrer">Open original source ↗</a></article>)}</section></div>
}

createRoot(document.getElementById('root')).render(<App />)
