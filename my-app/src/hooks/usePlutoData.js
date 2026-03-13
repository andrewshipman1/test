import { useState, useEffect, useMemo } from 'react'

const NYC_API = 'https://data.cityofnewyork.us/resource/64uk-42ks.json'

// Neighborhood PSF estimates by zipcode (luxury residential $/SF sellout)
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

// Detect deal type from building class + land use
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

// Detect if likely rent stabilized (proxy — real data needs DHCR)
// No taxclass in PLUTO; use landuse + units + age as proxy
export function isLikelyRentStabilized(landUse, unitsRes, yearBuilt) {
  const lu = (landUse || '').padStart(2, '0')
  return (lu === '02' || lu === '03') &&
    parseInt(unitsRes) > 5 &&
    parseInt(yearBuilt) < 1974
}

// Compute opportunity score from real PLUTO fields
function computeScore(lot) {
  let score = 0
  const residFar = parseFloat(lot.residfar) || 0
  const builtFar = parseFloat(lot.builtfar) || 0
  const lotArea = parseFloat(lot.lotarea) || 0
  const availableFAR = Math.max(0, (residFar - builtFar) * lotArea)
  const farUtilization = residFar > 0 ? builtFar / residFar : 1
  const bc = (lot.bldgclass || '').toUpperCase()
  const landUse = (lot.landuse || '').padStart(2, '0')

  // Penalize co-ops and condos (near-impossible to redevelop)
  if (['D4', 'D5'].includes(bc) || bc.startsWith('R')) return 5

  // Unused development rights
  if (availableFAR > 50000) score += 30
  else if (availableFAR > 20000) score += 20
  else if (availableFAR > 5000) score += 10

  // Vacant land = best
  if (landUse === '11') score += 25

  // Under-utilized relative to zoning
  if (farUtilization < 0.5 && residFar > 2) score += 20
  else if (farUtilization < 0.75) score += 10

  // Low-rise on high-FAR zone (teardown candidate)
  if ((parseFloat(lot.numfloors) || 0) < 3 && residFar >= 5) score += 15

  // High-density zoning
  if (residFar >= 10) score += 10
  else if (residFar >= 6) score += 5

  // Garage = easy teardown bonus
  if (bc.startsWith('G')) score += 8

  return Math.min(100, Math.round(score))
}

// Normalize a raw PLUTO lot into a GeoJSON feature
function toFeature(lot, index, landmarkSet) {
  const score = computeScore(lot)
  const lotArea = parseFloat(lot.lotarea) || 0
  const residFar = parseFloat(lot.residfar) || 0
  const builtFar = parseFloat(lot.builtfar) || 0
  const availableFarSqft = Math.round(Math.max(0, (residFar - builtFar) * lotArea))
  const landUse = (lot.landuse || '').padStart(2, '0')
  const bblInt = Math.round(parseFloat(lot.bbl))

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
      has_landmark:     landmarkSet ? landmarkSet.has(bblInt) : false,
      longitude:        parseFloat(lot.longitude),
      latitude:         parseFloat(lot.latitude),
    }
  }
}

export function usePlutoData(filters) {
  const [allFeatures, setAllFeatures] = useState([])
  const [zoningDistricts, setZoningDistricts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const params = new URLSearchParams({
          borough: 'MN',
          $limit: 8000,
          $select: [
            'bbl', 'address', 'zipcode', 'ownername', 'landuse', 'bldgclass',
            'zonedist1', 'lotarea', 'lotfront', 'lotdepth', 'bldgarea',
            'residfar', 'commfar', 'builtfar', 'numfloors', 'yearbuilt',
            'unitsres', 'assesstot', 'latitude', 'longitude'
          ].join(','),
          $where: 'latitude IS NOT NULL AND longitude IS NOT NULL AND lotarea > 0',
          $order: 'lotarea DESC'
        })

        const LANDMARK_API = 'https://data.cityofnewyork.us/resource/f7ej-9ynb.json?$select=bbl&$limit=5000'

        const [lotsRes, landmarksRes] = await Promise.all([
          fetch(`${NYC_API}?${params}`),
          fetch(LANDMARK_API).catch(() => ({ ok: false }))
        ])
        if (!lotsRes.ok) throw new Error(`NYC API error: ${lotsRes.status}`)
        const lots = await lotsRes.json()
        const landmarkSet = landmarksRes.ok
          ? new Set((await landmarksRes.json()).map(l => Math.round(parseFloat(l.bbl))))
          : new Set()

        const zones = new Set()
        const features = lots
          .filter(lot => {
            const lat = parseFloat(lot.latitude)
            const lng = parseFloat(lot.longitude)
            return lat && lng && lat > 40.70 && lat < 40.88 && lng > -74.02 && lng < -73.90
          })
          .map((lot, i) => {
            if (lot.zonedist1) zones.add(lot.zonedist1)
            return toFeature(lot, i, landmarkSet)
          })

        setAllFeatures(features)
        setZoningDistricts(Array.from(zones).sort())
      } catch (err) {
        console.error('Failed to load PLUTO data:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const data = useMemo(() => {
    if (!allFeatures.length) return null
    const filtered = allFeatures.filter(f => {
      const p = f.properties
      const zone = (p.zone_dist || '').toUpperCase()
      if (filters.minOpportunityScore > 0 && p.score < filters.minOpportunityScore) return false
      if (filters.landUse !== 'all' && p.land_use !== filters.landUse) return false
      if (filters.showVacantOnly && p.land_use !== '11') return false
      if (filters.zoningType && filters.zoningType !== 'all') {
        if (filters.zoningType === 'residential' && !zone.startsWith('R')) return false
        if (filters.zoningType === 'commercial' && !zone.startsWith('C')) return false
        if (filters.zoningType === 'manufacturing' && !zone.startsWith('M')) return false
      }
      if (filters.minAllowedFAR > 0 && p.res_far < filters.minAllowedFAR) return false
      return true
    })
    return { type: 'FeatureCollection', features: filtered }
  }, [allFeatures, filters.minOpportunityScore, filters.landUse, filters.showVacantOnly, filters.zoningType, filters.minAllowedFAR])

  const stats = useMemo(() => ({
    total: data?.features?.length || 0,
    highOpportunity: data?.features?.filter(f => f.properties.score >= 60).length || 0,
    vacant: data?.features?.filter(f => f.properties.land_use === '11').length || 0,
  }), [data])

  return { data, loading, error, stats, zoningDistricts }
}
