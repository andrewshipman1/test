import { useState, useEffect, useMemo, useRef } from 'react'
import { computeScore as sharedComputeScore } from '../data/pluto.js'
import useHistoricDistricts, { isInHistoricDistrict } from './useHistoricDistricts.js'

const NYC_API = 'https://data.cityofnewyork.us/resource/64uk-42ks.json'
const HPD_REGISTRATIONS = 'https://data.cityofnewyork.us/resource/tesw-yqqr.json'

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

// Deduplicated neighborhood list for the PSF table UI (sorted by PSF desc)
export const NEIGHBORHOOD_TIERS = (() => {
  const seen = new Set()
  return Object.entries(NEIGHBORHOOD_PSF)
    .filter(([, { name }]) => !seen.has(name) && seen.add(name))
    .map(([, { name, psf }]) => ({ name, defaultPsf: psf }))
    .sort((a, b) => b.defaultPsf - a.defaultPsf)
})()

// Compute the effective sellout PSF for a zipcode given current assumptions + live data
// Priority: user neighborhood override > live ACRIS median > hardcoded estimate
// The psfMultiplier (scenario) is applied to live/hardcoded values but NOT user overrides
export function getEffectivePsf(zipcode, assumptions, livePsf = {}) {
  const nbhd       = NEIGHBORHOOD_PSF[zipcode] || { name: 'Manhattan', psf: 2500 }
  const multiplier = assumptions?.psfMultiplier ?? 1.0

  // User locked a specific PSF for this neighborhood — respect it exactly
  const manualOverride = assumptions?.psfOverrides?.[nbhd.name]
  if (manualOverride != null) return manualOverride

  // Live ACRIS data available — use it, then apply scenario multiplier
  const liveData = livePsf[zipcode]
  if (liveData) return Math.round(liveData.psf * multiplier)

  // Fall back to hardcoded estimate + multiplier
  return Math.round(nbhd.psf * multiplier)
}

// Detect deal type from building class + land use
export function getDealType(bldgClass, landUse) {
  const bc = (bldgClass || '').toUpperCase()
  const lu = (landUse || '').padStart(2, '0')
  if (lu === '08' || lu === '09') return 'INSTITUTIONAL'
  if (bc.startsWith('H') || bc.startsWith('P') || bc.startsWith('W') ||
      ['M2', 'M9', 'I7'].includes(bc)) return 'INSTITUTIONAL'
  if (lu === '11' || bc.startsWith('V')) return 'VACANT'
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

// Normalize a raw PLUTO lot into a GeoJSON feature
function toFeature(lot, index) {
  const score = sharedComputeScore(lot)
  const lotArea = parseFloat(lot.lotarea) || 0
  const residFar = parseFloat(lot.residfar) || 0
  const builtFar = parseFloat(lot.builtfar) || 0
  const availableFarSqft = Math.round(Math.max(0, (residFar - builtFar) * lotArea))
  const landUse = (lot.landuse || '').padStart(2, '0')
  const bblInt = Math.round(parseFloat(lot.bbl))

  // Normalize community district to 1-12 (PLUTO sometimes stores as 101-112)
  const rawCd = parseInt(lot.cd) || 0
  const cd    = rawCd > 12 ? rawCd - 100 : rawCd

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
      exempt_total:     parseFloat(lot.exempttot) || 0,
      owner_type:       (lot.ownertype || '').toUpperCase(),
      available_far_sqft: availableFarSqft,
      score,
      deal_type:        getDealType(lot.bldgclass, landUse),
      rent_stab_risk:   isLikelyRentStabilized(landUse, lot.unitsres, lot.yearbuilt),
      has_landmark:     false,
      landmark_name:    '',
      retail_area:      parseFloat(lot.retailarea) || 0,
      fac_far:          parseFloat(lot.facilfar) || 0,
      overlay1:         lot.overlay1 || '',
      overlay2:         '',
      spdist1:          '',
      ltdheight:        '',
      longitude:        parseFloat(lot.longitude),
      latitude:         parseFloat(lot.latitude),
      cd,
    }
  }
}

export function usePlutoData(filters) {
  const [allFeatures, setAllFeatures] = useState([])
  const [zoningDistricts, setZoningDistricts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { districts: historicGeoJson } = useHistoricDistricts()
  const hpdEnrichedRef = useRef(false)
  const hdEnrichedRef = useRef(false)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const selectFields = [
          'bbl', 'address', 'zipcode', 'ownername', 'ownertype', 'landuse', 'bldgclass',
          'zonedist1', 'lotarea', 'lotfront', 'lotdepth', 'bldgarea',
          'residfar', 'commfar', 'facilfar', 'builtfar', 'numfloors', 'yearbuilt',
          'unitsres', 'assesstot', 'exempttot', 'latitude', 'longitude',
          'overlay1', 'cd', 'retailarea'
        ].join(',')
        const where = 'latitude IS NOT NULL AND longitude IS NOT NULL AND lotarea > 0'

        // Paginate to fetch ALL Manhattan lots (~43k)
        const PAGE_SIZE = 10000
        const pages = [0, 1, 2, 3, 4] // up to 50k lots
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

        const zones = new Set()
        const features = allLots
          .filter(lot => {
            const lat = parseFloat(lot.latitude)
            const lng = parseFloat(lot.longitude)
            return lat && lng && lat > 40.70 && lat < 40.88 && lng > -74.02 && lng < -73.90
          })
          .map((lot, i) => {
            if (lot.zonedist1) zones.add(lot.zonedist1)
            return toFeature(lot, i)
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

  // Bulk-load HPD registrations to confirm rent stabilization + re-score
  useEffect(() => {
    if (!allFeatures.length || hpdEnrichedRef.current) return
    hpdEnrichedRef.current = true

    async function enrichRentStab() {
      try {
        const PAGE_SIZE = 50000
        const params = new URLSearchParams({
          boroid: '1',
          $select: 'boroid,block,lot',
          $limit: PAGE_SIZE,
        })
        const res = await fetch(`${HPD_REGISTRATIONS}?${params}`)
        if (!res.ok) return
        const registrations = await res.json()

        const rentStabBbls = new Set()
        for (const reg of registrations) {
          const block = String(reg.block).padStart(5, '0')
          const lot = String(reg.lot).padStart(4, '0')
          rentStabBbls.add(`1${block}${lot}`)
        }

        let changed = false
        for (const f of allFeatures) {
          const confirmed = rentStabBbls.has(f.properties.bbl)
          f.properties.rent_stab_confirmed = confirmed
          // Re-score with confirmed rent stab data
          const newScore = sharedComputeScore(f.properties, { confirmedRentStab: confirmed })
          if (f.properties.score !== newScore) {
            f.properties.score = newScore
            changed = true
          }
        }

        if (changed) setAllFeatures([...allFeatures])
      } catch (err) {
        console.warn('HPD bulk rent stab fetch failed:', err.message)
      }
    }

    enrichRentStab()
  }, [allFeatures.length])

  // Bulk historic district enrichment — tag features + re-score
  useEffect(() => {
    if (!allFeatures.length || !historicGeoJson?.features?.length || hdEnrichedRef.current) return
    hdEnrichedRef.current = true

    const districtFeatures = historicGeoJson.features
    let changed = false

    for (const f of allFeatures) {
      const { inDistrict, districtName } = isInHistoricDistrict(
        f.properties.longitude, f.properties.latitude, districtFeatures
      )
      if (inDistrict) {
        f.properties.has_landmark = true
        f.properties.landmark_name = districtName || 'Historic District'
        const newScore = sharedComputeScore(f.properties, {
          isHistoricDistrict: true,
          confirmedRentStab: f.properties.rent_stab_confirmed,
        })
        if (f.properties.score !== newScore) {
          f.properties.score = newScore
          changed = true
        }
      }
    }

    if (changed) setAllFeatures([...allFeatures])
  }, [allFeatures.length, historicGeoJson])

  const data = useMemo(() => {
    if (!allFeatures.length) return null
    const filtered = allFeatures.filter(f => {
      const p    = f.properties
      const zone = (p.zone_dist || '').toUpperCase()
      const lu   = p.land_use

      // Opportunity score threshold
      if (filters.minOpportunityScore > 0 && p.score < filters.minOpportunityScore) return false

      // Deal type (replaces land use dropdown)
      if (filters.dealType && filters.dealType !== 'all') {
        if (filters.dealType === 'vacant'     && lu !== '11') return false
        if (filters.dealType === 'parking'    && lu !== '10' && p.deal_type !== 'GARAGE') return false
        if (filters.dealType === 'teardown'   && !['01','02','03'].includes(lu)) return false
        if (filters.dealType === 'commercial' && !['04','05'].includes(lu)) return false
      }

      // Neighborhood (community district)
      if (filters.neighborhood && filters.neighborhood !== 'all') {
        if (p.cd !== parseInt(filters.neighborhood)) return false
      }

      // Zoning type
      if (filters.zoningType && filters.zoningType !== 'all') {
        if (filters.zoningType === 'residential'   && !zone.startsWith('R')) return false
        if (filters.zoningType === 'commercial'    && !zone.startsWith('C')) return false
        if (filters.zoningType === 'manufacturing' && !zone.startsWith('M')) return false
      }

      // Min buildable SF (replaces min allowed FAR)
      if (filters.minBuildableSF > 0 && p.available_far_sqft < filters.minBuildableSF) return false

      return true
    })
    return { type: 'FeatureCollection', features: filtered }
  }, [allFeatures, filters.minOpportunityScore, filters.dealType, filters.neighborhood, filters.zoningType, filters.minBuildableSF])

  const stats = useMemo(() => ({
    total: data?.features?.length || 0,
    highOpportunity: data?.features?.filter(f => f.properties.score >= 85).length || 0,
    vacant: data?.features?.filter(f => f.properties.land_use === '11').length || 0,
  }), [data])

  return { data, allFeatures, loading, error, stats, zoningDistricts }
}
