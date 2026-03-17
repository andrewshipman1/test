// ─── Rent Stabilization (standalone) ─────────────────────────────────────────
// Extracted from hooks/useRentStabilization.js

const HPD_REGISTRATIONS = 'https://data.cityofnewyork.us/resource/tesw-yqqr.json'
const DOF_PROPERTIES = 'https://data.cityofnewyork.us/resource/8y4t-faws.json'

function parseBbl(bbl) {
  const s = String(Math.round(Number(bbl))).padStart(10, '0')
  return { boroid: s[0], block: s.slice(1, 6), lot: s.slice(6, 10) }
}

// Simple in-memory cache
const cache = {}

export async function fetchRentStabilization(bbl) {
  const bbl10 = String(Math.round(Number(bbl))).padStart(10, '0')

  if (cache[bbl10]) return cache[bbl10]

  const { boroid, block, lot } = parseBbl(bbl)
  const blockInt = String(parseInt(block, 10))
  const lotInt   = String(parseInt(lot, 10))

  // Step 1: Check HPD registrations
  const regParams = new URLSearchParams({
    boroid,
    block:   blockInt,
    lot:     lotInt,
    $select: 'registrationid,lastregistrationdate',
    $order:  'lastregistrationdate DESC',
    $limit:  '5',
  })

  const regRes = await fetch(`${HPD_REGISTRATIONS}?${regParams}`)
  if (!regRes.ok) throw new Error(`HPD registrations: ${regRes.status}`)
  const regData = await regRes.json()
  const isRegistered = Array.isArray(regData) && regData.length > 0

  // Step 2: Get total unit count from DOF
  const dofParams = new URLSearchParams({
    boro:    boroid,
    block:   blockInt,
    lot:     lotInt,
    $select: 'units,bldg_class',
    $order:  'year DESC',
    $limit:  '1',
  })

  const dofRes = await fetch(`${DOF_PROPERTIES}?${dofParams}`)
  if (!dofRes.ok) throw new Error(`DOF properties: ${dofRes.status}`)
  const dofData = await dofRes.json()

  const total = (Array.isArray(dofData) && dofData[0])
    ? parseInt(dofData[0].units, 10) || null
    : null

  const stabilized = isRegistered ? (total || null) : 0
  const market = (total != null && stabilized != null)
    ? Math.max(0, total - stabilized)
    : null

  const result = { stabilizedUnits: stabilized, totalUnits: total, marketRateUnits: market }
  cache[bbl10] = result
  return result
}
