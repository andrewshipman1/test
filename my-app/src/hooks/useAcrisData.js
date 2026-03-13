import { useState, useEffect } from 'react'

const ACRIS_LEGALS = 'https://data.cityofnewyork.us/resource/8h5j-fqxa.json'
const ACRIS_MASTER = 'https://data.cityofnewyork.us/resource/bnx9-e6tj.json'

const DEED_TYPES = new Set(['DEED', 'DEED, WITH COVE', 'DEED, WITH COVENANT'])

export function useAcrisComps(bbl) {
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!bbl) return
    let cancelled = false

    async function fetch_comps() {
      setLoading(true)
      setSales([])
      setError(null)
      try {
        // Step 1: Get recent deed documents for this BBL
        const legalParams = new URLSearchParams({
          bbl: String(bbl).padStart(10, '0'),
          $limit: 20,
          $order: 'document_date DESC',
          $select: 'document_id,document_date,doc_type'
        })
        const legalRes = await fetch(`${ACRIS_LEGALS}?${legalParams}`)
        if (!legalRes.ok) throw new Error(`ACRIS error: ${legalRes.status}`)
        const legals = await legalRes.json()

        // Step 2: Filter to deed transfers only
        const deedLegals = legals.filter(l =>
          DEED_TYPES.has((l.doc_type || '').toUpperCase().trim())
        ).slice(0, 5)

        if (deedLegals.length === 0) {
          if (!cancelled) setSales([])
          return
        }

        // Step 3: Fetch sale prices from master records
        const docIds = deedLegals.map(l => `'${l.document_id}'`).join(',')
        const masterParams = new URLSearchParams({
          $where: `document_id IN (${docIds})`,
          $select: 'document_id,doc_type,document_date,consideration',
          $limit: 20
        })
        const masterRes = await fetch(`${ACRIS_MASTER}?${masterParams}`)
        if (!masterRes.ok) throw new Error(`ACRIS master error: ${masterRes.status}`)
        const masters = await masterRes.json()

        // Step 4: Join and format
        const masterMap = Object.fromEntries(masters.map(m => [m.document_id, m]))
        const result = deedLegals
          .map(l => {
            const m = masterMap[l.document_id]
            const price = m ? parseFloat(m.consideration) : 0
            return {
              date: (m?.document_date || l.document_date || '').slice(0, 10),
              price,
              doc_type: m?.doc_type || l.doc_type,
            }
          })
          .filter(s => s.price > 10000)  // filter out $0 transfers, intra-family, etc.
          .slice(0, 4)

        if (!cancelled) setSales(result)
      } catch (err) {
        console.warn('ACRIS fetch failed:', err.message)
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetch_comps()
    return () => { cancelled = true }
  }, [bbl])

  return { sales, loading, error }
}
