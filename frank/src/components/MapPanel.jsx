import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import Map, { Source, Layer, NavigationControl, Popup } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { usePlutoData } from '../hooks/usePlutoData'
import useHistoricDistricts, { isInHistoricDistrict } from '../hooks/useHistoricDistricts'
import { findNearestLot } from '../utils/spatialLookup'
import './MapPanel.css'

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'

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

export default function MapPanel({ highlightedBbls = [], mapTarget = null, onLotClick = null, selectedBbl = null }) {
  const mapRef = useRef(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [popup, setPopup] = useState(null)
  const prevBblsRef = useRef([])
  const prevTargetRef = useRef(null)

  const { data: plutoData, allFeatures, loading } = usePlutoData(DEFAULT_FILTERS)
  const { districts: historicGeoJson } = useHistoricDistricts()
  const historicDistricts = historicGeoJson?.features || []

  const emptyData = useMemo(() => ({ type: 'FeatureCollection', features: [] }), [])

  // Build highlighted features GeoJSON from BBLs
  const highlightData = useMemo(() => {
    if (!highlightedBbls.length || !allFeatures?.length) return emptyData
    const bblSet = new Set(highlightedBbls.map(String))
    const features = allFeatures.filter(f => bblSet.has(String(f.properties.bbl)))
    return { type: 'FeatureCollection', features }
  }, [highlightedBbls, allFeatures, emptyData])

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

  // Fly to highlighted lots when they change
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

  // Fly to selected BBL (from chat card click)
  useEffect(() => {
    if (!mapLoaded || !selectedBbl || !allFeatures?.length) return
    const map = mapRef.current?.getMap()
    if (!map) return
    const feature = allFeatures.find(f => String(f.properties.bbl) === String(selectedBbl))
    if (feature) {
      map.flyTo({
        center: feature.geometry.coordinates,
        zoom: 17,
        duration: 1200,
        essential: true,
      })
    }
  }, [selectedBbl, mapLoaded, allFeatures])

  // Handle map click — spatial lookup to nearest PLUTO lot
  const handleClick = useCallback((e) => {
    if (!allFeatures?.length) return

    // First check if a highlighted lot was clicked directly
    const map = mapRef.current?.getMap()
    if (map) {
      const hitHighlights = map.queryRenderedFeatures(e.point, { layers: ['highlighted-lots'] })
      if (hitHighlights.length > 0) {
        const f = hitHighlights[0]
        const bbl = String(f.properties?.bbl || '')
        const coords = f.geometry?.coordinates || [e.lngLat.lng, e.lngLat.lat]
        setPopup({
          lng: coords[0], lat: coords[1], bbl,
          address: f.properties?.address || 'Unknown',
          score: f.properties?.score,
          zone: f.properties?.zone_dist || '',
          isHighlighted: true,
        })
        if (onLotClick) onLotClick(bbl)
        return
      }
    }

    // Spatial lookup: find nearest PLUTO lot within 50m
    const nearest = findNearestLot(e.lngLat, allFeatures, 50)
    if (nearest) {
      const p = nearest.properties
      const coords = nearest.geometry.coordinates
      const bbl = String(p.bbl)

      // Check if in historic district
      let landmark = null
      if (historicDistricts.length > 0) {
        const hd = isInHistoricDistrict(coords[0], coords[1], historicDistricts)
        if (hd.inDistrict) landmark = hd.districtName
      }

      setPopup({
        lng: coords[0], lat: coords[1], bbl,
        address: p.address || 'Unknown',
        score: p.score,
        zone: p.zone_dist || '',
        retail_area: p.retail_area || 0,
        landmark,
        isHighlighted: highlightedBbls.includes(bbl),
      })
      if (onLotClick) onLotClick(bbl)
    } else {
      setPopup(null)
    }
  }, [allFeatures, onLotClick, highlightedBbls, historicDistricts])

  return (
    <div className="map-panel-container">
      <Map
        ref={mapRef}
        initialViewState={{ longitude: -73.9712, latitude: 40.7831, zoom: 13 }}
        style={{ width: '100%', height: '100%' }}
        mapStyle={MAP_STYLE}
        cursor="crosshair"
        onClick={handleClick}
        onLoad={() => setMapLoaded(true)}
        interactiveLayerIds={['highlighted-lots']}
      >
        <NavigationControl position="top-right" />

        {/* Historic district overlay — subtle border only */}
        {historicGeoJson && (
          <Source id="historic-districts" type="geojson" data={historicGeoJson}>
            <Layer
              id="historic-districts-fill"
              type="fill"
              paint={{
                'fill-color': '#8A8278',
                'fill-opacity': 0.02,
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

        {/* Highlighted lots from chat */}
        <Source id="highlighted-lots" type="geojson" data={highlightData}>
          <Layer {...highlightCircleLayer} />
        </Source>

        {/* Click popup */}
        {popup && (
          <Popup
            longitude={popup.lng}
            latitude={popup.lat}
            anchor="bottom"
            closeOnClick={false}
            onClose={() => setPopup(null)}
            className="map-popup"
          >
            <div className="map-popup-address">{popup.address}</div>
            <div className="map-popup-meta">
              <span className="map-popup-bbl">{popup.bbl}</span>
              {popup.zone && <span className="map-popup-zone">{popup.zone}</span>}
              {popup.score != null && <span className="map-popup-score">Score: {popup.score}</span>}
            </div>
            {popup.landmark && (
              <div className="map-popup-landmark">{popup.landmark}</div>
            )}
            {popup.retail_area > 0 && (
              <div className="map-popup-retail">Retail: {popup.retail_area.toLocaleString()} SF</div>
            )}
            {popup.isHighlighted && (
              <div className="map-popup-hint">↙ View in chat</div>
            )}
          </Popup>
        )}
      </Map>

      {/* Legend */}
      {(highlightedBbls.length > 0 || historicGeoJson) && (
        <div className="map-panel-legend">
          {historicGeoJson && (
            <div className="map-panel-legend-item">
              <div className="map-panel-legend-dot" style={{ background: 'transparent', border: '1px dashed #8A8278' }} />
              <span>Historic district</span>
            </div>
          )}
          {highlightedBbls.length > 0 && (
            <div className="map-panel-legend-item">
              <div className="map-panel-legend-dot" style={{ background: '#8B2E22', border: '1.5px solid #EDE0CC' }} />
              <span>Results</span>
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      {!loading && allFeatures?.length > 0 && (
        <div className="map-panel-stats">
          <span className="map-panel-stat-val">{allFeatures.length.toLocaleString()}</span>
          <span className="map-panel-stat-label">lots indexed</span>
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
