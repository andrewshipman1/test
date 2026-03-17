import { useEffect, useState, useRef, useCallback } from 'react'
import Map, { Source, Layer } from 'react-map-gl/maplibre'
import { fetchParcelPolygons } from '../../data/parcels.js'
import { getFeaturesByBbl } from '../../data/pluto.js'
import 'maplibre-gl/dist/maplibre-gl.css'
import './InlineMap.css'

// ESRI World Imagery — free satellite tiles, no API key
const SATELLITE_STYLE = {
  version: 8,
  sources: {
    'esri-satellite': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution: 'Esri, Maxar, Earthstar Geographics',
    },
  },
  layers: [{ id: 'satellite', type: 'raster', source: 'esri-satellite' }],
}

// Compute bounding box from polygon or point features
function computeBounds(features) {
  let minLng = Infinity, maxLng = -Infinity
  let minLat = Infinity, maxLat = -Infinity

  for (const f of features) {
    const geom = f.geometry
    if (!geom) continue

    if (geom.type === 'Point') {
      const [lng, lat] = geom.coordinates
      minLng = Math.min(minLng, lng)
      maxLng = Math.max(maxLng, lng)
      minLat = Math.min(minLat, lat)
      maxLat = Math.max(maxLat, lat)
    } else if (geom.type === 'Polygon') {
      for (const ring of geom.coordinates) {
        for (const [lng, lat] of ring) {
          minLng = Math.min(minLng, lng)
          maxLng = Math.max(maxLng, lng)
          minLat = Math.min(minLat, lat)
          maxLat = Math.max(maxLat, lat)
        }
      }
    } else if (geom.type === 'MultiPolygon') {
      for (const poly of geom.coordinates) {
        for (const ring of poly) {
          for (const [lng, lat] of ring) {
            minLng = Math.min(minLng, lng)
            maxLng = Math.max(maxLng, lng)
            minLat = Math.min(minLat, lat)
            maxLat = Math.max(maxLat, lat)
          }
        }
      }
    }
  }

  return { minLng, maxLng, minLat, maxLat }
}

export default function InlineMap({ bbls }) {
  const [parcelData, setParcelData] = useState(null)
  const [isFallback, setIsFallback] = useState(false)
  const [highlightedBbl, setHighlightedBbl] = useState(null)
  const [hoveredFeature, setHoveredFeature] = useState(null)
  const [hoverPosition, setHoverPosition] = useState(null)
  const [pulseOpacity, setPulseOpacity] = useState(0.35)
  const mapRef = useRef(null)
  const hasFlewRef = useRef(false)

  // Fetch polygon geometry
  useEffect(() => {
    if (!bbls?.length) return
    hasFlewRef.current = false

    fetchParcelPolygons(bbls).then(result => {
      setParcelData(result)
      setIsFallback(result._fallback || false)
    })
  }, [bbls])

  // Fly-to after data loads and map is ready
  const handleMapLoad = useCallback(() => {
    if (!parcelData?.features?.length || hasFlewRef.current) return
    hasFlewRef.current = true

    const map = mapRef.current?.getMap()
    if (!map) return

    const bounds = computeBounds(parcelData.features)
    const centerLng = (bounds.minLng + bounds.maxLng) / 2
    const centerLat = (bounds.minLat + bounds.maxLat) / 2

    // Delay fly-to so the user sees the animation
    setTimeout(() => {
      if (parcelData.features.length === 1) {
        map.flyTo({
          center: [centerLng, centerLat],
          zoom: 17,
          duration: 1800,
          essential: true,
        })
      } else {
        map.fitBounds(
          [[bounds.minLng, bounds.minLat], [bounds.maxLng, bounds.maxLat]],
          { padding: 60, duration: 1800, maxZoom: 17 }
        )
      }

      // Pulse animation after fly-to completes
      setTimeout(() => {
        let count = 0
        const interval = setInterval(() => {
          setPulseOpacity(prev => (prev === 0.35 ? 0.55 : 0.35))
          count++
          if (count >= 6) {
            clearInterval(interval)
            setPulseOpacity(0.35)
          }
        }, 400)
      }, 1900)
    }, 300)
  }, [parcelData])

  // Click handler — scroll to PropertyCard
  const handleClick = useCallback((e) => {
    if (!e.features?.length) return
    const bbl = e.features[0]?.properties?.bbl
    if (!bbl) return

    setHighlightedBbl(bbl)

    // Scroll to the corresponding PropertyCard
    const card = document.querySelector(`[data-bbl="${bbl}"]`)
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' })
      // Flash the card briefly
      card.classList.add('prop-card-flash')
      setTimeout(() => card.classList.remove('prop-card-flash'), 1200)
    }
  }, [])

  // Hover handlers
  const handleMouseMove = useCallback((e) => {
    if (!e.features?.length) {
      setHoveredFeature(null)
      return
    }
    const props = e.features[0].properties
    setHoveredFeature(props)
    setHoverPosition({ x: e.point.x, y: e.point.y })
  }, [])

  const handleMouseLeave = useCallback(() => {
    setHoveredFeature(null)
  }, [])

  if (!parcelData) {
    return (
      <div className="inline-map-loading">
        <span>Loading map...</span>
      </div>
    )
  }

  // Build fill opacity expression
  const fillOpacity = highlightedBbl
    ? ['case', ['==', ['get', 'bbl'], highlightedBbl], 0.6, pulseOpacity]
    : pulseOpacity

  const lineWidth = highlightedBbl
    ? ['case', ['==', ['get', 'bbl'], highlightedBbl], 3, 2]
    : 2

  return (
    <div className="inline-map">
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: -73.97,
          latitude: 40.78,
          zoom: 12,
        }}
        mapStyle={SATELLITE_STYLE}
        style={{ width: '100%', height: '100%' }}
        attributionControl={false}
        interactive={true}
        scrollZoom={false}
        onLoad={handleMapLoad}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        interactiveLayerIds={isFallback ? ['inline-lots-circle'] : ['inline-lots-fill']}
        cursor={hoveredFeature ? 'pointer' : 'grab'}
      >
        <Source id="inline-lots" type="geojson" data={parcelData}>
          {isFallback ? (
            // Fallback: circle markers for point geometry
            <Layer
              id="inline-lots-circle"
              type="circle"
              paint={{
                'circle-radius': 8,
                'circle-color': 'rgba(139, 46, 34, 0.7)',
                'circle-stroke-width': 2,
                'circle-stroke-color': '#8B2E22',
              }}
            />
          ) : (
            <>
              {/* Polygon fill — oxblood */}
              <Layer
                id="inline-lots-fill"
                type="fill"
                paint={{
                  'fill-color': '#8B2E22',
                  'fill-opacity': fillOpacity,
                }}
              />
              {/* Polygon border — solid oxblood */}
              <Layer
                id="inline-lots-line"
                type="line"
                paint={{
                  'line-color': '#EDE0CC',
                  'line-width': lineWidth,
                  'line-opacity': 0.9,
                }}
              />
            </>
          )}
        </Source>
      </Map>

      {/* Lot count badge */}
      <div className="inline-map-badge">
        {bbls.length} {bbls.length === 1 ? 'LOT' : 'LOTS'}
      </div>

      {/* Hover tooltip */}
      {hoveredFeature && hoverPosition && (
        <div
          className="inline-map-tooltip"
          style={{
            left: hoverPosition.x + 12,
            top: hoverPosition.y - 10,
          }}
        >
          <div className="inline-map-tooltip-address">
            {hoveredFeature.address || 'No address'}
          </div>
          <div className="inline-map-tooltip-bbl">
            {hoveredFeature.bbl}
          </div>
        </div>
      )}
    </div>
  )
}
