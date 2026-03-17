import { useState, useEffect } from 'react'

// HPD Multiple Dwelling Registrations (tesw-yqqr) – buildings registered
// as containing rent-stabilized units file annual registrations here.
const HPD_REGISTRATIONS = 'https://data.cityofnewyork.us/resource/tesw-yqqr.json'

// DOF Property Assessment Roll (8y4t-faws) – has total residential unit
// counts per tax lot, which lets us derive market-rate unit estimates.
const DOF_PROPERTIES = 'https://data.cityofnewyork.us/resource/8y4t-faws.json'

// Parse float BBL (e.g. 1012000011) → { boroid, block, lot }
function parseBbl(bbl) {
  const s = String(Math.round(Number(bbl))).padStart(10, '0')
  return { boroid: s[0], block: s.slice(1, 6), lot: s.slice(6, 10) }
}

// Simple in-memory cache keyed by 10-digit BBL string
const cache = {}

export function useRentStabilization(bbl) {
  const [stabilizedUnits, setStabilizedUnits] = useState(null)
  const [totalUnits,      setTotalUnits]      = useState(null)
  const [marketRateUnits, setMarketRateUnits] = useState(null)
  const [loading,         setLoading]         = useState(false)
  const [error,           setError]           = useState(null)

  useEffect(() => {
    if (!bbl) {
      setStabilizedUnits(null)
      setTotalUnits(null)
      setMarketRateUnits(null)
      setError(null)
      return
    }

    const bbl10 = String(Math.round(Number(bbl))).padStart(10, '0')

    // Return cached result immediately
    if (cache[bbl10]) {
      const c = cache[bbl10]
      setStabilizedUnits(c.stabilizedUnits)
      setTotalUnits(c.totalUnits)
      setMarketRateUnits(c.marketRateUnits)
      setError(null)
      return
    }

    const controller = new AbortController()
    const { signal } = controller

    async function fetchRentStab() {
      setLoading(true)
      setError(null)
      setStabilizedUnits(null)
      setTotalUnits(null)
      setMarketRateUnits(null)

      try {
        const { boroid, block, lot } = parseBbl(bbl)
        // HPD stores block/lot as unpadded integers
        const blockInt = String(parseInt(block, 10))
        const lotInt   = String(parseInt(lot, 10))

        // ── Step 1: Check HPD registrations for this BBL ──
        // A building with active registrations here is rent-stabilized.
        const regParams = new URLSearchParams({
          boroid,
          block:   blockInt,
          lot:     lotInt,
          $select: 'registrationid,lastregistrationdate',
          $order:  'lastregistrationdate DESC',
          $limit:  '5',
        })

        const regRes = await fetch(`${HPD_REGISTRATIONS}?${regParams}`, { signal })
        if (!regRes.ok) throw new Error(`HPD registrations: ${regRes.status}`)
        const regData = await regRes.json()

        if (signal.aborted) return

        const isRegistered = Array.isArray(regData) && regData.length > 0

        // ── Step 2: Get total unit count from DOF property roll ──
        const dofParams = new URLSearchParams({
          boro:    boroid,
          block:   blockInt,
          lot:     lotInt,
          $select: 'units,bldg_class',
          $order:  'year DESC',
          $limit:  '1',
        })

        const dofRes = await fetch(`${DOF_PROPERTIES}?${dofParams}`, { signal })
        if (!dofRes.ok) throw new Error(`DOF properties: ${dofRes.status}`)
        const dofData = await dofRes.json()

        if (signal.aborted) return

        const total = (Array.isArray(dofData) && dofData[0])
          ? parseInt(dofData[0].units, 10) || null
          : null

        // ── Derive counts ──
        // HPD registration confirms rent-stabilized units exist but does
        // not expose an exact count via this API.  When the building is
        // registered we report totalUnits as the stabilized count (most
        // registered buildings are fully stabilized).  Buildings with no
        // registration get 0.
        const stabilized = isRegistered ? (total || null) : 0
        const market = (total != null && stabilized != null)
          ? Math.max(0, total - stabilized)
          : null

        const result = { stabilizedUnits: stabilized, totalUnits: total, marketRateUnits: market }
        cache[bbl10] = result

        setStabilizedUnits(result.stabilizedUnits)
        setTotalUnits(result.totalUnits)
        setMarketRateUnits(result.marketRateUnits)

      } catch (err) {
        if (err.name === 'AbortError') return
        console.warn('useRentStabilization fetch failed:', err.message)
        setError(err.message)
      } finally {
        if (!signal.aborted) setLoading(false)
      }
    }

    fetchRentStab()
    return () => controller.abort()
  }, [bbl])

  return { stabilizedUnits, totalUnits, marketRateUnits, loading, error }
}
