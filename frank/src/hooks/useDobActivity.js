import { useState, useEffect } from 'react'

const DOB_PERMITS_API = 'https://data.cityofnewyork.us/resource/ipu4-2q9a.json'

// Parse float BBL → { block, lot } as stripped-zero strings (DOB stores without leading zeros)
function parseBblForDob(bbl) {
  const s = String(Math.round(Number(bbl))).padStart(10, '0')
  // Strip leading zeros for DOB query
  const block = String(parseInt(s.slice(1, 6), 10))
  const lot   = String(parseInt(s.slice(6, 10), 10))
  return { block, lot }
}

function parseDobDate(dateStr) {
  // DOB dates come as "MM/DD/YYYY" or ISO "YYYY-MM-DDTHH:MM:SS.000"
  if (!dateStr) return null
  if (dateStr.includes('T')) return dateStr.slice(0, 10)
  // MM/DD/YYYY → YYYY-MM-DD
  const parts = dateStr.split('/')
  if (parts.length === 3) {
    const [m, d, y] = parts
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  return null
}

export function useDobActivity(bbl) {
  const [permits, setPermits] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!bbl) return
    const controller = new AbortController()
    const { signal } = controller

    async function fetchPermits() {
      setLoading(true)
      setPermits([])

      try {
        const { block, lot } = parseBblForDob(bbl)

        const params = new URLSearchParams({
          $where:  `block='${block}' AND lot='${lot}' AND borough='MANHATTAN'`,
          $select: 'job__,job_type,house__,street_name,filing_date,issuance_date,permit_status,job_description,estimated_job_costs',
          $order:  'filing_date DESC',
          $limit:  '25',
        })

        const res = await fetch(`${DOB_PERMITS_API}?${params}`, { signal })
        if (!res.ok) throw new Error(`DOB permits error: ${res.status}`)
        const rows = await res.json()

        if (!Array.isArray(rows) || signal.aborted) return

        // Deduplicate on job__ field — keep the most recent entry per job
        const seen = new Set()
        const deduped = []
        for (const row of rows) {
          const jobKey = row.job__ || `${row.filing_date}-${row.job_type}`
          if (!seen.has(jobKey)) {
            seen.add(jobKey)
            deduped.push(row)
          }
        }

        const result = deduped.slice(0, 8).map(r => {
          const h = (r.house__     || '').trim()
          const s = (r.street_name || '').trim()
          return {
            jobType:      (r.job_type || '').trim(),
            address:      h && s ? `${h} ${s}` : s || h || '',
            filingDate:   parseDobDate(r.filing_date),
            issuanceDate: parseDobDate(r.issuance_date),
            status:       (r.permit_status || '').trim(),
            description:  (r.job_description || '').trim(),
            cost:         parseFloat(r.estimated_job_costs) || 0,
          }
        })

        setPermits(result)

      } catch (err) {
        if (err.name === 'AbortError') return
        console.warn('useDobActivity fetch failed:', err.message)
      } finally {
        if (!signal.aborted) setLoading(false)
      }
    }

    fetchPermits()
    return () => controller.abort()
  }, [bbl])

  return { permits, loading }
}
