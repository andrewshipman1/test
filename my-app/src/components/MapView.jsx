import { useRef, useCallback, useState, useEffect } from 'react'
import Map, { Source, Layer, NavigationControl, ScaleControl, Marker, Popup } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { usePlutoData } from '../hooks/usePlutoData'
import { MapPin } from 'lucide-react'
import CoachMarks from './CoachMarks'
import './MapView.css'

// Pipeline layer — New Building (teal)
const pipelineNbLayer = {
  id: 'pipeline-nb',
  type: 'circle',
  filter: ['==', ['get', 'type'], 'NB'],
  paint: {
    'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 4, 14, 8, 16, 13],
    'circle-color': '#22d3ee',
    'circle-opacity': 0.9,
    'circle-stroke-width': 1.5,
    'circle-stroke-color': '#ffffff',
  },
}

// Pipeline layer — Demolition (orange)
const pipelineDmLayer = {
  id: 'pipeline-dm',
  type: 'circle',
  filter: ['==', ['get', 'type'], 'DM'],
  paint: {
    'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 4, 14, 8, 16, 13],
    'circle-color': '#f97316',
    'circle-opacity': 0.9,
    'circle-stroke-width': 1.5,
    'circle-stroke-color': '#ffffff',
  },
}

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'

// Main lots layer — opacity is dimmed when pipeline mode is active
function makeLotCircleLayer(dimmed) {
  return {
    id: 'tax-lots-circle',
    type: 'circle',
    filter: ['!=', ['get', 'city_of_yes'], true],
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, dimmed ? 2 : 3, 14, dimmed ? 4 : 6, 16, dimmed ? 7 : 10],
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
        ['boolean', ['feature-state', 'selected'], false], dimmed ? 0.6 : 1.0,
        ['boolean', ['feature-state', 'hover'], false],   dimmed ? 0.5 : 0.95,
        dimmed ? 0.2 : 0.75
      ],
      'circle-stroke-width': [
        'case',
        ['boolean', ['feature-state', 'selected'], false], 2,
        ['boolean', ['feature-state', 'hover'], false], 1.5,
        dimmed ? 0 : 0.5
      ],
      'circle-stroke-color': [
        'case',
        ['boolean', ['feature-state', 'selected'], false], '#f59e0b',
        '#ffffff44'
      ]
    }
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
  searchTarget,
  pipelineData,
  showPipeline,
  onTogglePipeline,
  allFeaturesCount = 0,
}) {
  const mapRef = useRef(null)
  const [cursor, setCursor] = useState('grab')
  const [hoveredId, setHoveredId] = useState(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [pipelinePopup, setPipelinePopup] = useState(null)

  // Fly to searched location
  useEffect(() => {
    if (!searchTarget || !mapRef.current) return
    const map = mapRef.current.getMap()
    map.flyTo({
      center: [searchTarget.lng, searchTarget.lat],
      zoom:     searchTarget.zoom ?? 16,
      duration: searchTarget.zoom ? 1400 : 1800,
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

    // Check pipeline dots first (they sit on top)
    if (showPipeline) {
      const pipelineFeatures = map.queryRenderedFeatures(event.point, {
        layers: ['pipeline-nb', 'pipeline-dm'],
      })
      if (pipelineFeatures.length > 0) {
        const props = pipelineFeatures[0].properties
        setPipelinePopup({
          lng: event.lngLat.lng,
          lat: event.lngLat.lat,
          ...props,
        })
        return
      }
    }

    // Close any open pipeline popup when clicking elsewhere
    setPipelinePopup(null)

    const features = map.queryRenderedFeatures(event.point, {
      layers: ['tax-lots-circle', 'coy-lots-circle'],
    })
    if (features.length > 0) {
      const props = features[0].properties
      const signals = marketSignals?.[props.bbl] || []
      setSelectedProperty({ ...props, market_signals: signals })
    }
  }, [setSelectedProperty, marketSignals, showPipeline])

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
          <Layer {...makeLotCircleLayer(showPipeline)} />
          <Layer {...coyCircleLayer} />
        </Source>

        {/* Pipeline overlay — NB (teal) and DM (orange) dots */}
        {showPipeline && pipelineData && (
          <Source id="pipeline" type="geojson" data={pipelineData}>
            <Layer {...pipelineNbLayer} />
            <Layer {...pipelineDmLayer} />
          </Source>
        )}

        {/* Pipeline popup */}
        {pipelinePopup && (
          <Popup
            longitude={pipelinePopup.lng}
            latitude={pipelinePopup.lat}
            anchor="bottom"
            onClose={() => setPipelinePopup(null)}
            closeOnClick={false}
          >
            <div className="pipeline-popup-content">
              <div className={`pipeline-popup-badge ${pipelinePopup.type === 'NB' ? 'pipeline-nb' : 'pipeline-dm'}`}>
                {pipelinePopup.type === 'NB' ? 'New Building' : 'Demolition'}
              </div>
              <div className="pipeline-popup-address">{pipelinePopup.address}</div>
              {pipelinePopup.filingDate && (
                <div className="pipeline-popup-meta">
                  Filed {new Date(pipelinePopup.filingDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </div>
              )}
              {pipelinePopup.cost && (
                <div className="pipeline-popup-cost">{pipelinePopup.cost}</div>
              )}
              {pipelinePopup.description && (
                <div className="pipeline-popup-desc">{pipelinePopup.description}</div>
              )}
            </div>
          </Popup>
        )}

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
            <span className="map-stat-label">
              {allFeaturesCount > 0 && stats.total < allFeaturesCount ? 'Matching' : 'Lots Shown'}
            </span>
            {allFeaturesCount > 0 && stats.total < allFeaturesCount && (
              <span className="map-stat-subtext">of {allFeaturesCount.toLocaleString()}</span>
            )}
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

      {/* First-run coach marks */}
      <CoachMarks />
    </div>
  )
}
