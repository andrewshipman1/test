import { useRef, useCallback, useState, useEffect } from 'react'
import Map, { Source, Layer, NavigationControl, ScaleControl, Marker } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { usePlutoData } from '../hooks/usePlutoData'
import useHistoricDistricts, { isInHistoricDistrict } from '../hooks/useHistoricDistricts'
// Parcel brand — no MapPin icon, use bronze crosshair
import CoachMarks from './CoachMarks'
import './MapView.css'

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'

// Main lots layer
const lotCircleLayer = {
  id: 'tax-lots-circle',
  type: 'circle',
  filter: ['!=', ['get', 'city_of_yes'], true],
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
      ['boolean', ['feature-state', 'selected'], false], '#C4A06A',
      '#ffffff22'
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
      ['==', ['get', 'coy_primary'], 'UAP'], '#D4CCC1',
      ['==', ['get', 'coy_primary'], 'TOD'], '#8A8278',
      ['==', ['get', 'coy_primary'], 'OTR'], '#A8824E',
      ['==', ['get', 'coy_primary'], 'R11R12'], '#5C5650',
      '#C4A06A'
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
  allFeaturesCount = 0,
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
      zoom:     searchTarget.zoom ?? 16,
      duration: searchTarget.zoom ? 1400 : 1800,
      essential: true
    })
  }, [searchTarget])

  const { data: plutoData, allFeatures, loading: dataLoading, stats, zoningDistricts } = usePlutoData(filters)
  const { districts: historicGeoJson } = useHistoricDistricts()
  const historicDistricts = historicGeoJson?.features || []

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
      layers: ['tax-lots-circle', 'coy-lots-circle'],
    })
    if (features.length > 0) {
      const props = { ...features[0].properties }
      const signals = marketSignals?.[props.bbl] || []

      // Check if property is in a historic district
      if (historicDistricts?.length > 0 && props.longitude && props.latitude) {
        const hd = isInHistoricDistrict(props.longitude, props.latitude, historicDistricts)
        if (hd.inDistrict) {
          props.has_landmark = true
          props.landmark_name = hd.districtName || 'Historic District'
        }
      }

      setSelectedProperty({ ...props, market_signals: signals })
    }
  }, [setSelectedProperty, marketSignals, historicDistricts])

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

        {/* Historic district overlay — subtle border only */}
        {historicGeoJson && (
          <Source id="historic-districts" type="geojson" data={historicGeoJson}>
            <Layer
              id="historic-districts-fill"
              type="fill"
              paint={{
                'fill-color': '#8A8278',
                'fill-opacity': 0.04,
              }}
            />
            <Layer
              id="historic-districts-line"
              type="line"
              paint={{
                'line-color': '#8A8278',
                'line-width': 1,
                'line-dasharray': [3, 2],
                'line-opacity': 0.5,
              }}
            />
          </Source>
        )}

        <Source id="tax-lots" type="geojson" data={plutoData || emptyData}>
          <Layer {...lotCircleLayer} />
          <Layer {...coyCircleLayer} />
        </Source>

        {/* Search result pin */}
        {searchTarget && (
          <Marker longitude={searchTarget.lng} latitude={searchTarget.lat} anchor="bottom">
            <div className="search-pin">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <rect x="0.5" y="0.5" width="23" height="23" stroke="#C4A06A" strokeWidth="1.25" fill="none"/>
                <rect x="3" y="3" width="18" height="18" stroke="#C4A06A" strokeWidth="0.4" fill="none"/>
                <circle cx="12" cy="10" r="1.75" fill="none" stroke="#C4A06A" strokeWidth="1"/>
                <circle cx="12" cy="10" r="0.7" fill="#C4A06A"/>
              </svg>
              <div className="search-pin-label">{searchTarget.label}</div>
            </div>
          </Marker>
        )}
      </Map>

      {/* Legend */}
      <div className="map-legend">
        <div className="legend-title">Acquisition Score</div>
        {[
          { color: '#C4A06A', label: 'Signal (85+)' },
          { color: '#A8824E', label: 'High (60–85)' },
          { color: '#8A8278', label: 'Medium (40–60)' },
          { color: '#5C5650', label: 'Low (20–40)' },
          { color: '#8E9E8A', label: 'Vacant' },
          { color: '#3A3632', label: 'Fully Built' },
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
            <span className="map-stat-val" style={{ color: '#C4A06A' }}>{stats.highOpportunity.toLocaleString()}</span>
            <span className="map-stat-label">Score 85+</span>
          </div>
          <div className="map-stat-divider" />
          <div className="map-stat">
            <span className="map-stat-val" style={{ color: '#8E9E8A' }}>{stats.vacant?.toLocaleString()}</span>
            <span className="map-stat-label">Vacant</span>
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
          <span>{!mapLoaded ? 'Loading map...' : 'Loading all Manhattan tax lots...'}</span>
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
