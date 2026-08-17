// ─── Parcel Polygon Fetcher ──────────────────────────────────────────────────
// Fetches MapPLUTO lot geometry (polygons) by BBL from NYC Open Data.
// Module-level cache so repeated lookups for the same BBL skip the network.

import { getFeaturesByBbl } from './pluto.js'

const MAPPLUTO_GEOJSON = 'https://data.cityofnewyork.us/resource/evjd-dqpz.geojson'

// ── Module-level cache keyed by BBL ────────────────────────────────────────
const _cache = new Map()

function normalizeBbl(bbl) {
  return String(Math.round(Number(bbl))).padStart(10, '0')
}

/**
 * Fetch parcel polygon geometry for 1-3 BBLs.
 * Returns a GeoJSON FeatureCollection with MultiPolygon/Polygon geometries.
 * Falls back to point features from PLUTO cache if the API fails.
 */
export async function fetchParcelPolygons(bbls) {
  if (!bbls?.length) return { type: 'FeatureCollection', features: [] }

  const normalized = bbls.map(normalizeBbl)

  // Check cache — separate cached from uncached
  const cached = []
  const uncached = []

  for (const bbl of normalized) {
    if (_cache.has(bbl)) {
      cached.push(_cache.get(bbl))
    } else {
      uncached.push(bbl)
    }
  }

  // Fetch uncached BBLs in a single request
  if (uncached.length > 0) {
    try {
      const bblList = uncached.map(b => `'${b}'`).join(',')
      const url = `${MAPPLUTO_GEOJSON}?$where=bbl in(${bblList})&$limit=10`
      const res = await fetch(url)

      if (!res.ok) throw new Error(`MapPLUTO API error: ${res.status}`)

      const geojson = await res.json()

      if (geojson?.features) {
        for (const feature of geojson.features) {
          const bbl = normalizeBbl(feature.properties?.bbl)
          // Ensure the BBL is in the properties for layer expressions
          feature.properties = {
            ...feature.properties,
            bbl,
            address: feature.properties?.address || feature.properties?.addr || '',
          }
          _cache.set(bbl, feature)
          cached.push(feature)
        }
      }
    } catch (err) {
      console.warn('MapPLUTO polygon fetch failed, falling back to points:', err)
      // Fallback: return point features from PLUTO cache
      const pointFeatures = await getFeaturesByBbl(bbls)
      return {
        type: 'FeatureCollection',
        features: pointFeatures,
        _fallback: true,
      }
    }
  }

  return {
    type: 'FeatureCollection',
    features: cached,
    _fallback: false,
  }
}
