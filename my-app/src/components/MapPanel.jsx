import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import Map, { Source, Layer, NavigationControl } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { usePlutoData } from '../hooks/usePlutoData'
import './MapPanel.css'

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'

// Lot circle layer — all tax lots
const lotCircleLayer = {
  id: 'tax-lots-circle',
  type: 'circle',
  paint: {
    'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 1.5, 13, 3, 14, 5, 16, 8],
    'circle-color': [
      'case',
      ['==', ['get', 'land_use'], '11'], '#8E9E8A',
      ['>=', ['get', 'score'], 85], '#C4A06A',
      ['>=', ['get', 'score'], 60], '#A8824E',
      ['>=', ['get', 'score'], 40], '#8A8278',
      ['>=', ['get', 'score'], 20], '#5C5650',
      '#3A3632'
    ],
    'circle-opacity': [
      'case',
      ['boolean', ['feature-state', 'hover'], false], 0.95,
      0.7
    ],
    'circle-stroke-width': [
      'case',
      ['boolean', ['feature-state', 'hover'], false], 1.5,
      0.3
    ],
    'circle-stroke-color': '#ffffff22',
  }
}

// Highlighted lots layer — BBLs from chat results
const highlightCircleLayer = {
  id: 'highlighted-lots',
  type: 'circle',
  paint: {
    'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 4, 13, 6, 14, 8, 16, 12],
    'circle-color': '#8B2E22',
    'circle-opacity': 0.9,
    'circle-stroke-width': 2.5,
    'circle-stroke-color': '#EDE0CC',
  }
}

const DEFAULT_FILTERS = {
  minOpportunityScore: 0,
  dealType: 'all',
  neighborhood: 'all',
  zoningType: 'all',
  minBuildableSF: 0,
}

export default function MapPanel({ highlightedBbls = [], mapTarget = null }) {
  const mapRef = useRef(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [hoveredId, setHoveredId] = useState(null)
  const [cursor, setCursor] = useState('grab')
  const prevBblsRef = useRef([])
  const prevTargetRef = useRef(null)

  const { data: plutoData, loading } = usePlutoData(DEFAULT_FILTERS)

  const emptyData = useMemo(() => ({ type: 'FeatureCollection', features: [] }), [])

  // Build highlighted features GeoJSON from BBLs
  const highlightData = useMemo(() => {
    if (!highlightedBbls.length || !plutoData?.features) return emptyData
    const bblSet = new Set(highlightedBbls.map(String))
    const features = plutoData.features.filter(f => bblSet.has(String(f.properties.bbl)))
    return { type: 'FeatureCollection', features }
  }, [highlightedBbls, plutoData, emptyData])

  // Fly to neighborhood target (from user query parsing)
  useEffect(() => {
    if (!mapLoaded || !mapTarget) return
    if (mapTarget._ts === prevTargetRef.current) return
    prevTargetRef.current = mapTarget._ts

    const map = mapRef.current?.getMap()
    if (!map) return

    map.flyTo({
      center: [mapTarget.lng, mapTarget.lat],
      zoom: mapTarget.zoom || 14,
      duration: 1200,
      essential: true,
    })
  }, [mapTarget, mapLoaded])

  // Fly to highlighted lots when they change (overrides neighborhood fly-to)
  useEffect(() => {
    if (!mapLoaded || !highlightData.features.length) return
    const key = highlightedBbls.join(',')
    const prevKey = prevBblsRef.current.join(',')
    if (key === prevKey) return
    prevBblsRef.current = highlightedBbls

    const map = mapRef.current?.getMap()
    if (!map) return

    const coords = highlightData.features.map(f => f.geometry.coordinates)
    if (coords.length === 1) {
      map.flyTo({
        center: coords[0],
        zoom: 16,
        duration: 1400,
        essential: true,
      })
    } else {
      let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity
      for (const [lng, lat] of coords) {
        minLng = Math.min(minLng, lng)
        maxLng = Math.max(maxLng, lng)
        minLat = Math.min(minLat, lat)
        maxLat = Math.max(maxLat, lat)
      }
      map.fitBounds(
        [[minLng, minLat], [maxLng, maxLat]],
        { padding: 80, duration: 1400, maxZoom: 16 }
      )
    }
  }, [highlightData, highlightedBbls, mapLoaded])

  const handleMouseMove = useCallback((e) => {
    const map = mapRef.current?.getMap()
    if (!map) return
    const features = map.queryRenderedFeatures(e.point, {
      layers: ['tax-lots-circle', 'highlighted-lots']
    })
    if (features.length > 0) {
      setCursor('pointer')
      const feature = features[0]
      if (hoveredId !== null && hoveredId !== feature.id) {
        map.setFeatureState({ source: 'tax-lots', id: hoveredId }, { hover: false })
      }
      if (feature.source === 'tax-lots') {
        setHoveredId(feature.id)
        map.setFeatureState({ source: 'tax-lots', id: feature.id }, { hover: true })
      }
    } else {
      setCursor('grab')
      if (hoveredId !== null) {
        map.setFeatureState({ source: 'tax-lots', id: hoveredId }, { hover: false })
        setHoveredId(null)
      }
    }
  }, [hoveredId])

  return (
    <div className="map-panel-container">
      <Map
        ref={mapRef}
        initialViewState={{ longitude: -73.9712, latitude: 40.7831, zoom: 13 }}
        style={{ width: '100%', height: '100%' }}
        mapStyle={MAP_STYLE}
        cursor={cursor}
        onMouseMove={handleMouseMove}
        onLoad={() => setMapLoaded(true)}
        interactiveLayerIds={['tax-lots-circle', 'highlighted-lots']}
      >
        <NavigationControl position="top-right" />

        {/* All Manhattan lots */}
        <Source id="tax-lots" type="geojson" data={plutoData || emptyData}>
          <Layer {...lotCircleLayer} />
        </Source>

        {/* Highlighted lots from chat */}
        <Source id="highlighted-lots" type="geojson" data={highlightData}>
          <Layer {...highlightCircleLayer} />
        </Source>
      </Map>

      {/* Legend */}
      <div className="map-panel-legend">
        <div className="map-panel-legend-title">Score</div>
        {[
          { color: '#C4A06A', label: '85+' },
          { color: '#A8824E', label: '60–85' },
          { color: '#8A8278', label: '40–60' },
          { color: '#5C5650', label: '20–40' },
          { color: '#8E9E8A', label: 'Vacant' },
        ].map(item => (
          <div key={item.label} className="map-panel-legend-item">
            <div className="map-panel-legend-dot" style={{ background: item.color }} />
            <span>{item.label}</span>
          </div>
        ))}
        {highlightedBbls.length > 0 && (
          <>
            <div className="map-panel-legend-divider" />
            <div className="map-panel-legend-item">
              <div className="map-panel-legend-dot" style={{ background: '#8B2E22', border: '1.5px solid #EDE0CC' }} />
              <span>Results</span>
            </div>
          </>
        )}
      </div>

      {/* Stats */}
      {!loading && plutoData && (
        <div className="map-panel-stats">
          <span className="map-panel-stat-val">{plutoData.features.length.toLocaleString()}</span>
          <span className="map-panel-stat-label">lots</span>
          {highlightedBbls.length > 0 && (
            <>
              <span className="map-panel-stat-sep">·</span>
              <span className="map-panel-stat-val" style={{ color: '#8B2E22' }}>{highlightedBbls.length}</span>
              <span className="map-panel-stat-label">results</span>
            </>
          )}
        </div>
      )}

      {/* Loading */}
      {(loading || !mapLoaded) && (
        <div className="map-panel-loading">
          <div className="map-panel-spinner" />
          <span>{!mapLoaded ? 'Loading map...' : 'Loading Manhattan lots...'}</span>
        </div>
      )}
    </div>
  )
}
