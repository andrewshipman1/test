import { useState, useEffect } from 'react'

const NYC_API = 'https://data.cityofnewyork.us/resource'

// Fetch recent deed transfers from ACRIS (ownership changes = market activity)
async function fetchRecentSales() {
  try {
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
    const dateStr = ninetyDaysAgo.toISOString().split('T')[0]

    const params = new URLSearchParams({
      $limit: 500,
      $select: 'bbl,doc_type,crfn,doc_date,apn_nbr,apn_range',
      $where: `doc_date >= '${dateStr}' AND doc_type='DEED' AND borough=1`,
      $order: 'doc_date DESC'
    })

    const res = await fetch(`${NYC_API}/bnx9-e6tj.json?${params}`)
    if (!res.ok) return []
    const data = await res.json()
    return data.map(d => ({ bbl: d.bbl, type: 'recent_sale', date: d.doc_date, label: 'Recent Sale' }))
  } catch {
    return []
  }
}

// Fetch demolition permits from DOB (site being cleared = development incoming)
async function fetchDemoPermits() {
  try {
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    const dateStr = sixMonthsAgo.toISOString().split('T')[0]

    const params = new URLSearchParams({
      $limit: 500,
      $select: 'bbl,job_type,filing_date,job_s1_no,initial_cost',
      $where: `filing_date >= '${dateStr}' AND job_type='DM' AND borough='MANHATTAN'`,
      $order: 'filing_date DESC'
    })

    const res = await fetch(`${NYC_API}/ipu4-2q9a.json?${params}`)
    if (!res.ok) return []
    const data = await res.json()
    return data.map(d => ({ bbl: d.bbl, type: 'demo_permit', date: d.filing_date, label: 'Demo Permit Filed' }))
  } catch {
    return []
  }
}

// Fetch new building permits (active development)
async function fetchNewBuildingPermits() {
  try {
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
    const dateStr = oneYearAgo.toISOString().split('T')[0]

    const params = new URLSearchParams({
      $limit: 500,
      $select: 'bbl,job_type,filing_date,job_description,building_type',
      $where: `filing_date >= '${dateStr}' AND job_type='NB' AND borough='MANHATTAN'`,
      $order: 'filing_date DESC'
    })

    const res = await fetch(`${NYC_API}/ipu4-2q9a.json?${params}`)
    if (!res.ok) return []
    const data = await res.json()
    return data.map(d => ({ bbl: d.bbl, type: 'new_building', date: d.filing_date, label: 'New Building Permit' }))
  } catch {
    return []
  }
}

// Fetch NYC surplus properties for sale (DCAS)
async function fetchSurplusProperties() {
  try {
    const params = new URLSearchParams({
      $limit: 200,
      $select: 'bbl,managingagency,housenum_lo,streetname,address',
      $where: "borough='MN'"
    })

    const res = await fetch(`${NYC_API}/ie8t-66bk.json?${params}`)
    if (!res.ok) return []
    const data = await res.json()
    return data.map(d => ({
      bbl: d.bbl,
      type: 'city_owned',
      label: 'City-Owned Property',
      address: d.address || `${d.housenum_lo} ${d.streetname}`,
      agency: d.managingagency
    }))
  } catch {
    return []
  }
}

export function useMarketSignals() {
  const [signals,      setSignals]      = useState({})
  const [salesFlat,    setSalesFlat]    = useState([])
  const [cityOwnedFlat,setCityOwnedFlat]= useState([])
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState({ recentSales: 0, demoPermits: 0, newBuildings: 0, cityOwned: 0 })

  useEffect(() => {
    async function fetchAll() {
      setLoading(true)
      try {
        const [sales, demos, newBuilds, cityOwned] = await Promise.all([
          fetchRecentSales(),
          fetchDemoPermits(),
          fetchNewBuildingPermits(),
          fetchSurplusProperties()
        ])

        // Build a map of BBL -> signals
        const signalMap = {}
        const addSignal = (item) => {
          if (!item.bbl) return
          if (!signalMap[item.bbl]) signalMap[item.bbl] = []
          signalMap[item.bbl].push(item)
        }

        sales.forEach(addSignal)
        demos.forEach(addSignal)
        newBuilds.forEach(addSignal)
        cityOwned.forEach(addSignal)

        setSignals(signalMap)
        setSalesFlat(sales)
        setCityOwnedFlat(cityOwned)
        setSummary({
          recentSales: sales.length,
          demoPermits: demos.length,
          newBuildings: newBuilds.length,
          cityOwned: cityOwned.length
        })
      } catch (err) {
        console.error('Failed to load market signals:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchAll()
  }, [])

  return { signals, loading, summary, salesFlat, cityOwnedFlat }
}
