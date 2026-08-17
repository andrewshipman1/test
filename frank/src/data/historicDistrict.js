// ─── Historic Districts (standalone) ─────────────────────────────────────────
// Extracted from hooks/useHistoricDistricts.js

const LPC_DISTRICTS_GEOJSON =
  'https://data.cityofnewyork.us/resource/s5zg-yzea.geojson'

// ── Ray-casting point-in-polygon ────────────────────────────────────────────

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
  if (!pointInRing(lng, lat, coords[0])) return false
  for (let h = 1; h < coords.length; h++) {
    if (pointInRing(lng, lat, coords[h])) return false
  }
  return true
}

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

// ── Module-level cache ──────────────────────────────────────────────────────
let _districts = null
let _loading = null

async function loadDistricts() {
  if (_districts) return _districts
  if (_loading) return _loading

  _loading = (async () => {
    const res = await fetch(LPC_DISTRICTS_GEOJSON)
    if (!res.ok) throw new Error(`LPC districts error: ${res.status}`)
    const geojson = await res.json()

    if (!geojson?.features) return []

    _districts = geojson.features.filter(f => {
      const p = f.properties || {}
      const boro = p.borough || p.boro_code || p.borocode || p.boro || ''
      const boroStr = String(boro).toUpperCase()
      return boroStr === '1' || boroStr === 'MN' || boroStr === 'MANHATTAN'
    })

    _loading = null
    return _districts
  })()

  return _loading
}

export async function checkHistoricDistrict(lng, lat) {
  const districts = await loadDistricts()
  return isInHistoricDistrict(lng, lat, districts)
}
