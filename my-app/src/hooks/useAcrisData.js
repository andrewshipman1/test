import { useState, useEffect } from 'react'

// NYC DOF Rolling Calendar Sales — has sale_price + sale_date, queryable by borough/block/lot
const DOF_SALES_API = 'https://data.cityofnewyork.us/resource/usep-8jbt.json'

// Parse a 10-digit BBL integer string into { borough, block, lot }
function parseBBL(bbl) {
  const s = String(Math.round(Number(bbl))).padStart(10, '0')
  return {
    borough: parseInt(s[0], 10),
    block:   parseInt(s.slice(1, 6), 10),
    lot:     parseInt(s.slice(6), 10),
  }
}

export function useAcrisComps(bbl) {
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!bbl) return
    let cancelled = false

    async function fetchSales() {
      setLoading(true)
      setSales([])
      try {
        const { borough, block, lot } = parseBBL(bbl)

        const params = new URLSearchParams({
          borough: String(borough),
          block:   String(block),
          lot:     String(lot),
          $order:  'sale_date DESC',
          $limit:  '10',
          $select: 'sale_price,sale_date,building_class_at_time_of',
        })

        const res = await fetch(`${DOF_SALES_API}?${params}`)
        if (!res.ok) throw new Error(`DOF sales error: ${res.status}`)
        const rows = await res.json()

        const result = rows
          .map(r => ({
            date:  (r.sale_date || '').slice(0, 10),
            price: parseFloat(r.sale_price) || 0,
            bldg_class: r.building_class_at_time_of || '',
          }))
          .filter(s => s.price > 10000)   // filter $0 / nominal transfers
          .slice(0, 4)

        if (!cancelled) setSales(result)
      } catch (err) {
        console.warn('DOF sales fetch failed:', err.message)
        if (!cancelled) setSales([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchSales()
    return () => { cancelled = true }
  }, [bbl])

  return { sales, loading }
}
