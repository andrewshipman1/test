import { useState, useEffect } from 'react'

const DOF_SALES_API = 'https://data.cityofnewyork.us/resource/usep-8jbt.json'

function median(arr) {
  if (!arr.length) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

// Fetch recent condo unit sales from NYC DOF Rolling Calendar Sales
// Building classes R1/R2/R3/R6 = condominiums (excludes R4 co-ops)
// Returns: { [zipcode]: { psf: number, count: number } }
export function useMarketPsf() {
  const [livePsf,  setLivePsf]  = useState({})
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    async function fetchMarketPsf() {
      try {
        const params = new URLSearchParams({
          $where: [
            "borough = '1'",                          // Manhattan only
            "building_class_at_time_of IN('R1','R2','R3','R6')",  // condos, not co-ops
            'sale_price > 200000',
            'gross_square_feet > 200',
          ].join(' AND '),
          $select: 'zip_code,sale_price,gross_square_feet',
          $limit:  '5000',
          $order:  'sale_date DESC',
        })

        const res = await fetch(`${DOF_SALES_API}?${params}`)
        if (!res.ok) throw new Error(`Market PSF fetch: ${res.status}`)
        const rows = await res.json()

        // Compute $/SF per sale, group by zip
        const byZip = {}
        rows.forEach(r => {
          const zip   = r.zip_code
          const price = parseFloat(r.sale_price)
          const sqft  = parseFloat(r.gross_square_feet)
          if (!zip || !price || !sqft || sqft < 200 || price < 100000) return
          const psf = price / sqft
          if (psf < 200 || psf > 20000) return   // sanity bounds
          ;(byZip[zip] = byZip[zip] || []).push(psf)
        })

        const result = {}
        Object.entries(byZip).forEach(([zip, psfs]) => {
          if (psfs.length >= 3) {
            result[zip] = { psf: Math.round(median(psfs)), count: psfs.length }
          }
        })

        setLivePsf(result)
      } catch (err) {
        console.warn('Market PSF fetch failed:', err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchMarketPsf()
  }, [])

  return { livePsf, loading }
}
