// ─── Standalone PLUTO data layer ─────────────────────────────────────────────
// Extracted from hooks/usePlutoData.js for use by Claude API tool handlers.
// Module-level cache: fetched once, filtered in-memory thereafter.

const NYC_API = 'https://data.cityofnewyork.us/resource/64uk-42ks.json'

// ── Neighborhood PSF estimates (re-exported for pro forma) ──────────────────
export const NEIGHBORHOOD_PSF = {
  '10001': { name: 'Chelsea / Hudson Yards', psf: 2800 },
  '10002': { name: 'Lower East Side', psf: 2200 },
  '10003': { name: 'East Village / Greenwich', psf: 2600 },
  '10004': { name: 'Financial District', psf: 2400 },
  '10005': { name: 'Financial District', psf: 2400 },
  '10006': { name: 'Financial District', psf: 2400 },
  '10007': { name: 'Tribeca / Civic Center', psf: 3200 },
  '10009': { name: 'East Village', psf: 2400 },
  '10010': { name: 'Gramercy Park', psf: 2700 },
  '10011': { name: 'Chelsea', psf: 2900 },
  '10012': { name: 'SoHo / NoHo', psf: 3100 },
  '10013': { name: 'Tribeca / SoHo', psf: 3400 },
  '10014': { name: 'West Village', psf: 3500 },
  '10016': { name: 'Murray Hill', psf: 2500 },
  '10017': { name: 'Midtown East', psf: 2800 },
  '10018': { name: 'Midtown', psf: 2600 },
  '10019': { name: 'Midtown West', psf: 2900 },
  '10020': { name: 'Midtown', psf: 2700 },
  '10021': { name: 'Upper East Side', psf: 3200 },
  '10022': { name: 'Midtown East / Sutton', psf: 3000 },
  '10023': { name: 'Upper West Side', psf: 2800 },
  '10024': { name: 'Upper West Side', psf: 2700 },
  '10025': { name: 'Upper West Side', psf: 2600 },
  '10026': { name: 'Central Harlem', psf: 1800 },
  '10027': { name: 'Central Harlem', psf: 1700 },
  '10028': { name: 'Upper East Side / Yorkville', psf: 3100 },
  '10029': { name: 'East Harlem', psf: 1600 },
  '10030': { name: 'Harlem', psf: 1600 },
  '10031': { name: 'Hamilton Heights', psf: 1500 },
  '10032': { name: 'Washington Heights', psf: 1400 },
  '10033': { name: 'Washington Heights', psf: 1400 },
  '10034': { name: 'Inwood', psf: 1300 },
  '10036': { name: "Hell's Kitchen / Times Square", psf: 2700 },
  '10037': { name: 'Harlem', psf: 1600 },
  '10038': { name: 'FiDi / Seaport', psf: 2400 },
  '10039': { name: 'Harlem', psf: 1500 },
  '10040': { name: 'Washington Heights', psf: 1400 },
  '10044': { name: 'Roosevelt Island', psf: 1800 },
  '10065': { name: 'Lenox Hill / UES', psf: 3400 },
  '10069': { name: 'Upper West Side', psf: 2700 },
  '10075': { name: 'Upper East Side', psf: 3300 },
  '10128': { name: 'Upper East Side / Yorkville', psf: 2900 },
  '10280': { name: 'Battery Park City', psf: 2500 },
  '10282': { name: 'Battery Park City', psf: 2500 },
}

// ── Pure functions ──────────────────────────────────────────────────────────

export function getDealType(bldgClass, landUse) {
  const bc = (bldgClass || '').toUpperCase()
  if (landUse === '11' || bc.startsWith('V')) return 'VACANT'
  if (['D4', 'D5'].includes(bc)) return 'COOP'
  if (bc.startsWith('R')) return 'CONDO'
  if (['E', 'F', 'L'].some(p => bc.startsWith(p))) return 'CONVERSION'
  if (bc.startsWith('G')) return 'GARAGE'
  if (bc.startsWith('O') || bc.startsWith('K')) return 'COMMERCIAL'
  return 'TEARDOWN'
}

export function isLikelyRentStabilized(landUse, unitsRes, yearBuilt) {
  const lu = (landUse || '').padStart(2, '0')
  return (lu === '02' || lu === '03') &&
    parseInt(unitsRes) > 5 &&
    parseInt(yearBuilt) < 1974
}

export function computeScore(lot) {
  let score = 0
  const residFar = parseFloat(lot.residfar || lot.res_far) || 0
  const builtFar = parseFloat(lot.builtfar || lot.built_far) || 0
  const lotArea = parseFloat(lot.lotarea || lot.lot_area) || 0
  const availableFAR = Math.max(0, (residFar - builtFar) * lotArea)
  const farUtilization = residFar > 0 ? builtFar / residFar : 1
  const bc = (lot.bldgclass || lot.bldg_class || '').toUpperCase()
  const landUse = (lot.landuse || lot.land_use || '').padStart(2, '0')

  if (['D4', 'D5'].includes(bc) || bc.startsWith('R')) return 5

  if (availableFAR > 50000) score += 30
  else if (availableFAR > 20000) score += 20
  else if (availableFAR > 5000) score += 10

  if (landUse === '11') score += 25

  if (farUtilization < 0.5 && residFar > 2) score += 20
  else if (farUtilization < 0.75) score += 10

  if ((parseFloat(lot.numfloors || lot.num_floors) || 0) < 3 && residFar >= 5) score += 15

  if (residFar >= 10) score += 10
  else if (residFar >= 6) score += 5

  if (bc.startsWith('G')) score += 8

  if (isLikelyRentStabilized(lot.landuse || lot.land_use, lot.unitsres || lot.units_res, lot.yearbuilt || lot.year_built)) {
    const units = parseInt(lot.unitsres || lot.units_res) || 0
    if (units > 50) score -= 15
    else if (units > 20) score -= 10
    else score -= 5
  }

  const retailArea = parseFloat(lot.retailarea || lot.retail_area) || 0
  if (retailArea > 10000) score -= 8
  else if (retailArea > 5000) score -= 5
  else if (retailArea > 0) score -= 3

  return Math.max(0, Math.min(100, Math.round(score)))
}

export function getEffectivePsf(zipcode, assumptions = {}, livePsf = {}) {
  const nbhd = NEIGHBORHOOD_PSF[zipcode] || { name: 'Manhattan', psf: 2500 }
  const multiplier = assumptions?.psfMultiplier ?? 1.0
  const manualOverride = assumptions?.psfOverrides?.[nbhd.name]
  if (manualOverride != null) return manualOverride
  const liveData = livePsf[zipcode]
  if (liveData) return Math.round(liveData.psf * multiplier)
  return Math.round(nbhd.psf * multiplier)
}

function toFeature(lot, index) {
  const score = computeScore(lot)
  const lotArea = parseFloat(lot.lotarea) || 0
  const residFar = parseFloat(lot.residfar) || 0
  const builtFar = parseFloat(lot.builtfar) || 0
  const availableFarSqft = Math.round(Math.max(0, (residFar - builtFar) * lotArea))
  const landUse = (lot.landuse || '').padStart(2, '0')
  const bblInt = Math.round(parseFloat(lot.bbl))
  const rawCd = parseInt(lot.cd) || 0
  const cd = rawCd > 12 ? rawCd - 100 : rawCd

  return {
    type: 'Feature',
    id: index,
    geometry: {
      type: 'Point',
      coordinates: [parseFloat(lot.longitude), parseFloat(lot.latitude)]
    },
    properties: {
      bbl:              String(bblInt),
      address:          lot.address || '',
      zipcode:          lot.zipcode || '',
      owner_name:       lot.ownername || '',
      land_use:         landUse,
      bldg_class:       lot.bldgclass || '',
      zone_dist:        lot.zonedist1 || '',
      lot_area:         lotArea,
      lot_front:        parseFloat(lot.lotfront) || 0,
      lot_depth:        parseFloat(lot.lotdepth) || 0,
      bldg_area:        parseFloat(lot.bldgarea) || 0,
      res_far:          residFar,
      comm_far:         parseFloat(lot.commfar) || 0,
      built_far:        builtFar,
      num_floors:       parseFloat(lot.numfloors) || 0,
      year_built:       parseFloat(lot.yearbuilt) || 0,
      units_res:        parseFloat(lot.unitsres) || 0,
      assess_total:     parseFloat(lot.assesstot) || 0,
      available_far_sqft: availableFarSqft,
      score,
      deal_type:        getDealType(lot.bldgclass, landUse),
      rent_stab_risk:   isLikelyRentStabilized(landUse, lot.unitsres, lot.yearbuilt),
      has_landmark:     false,
      landmark_name:    '',
      retail_area:      parseFloat(lot.retailarea) || 0,
      fac_far:          parseFloat(lot.facilfar) || 0,
      overlay1:         lot.overlay1 || '',
      longitude:        parseFloat(lot.longitude),
      latitude:         parseFloat(lot.latitude),
      cd,
    }
  }
}

// ── Module-level cache ──────────────────────────────────────────────────────
let _allFeatures = null
let _loading = null // Promise while loading

export async function loadAllLots() {
  if (_allFeatures) return _allFeatures
  if (_loading) return _loading

  _loading = (async () => {
    const selectFields = [
      'bbl', 'address', 'zipcode', 'ownername', 'landuse', 'bldgclass',
      'zonedist1', 'lotarea', 'lotfront', 'lotdepth', 'bldgarea',
      'residfar', 'commfar', 'facilfar', 'builtfar', 'numfloors', 'yearbuilt',
      'unitsres', 'assesstot', 'latitude', 'longitude',
      'overlay1', 'cd', 'retailarea'
    ].join(',')
    const where = 'latitude IS NOT NULL AND longitude IS NOT NULL AND lotarea > 0'

    const PAGE_SIZE = 10000
    const pages = [0, 1, 2, 3, 4]
    const results = await Promise.all(
      pages.map(page => {
        const params = new URLSearchParams({
          borough: 'MN',
          $limit: PAGE_SIZE,
          $offset: page * PAGE_SIZE,
          $select: selectFields,
          $where: where,
          $order: 'bbl',
        })
        return fetch(`${NYC_API}?${params}`).then(r => {
          if (!r.ok) throw new Error(`NYC API error: ${r.status}`)
          return r.json()
        })
      })
    )

    const allLots = results.flat()
    _allFeatures = allLots
      .filter(lot => {
        const lat = parseFloat(lot.latitude)
        const lng = parseFloat(lot.longitude)
        return lat && lng && lat > 40.70 && lat < 40.88 && lng > -74.02 && lng < -73.90
      })
      .map((lot, i) => toFeature(lot, i))

    _loading = null
    return _allFeatures
  })()

  return _loading
}

// ── Searchable interface for Claude tools ───────────────────────────────────

export async function searchProperties({ dealType, neighborhood, zoningType, minScore, minBuildableSF, address, limit = 20 } = {}) {
  const allFeatures = await loadAllLots()

  // Address search — fast path, case-insensitive substring match
  if (address) {
    const needle = address.toUpperCase().replace(/\./g, '').replace(/\s+/g, ' ').trim()
    const matches = allFeatures.filter(f => {
      const addr = (f.properties.address || '').toUpperCase().replace(/\./g, '').replace(/\s+/g, ' ')
      return addr.includes(needle)
    })
    matches.sort((a, b) => b.properties.score - a.properties.score)
    const results = matches.slice(0, limit)
    return {
      count: matches.length,
      showing: results.length,
      properties: results.map(f => ({
        bbl: f.properties.bbl,
        address: f.properties.address,
        score: f.properties.score,
        deal_type: f.properties.deal_type,
        zone_dist: f.properties.zone_dist,
        lot_area: f.properties.lot_area,
        available_far_sqft: f.properties.available_far_sqft,
        num_floors: f.properties.num_floors,
        neighborhood: f.properties.neighborhood,
      })),
    }
  }

  let filtered = allFeatures.filter(f => {
    const p = f.properties
    const zone = (p.zone_dist || '').toUpperCase()
    const lu = p.land_use

    if (minScore && p.score < minScore) return false

    if (dealType && dealType !== 'all') {
      if (dealType === 'vacant' && lu !== '11') return false
      if (dealType === 'parking' && lu !== '10' && p.deal_type !== 'GARAGE') return false
      if (dealType === 'teardown' && !['01', '02', '03'].includes(lu)) return false
      if (dealType === 'commercial' && !['04', '05'].includes(lu)) return false
    }

    if (neighborhood && neighborhood !== 'all') {
      if (p.cd !== parseInt(neighborhood)) return false
    }

    if (zoningType && zoningType !== 'all') {
      if (zoningType === 'residential' && !zone.startsWith('R')) return false
      if (zoningType === 'commercial' && !zone.startsWith('C')) return false
      if (zoningType === 'manufacturing' && !zone.startsWith('M')) return false
    }

    if (minBuildableSF && p.available_far_sqft < minBuildableSF) return false

    return true
  })

  // Sort by score desc, then limit
  filtered.sort((a, b) => b.properties.score - a.properties.score)
  const results = filtered.slice(0, limit)

  return {
    count: filtered.length,
    showing: results.length,
    properties: results.map(f => ({
      ...f.properties,
      neighborhood: NEIGHBORHOOD_PSF[f.properties.zipcode]?.name || 'Manhattan',
    })),
  }
}

export async function getPropertyDetail(bbl) {
  const allFeatures = await loadAllLots()
  const bblStr = String(Math.round(Number(bbl)))
  const feature = allFeatures.find(f => f.properties.bbl === bblStr)

  if (!feature) return { error: `Property ${bbl} not found` }

  return {
    ...feature.properties,
    neighborhood: NEIGHBORHOOD_PSF[feature.properties.zipcode]?.name || 'Manhattan',
    coordinates: feature.geometry.coordinates,
  }
}

// ── Get features by BBL array (for inline maps) ────────────────────────────
export async function getFeaturesByBbl(bbls) {
  const allFeatures = await loadAllLots()
  const bblSet = new Set(bbls.map(b => String(Math.round(Number(b)))))
  return allFeatures.filter(f => bblSet.has(f.properties.bbl))
}
