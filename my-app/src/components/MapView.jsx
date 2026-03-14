import { useRef, useCallback, useState, useEffect } from 'react'
import Map, { Source, Layer, NavigationControl, ScaleControl, Marker } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { usePlutoData } from '../hooks/usePlutoData'
import { MapPin } from 'lucide-react'
import './MapView.css'

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'

// Main lots layer colored by opportunity score
const lotCircleLayer = {
  id: 'tax-lots-circle',
  type: 'circle',
  filter: ['!=', ['get', 'city_of_yes'], true],
  paint: {
    'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 3, 14, 6, 16, 10],
    'circle-color': [
      'case',
      ['==', ['get', 'land_use'], '11'], '#22c55e',
      ['>=', ['get', 'score'], 80], '#ef4444',
      ['>=', ['get', 'score'], 60], '#f97316',
      ['>=', ['get', 'score'], 40], '#f59e0b',
      ['>=', ['get', 'score'], 20], '#eab308',
      '#3a3a5a'
    ],
    'circle-opacity': [
      'case',
      ['boolean', ['feature-state', 'selected'], false], 1.0,
      ['boolean', ['feature-state', 'hover'], false], 0.95,
      0.75
    ],
    'circle-stroke-width': [
      'case',
      ['boolean', ['feature-state', 'selected'], false], 2,
      ['boolean', ['feature-state', 'hover'], false], 1.5,
      0.5
    ],
    'circle-stroke-color': [
      'case',
      ['boolean', ['feature-state', 'selected'], false], '#f59e0b',
      '#ffffff44'
    ]
  }
}

// City of Yes lots — highlighted with pulsing ring effect
const coyCircleLayer = {
  id: 'coy-lots-circle',
  type: 'circle',
  filter: ['==', ['get', 'city_of_yes'], true],
  paint: {
    'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 4, 14, 7, 16, 12],
    'circle-color': [
      'case',
      ['==', ['get', 'coy_primary'], 'UAP'], '#8b5cf6',
      ['==', ['get', 'coy_primary'], 'TOD'], '#06b6d4',
      ['==', ['get', 'coy_primary'], 'OTR'], '#f97316',
      ['==', ['get', 'coy_primary'], 'R11R12'], '#ec4899',
      '#f59e0b'
    ],
    'circle-opacity': [
      'case',
      ['boolean', ['feature-state', 'selected'], false], 1.0,
      ['boolean', ['feature-state', 'hover'], false], 0.95,
      0.85
    ],
    'circle-stroke-width': [
      'case',
      ['boolean', ['feature-state', 'selected'], false], 2.5,
      ['boolean', ['feature-state', 'hover'], false], 2,
      1.5
    ],
    'circle-stroke-color': [
      'case',
      ['boolean', ['feature-state', 'selected'], false], '#ffffff',
      '#ffffff66'
    ]
  }
}

export default function MapView({
  filters,
  selectedProperty,
  setSelectedProperty,
  assemblageLots,
  marketSignals,
  onZoningDistrictsLoaded,
  onFeaturesLoaded,
  searchTarget
}) {
  const mapRef = useRef(null)
  const [cursor, setCursor] = useState('grab')
  const [hoveredId, setHoveredId] = useState(null)
  const [mapLoaded, setMapLoaded] = useState(false)

  // Fly to searched location
  useEffect(() => {
    if (!searchTarget || !mapRef.current) return
    const map = mapRef.current.getMap()
    map.flyTo({
      center: [searchTarget.lng, searchTarget.lat],
      zoom: 16,
      duration: 1800,
      essential: true
    })
  }, [searchTarget])

  const { data: plutoData, allFeatures, loading: dataLoading, stats, zoningDistricts } = usePlutoData(filters)

  // Pass zoning districts up to App when loaded
  useEffect(() => {
    if (zoningDistricts.length > 0 && onZoningDistrictsLoaded) {
      onZoningDistrictsLoaded(zoningDistricts)
    }
  }, [zoningDistricts, onZoningDistrictsLoaded])

  // Hoist allFeatures to App once data arrives
  useEffect(() => {
    if (allFeatures.length > 0 && onFeaturesLoaded) {
      onFeaturesLoaded(allFeatures)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allFeatures.length])

  const handleMapLoad = useCallback(() => setMapLoaded(true), [])

  const handleMouseMove = useCallback((event) => {
    const map = mapRef.current?.getMap()
    if (!map) return
    const features = map.queryRenderedFeatures(event.point, {
      layers: ['tax-lots-circle', 'coy-lots-circle']
    })
    if (features.length > 0) {
      setCursor('pointer')
      const feature = features[0]
      if (hoveredId !== null) {
        map.setFeatureState({ source: 'tax-lots', id: hoveredId }, { hover: false })
      }
      setHoveredId(feature.id)
      map.setFeatureState({ source: 'tax-lots', id: feature.id }, { hover: true })
    } else {
      setCursor('grab')
      if (hoveredId !== null) {
        map.setFeatureState({ source: 'tax-lots', id: hoveredId }, { hover: false })
        setHoveredId(null)
      }
    }
  }, [hoveredId])

  const handleClick = useCallback((event) => {
    const map = mapRef.current?.getMap()
    if (!map) return
    const features = map.queryRenderedFeatures(event.point, {
      layers: ['tax-lots-circle', 'coy-lots-circle']
    })
    if (features.length > 0) {
      const props = features[0].properties
      // Attach market signals if available
      const signals = marketSignals?.[props.bbl] || []
      setSelectedProperty({ ...props, market_signals: signals })
    }
  }, [setSelectedProperty, marketSignals])

  const emptyData = { type: 'FeatureCollection', features: [] }

  return (
    <div className="map-container">
      <Map
        ref={mapRef}
        initialViewState={{ longitude: -73.9712, latitude: 40.7831, zoom: 13 }}
        style={{ width: '100%', height: '100%' }}
        mapStyle={MAP_STYLE}
        cursor={cursor}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        onLoad={handleMapLoad}
        interactiveLayerIds={['tax-lots-circle', 'coy-lots-circle']}
      >
        <NavigationControl position="top-right" />
        <ScaleControl position="bottom-right" />

        <Source id="tax-lots" type="geojson" data={plutoData || emptyData}>
          <Layer {...lotCircleLayer} />
          <Layer {...coyCircleLayer} />
        </Source>

        {/* Search result pin */}
        {searchTarget && (
          <Marker longitude={searchTarget.lng} latitude={searchTarget.lat} anchor="bottom">
            <div className="search-pin">
              <MapPin size={28} color="#f59e0b" fill="#f59e0b" />
              <div className="search-pin-label">{searchTarget.label}</div>
            </div>
          </Marker>
        )}
      </Map>

      {/* Legend */}
      <div className="map-legend">
        <div className="legend-title">Opportunity Score</div>
        {[
          { color: '#ef4444', label: 'Very High (80+)' },
          { color: '#f97316', label: 'High (60–80)' },
          { color: '#f59e0b', label: 'Medium (40–60)' },
          { color: '#eab308', label: 'Low (20–40)' },
          { color: '#22c55e', label: 'Vacant Land' },
          { color: '#3a3a5a', label: 'Fully Built' },
        ].map(item => (
          <div key={item.label} className="legend-item">
            <div className="legend-dot" style={{ background: item.color }} />
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      {/* Stats bar */}
      {!dataLoading && plutoData && (
        <div className="map-stats-bar">
          <div className="map-stat">
            <span className="map-stat-val">{stats.total.toLocaleString()}</span>
            <span className="map-stat-label">Lots Shown</span>
          </div>
          <div className="map-stat-divider" />
          <div className="map-stat">
            <span className="map-stat-val" style={{ color: '#f97316' }}>{stats.highOpportunity.toLocaleString()}</span>
            <span className="map-stat-label">High Opportunity</span>
          </div>
          <div className="map-stat-divider" />
          <div className="map-stat">
            <span className="map-stat-val" style={{ color: '#22c55e' }}>{stats.vacant?.toLocaleString()}</span>
            <span className="map-stat-label">Vacant Lots</span>
          </div>
          <div className="map-stat-divider" />
          <div className="map-stat">
            <span className="map-stat-val">Manhattan</span>
            <span className="map-stat-label">Coverage</span>
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {(dataLoading || !mapLoaded) && (
        <div className="map-loading">
          <div className="loading-spinner" />
          <span>{!mapLoaded ? 'Loading map...' : 'Fetching NYC PLUTO + City of Yes data...'}</span>
        </div>
      )}

      {/* Assemblage indicator */}
      {assemblageLots?.length > 0 && (
        <div className="assemblage-indicator">
          <span className="assemblage-count">{assemblageLots.length}</span>
          lots in assemblage
        </div>
      )}
    </div>
  )
}
