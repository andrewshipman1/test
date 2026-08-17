import { useState, useEffect, useRef } from 'react'

const LPC_DISTRICTS_GEOJSON =
  'https://data.cityofnewyork.us/resource/s5zg-yzea.geojson'

// ── Ray-casting point-in-polygon ──────────────────────────────────
function pointInRing(lng, lat, ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1]
    const xj = ring[j][0], yj = ring[j][1]
    if (
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
    ) {
      inside = !inside
    }
  }
  return inside
}

function pointInPolygon(lng, lat, coords) {
  // coords[0] = outer ring, coords[1..n] = holes
  if (!pointInRing(lng, lat, coords[0])) return false
  for (let h = 1; h < coords.length; h++) {
    if (pointInRing(lng, lat, coords[h])) return false // inside a hole
  }
  return true
}

/**
 * Check whether a point falls inside any historic district.
 * @param {number} lng
 * @param {number} lat
 * @param {object[]} districtFeatures - array of GeoJSON features
 * @returns {{ inDistrict: boolean, districtName: string | null }}
 */
export function isInHistoricDistrict(lng, lat, districtFeatures) {
  if (!districtFeatures || districtFeatures.length === 0) {
    return { inDistrict: false, districtName: null }
  }

  for (const feature of districtFeatures) {
    const geom = feature.geometry
    if (!geom) continue

    const name =
      feature.properties?.area_name ||
      feature.properties?.hist_dist ||
      feature.properties?.area_na ||
      feature.properties?.name ||
      'Unknown District'

    if (geom.type === 'Polygon') {
      if (pointInPolygon(lng, lat, geom.coordinates)) {
        return { inDistrict: true, districtName: name }
      }
    } else if (geom.type === 'MultiPolygon') {
      for (const polygon of geom.coordinates) {
        if (pointInPolygon(lng, lat, polygon)) {
          return { inDistrict: true, districtName: name }
        }
      }
    }
  }

  return { inDistrict: false, districtName: null }
}

// ── Hook ──────────────────────────────────────────────────────────
export default function useHistoricDistricts() {
  const [districts, setDistricts] = useState(null)
  const [loading, setLoading]     = useState(false)
  const fetched = useRef(false)

  useEffect(() => {
    if (fetched.current) return
    fetched.current = true

    const controller = new AbortController()
    const { signal } = controller

    async function fetchDistricts() {
      setLoading(true)

      try {
        const res = await fetch(LPC_DISTRICTS_GEOJSON, { signal })
        if (!res.ok) throw new Error(`LPC districts error: ${res.status}`)
        const geojson = await res.json()

        if (!geojson?.features) return

        // Filter to Manhattan (borough code "1" or "MN" or name match)
        const manhattanFeatures = geojson.features.filter((f) => {
          const p = f.properties || {}
          const boro =
            p.borough || p.boro_code || p.borocode || p.boro || ''
          const boroStr = String(boro).toUpperCase()
          return (
            boroStr === '1' ||
            boroStr === 'MN' ||
            boroStr === 'MANHATTAN'
          )
        })

        if (signal.aborted) return

        setDistricts({
          type: 'FeatureCollection',
          features: manhattanFeatures,
        })
      } catch (err) {
        if (err.name === 'AbortError') return
        console.warn('useHistoricDistricts fetch failed:', err.message)
      } finally {
        if (!signal.aborted) setLoading(false)
      }
    }

    fetchDistricts()
    return () => controller.abort()
  }, [])

  return { districts, loading }
}
