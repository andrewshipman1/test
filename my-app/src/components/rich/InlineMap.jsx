import { useEffect, useState, useRef } from 'react'
import Map, { Source, Layer } from 'react-map-gl/maplibre'
import { getFeaturesByBbl } from '../../data/pluto.js'
import 'maplibre-gl/dist/maplibre-gl.css'
import './InlineMap.css'

const BASEMAP = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'

// Score-based color matching MapView
function scoreColor(score) {
  if (score >= 85) return '#C4A06A'
  if (score >= 60) return '#A8824E'
  if (score >= 40) return '#8A8278'
  if (score >= 20) return '#5C5650'
  return '#3A3632'
}

export default function InlineMap({ bbls }) {
  const [features, setFeatures] = useState(null)
  const [viewState, setViewState] = useState(null)
  const mapRef = useRef(null)

  useEffect(() => {
    if (!bbls?.length) return
    getFeaturesByBbl(bbls).then(feats => {
      if (!feats.length) return
      setFeatures({
        type: 'FeatureCollection',
        features: feats.map(f => ({
          ...f,
          properties: {
            ...f.properties,
            _color: scoreColor(f.properties.score),
          }
        })),
      })

      // Compute center from features
      const lngs = feats.map(f => f.geometry.coordinates[0])
      const lats = feats.map(f => f.geometry.coordinates[1])
      const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2
      const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2

      // Zoom based on spread
      const spread = Math.max(
        Math.max(...lngs) - Math.min(...lngs),
        Math.max(...lats) - Math.min(...lats)
      )
      const zoom = spread > 0.01 ? 13 : spread > 0.005 ? 14 : spread > 0.002 ? 15 : 16

      setViewState({
        longitude: centerLng,
        latitude: centerLat,
        zoom,
      })
    })
  }, [bbls])

  if (!features || !viewState) {
    return (
      <div className="inline-map-loading">
        <span>Loading map...</span>
      </div>
    )
  }

  return (
    <div className="inline-map">
      <Map
        ref={mapRef}
        {...viewState}
        onMove={e => setViewState(e.viewState)}
        mapStyle={BASEMAP}
        style={{ width: '100%', height: '100%' }}
        attributionControl={false}
        interactive={true}
        scrollZoom={false}
      >
        <Source id="inline-lots" type="geojson" data={features}>
          <Layer
            id="inline-lots-circle"
            type="circle"
            paint={{
              'circle-radius': 7,
              'circle-color': ['get', '_color'],
              'circle-opacity': 0.9,
              'circle-stroke-width': 1.5,
              'circle-stroke-color': '#C4A06A',
              'circle-stroke-opacity': 0.8,
            }}
          />
        </Source>
      </Map>
      <div className="inline-map-badge">
        {bbls.length} {bbls.length === 1 ? 'LOT' : 'LOTS'}
      </div>
    </div>
  )
}
