import { useState, useEffect } from 'react'

const HPD_VIOLATIONS_API = 'https://data.cityofnewyork.us/resource/wvxf-dwi5.json'

// Parse float BBL → 10-digit padded string (HPD uses this format)
function bblTo10(bbl) {
  return String(Math.round(Number(bbl))).padStart(10, '0')
}

export function useHpdViolations(bbl) {
  const [openCount, setOpenCount] = useState(0)
  const [byClass,   setByClass]   = useState({ A: 0, B: 0, C: 0 })
  const [recent,    setRecent]    = useState([])
  const [loading,   setLoading]   = useState(false)

  useEffect(() => {
    if (!bbl) return
    const controller = new AbortController()
    const { signal } = controller

    async function fetchViolations() {
      setLoading(true)
      setOpenCount(0)
      setByClass({ A: 0, B: 0, C: 0 })
      setRecent([])

      try {
        const bbl10 = bblTo10(bbl)

        const params = new URLSearchParams({
          $where:  `bbl='${bbl10}' AND violationstatus='Open'`,
          $select: 'violationid,class,novdescription,novissueddate,violationstatus',
          $order:  'novissueddate DESC',
          $limit:  '20',
        })

        const res = await fetch(`${HPD_VIOLATIONS_API}?${params}`, { signal })
        if (!res.ok) throw new Error(`HPD violations error: ${res.status}`)
        const rows = await res.json()

        if (!Array.isArray(rows) || signal.aborted) return

        const counts = { A: 0, B: 0, C: 0 }
        rows.forEach(r => {
          const cls = (r.class || '').toUpperCase()
          if (cls in counts) counts[cls]++
        })

        const recentItems = rows.slice(0, 3).map(r => ({
          class:       (r.class || '').toUpperCase(),
          description: (r.novdescription || '').trim(),
          issuedDate:  r.novissueddate ? r.novissueddate.slice(0, 10) : null,
        }))

        setOpenCount(rows.length)
        setByClass(counts)
        setRecent(recentItems)

      } catch (err) {
        if (err.name === 'AbortError') return
        console.warn('useHpdViolations fetch failed:', err.message)
      } finally {
        if (!signal.aborted) setLoading(false)
      }
    }

    fetchViolations()
    return () => controller.abort()
  }, [bbl])

  return { openCount, byClass, recent, loading }
}
