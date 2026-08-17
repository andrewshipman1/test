import { useState, useEffect } from 'react'

const ACRIS_LEGALS  = 'https://data.cityofnewyork.us/resource/8h5j-fqxa.json'
const ACRIS_MASTER  = 'https://data.cityofnewyork.us/resource/bnx9-e6tj.json'
const ACRIS_PARTIES = 'https://data.cityofnewyork.us/resource/636b-3b5g.json'

// Parse float BBL (e.g. 1007220040.0) → { borough, block, lot } as padded strings
function parseBbl(bbl) {
  const s = String(Math.round(Number(bbl))).padStart(10, '0')
  return { borough: s[0], block: s.slice(1, 6), lot: s.slice(6, 10) }
}

function fmtDocDate(dateStr) {
  if (!dateStr) return null
  return dateStr.slice(0, 10) // ISO yyyy-mm-dd
}

export function useAcrisDeeds(bbl) {
  const [lastMortgage, setLastMortgage] = useState(null)
  const [lastDeed,     setLastDeed]     = useState(null)
  const [loading,      setLoading]      = useState(false)

  useEffect(() => {
    if (!bbl) return
    const controller = new AbortController()
    const { signal } = controller

    async function fetchDeeds() {
      setLoading(true)
      setLastMortgage(null)
      setLastDeed(null)

      try {
        const { borough, block, lot } = parseBbl(bbl)

        // ── Step 1: Get document_ids for this BBL from ACRIS Legals ──
        const legalsParams = new URLSearchParams({
          borough,
          block,
          lot,
          $select: 'document_id',
          $limit:  '200',
        })
        const legalsRes = await fetch(`${ACRIS_LEGALS}?${legalsParams}`, { signal })
        if (!legalsRes.ok) throw new Error(`ACRIS Legals error: ${legalsRes.status}`)
        const legalsData = await legalsRes.json()

        if (!Array.isArray(legalsData) || legalsData.length === 0) return

        const docIds = [...new Set(legalsData.map(r => r.document_id).filter(Boolean))]
        if (docIds.length === 0) return

        // ── Step 2: Get DEED and MTGE records from ACRIS Master ──
        // Socrata IN() syntax: doc_type IN('DEED','MTGE')
        const idList = docIds.slice(0, 100).map(id => `'${id}'`).join(',')
        const masterParams = new URLSearchParams({
          $where:  `document_id IN(${idList}) AND doc_type IN('DEED','MTGE')`,
          $select: 'document_id,doc_type,document_date,doc_amount',
          $order:  'document_date DESC',
          $limit:  '50',
        })
        const masterRes = await fetch(`${ACRIS_MASTER}?${masterParams}`, { signal })
        if (!masterRes.ok) throw new Error(`ACRIS Master error: ${masterRes.status}`)
        const masterData = await masterRes.json()

        if (!Array.isArray(masterData)) return

        const mtgeRecords = masterData.filter(r => r.doc_type === 'MTGE')
        const deedRecords = masterData.filter(r => r.doc_type === 'DEED')

        // ── Step 3: Get lender name for most recent mortgage ──
        let lender = null
        const latestMtge = mtgeRecords[0]

        if (latestMtge?.document_id) {
          const partiesParams = new URLSearchParams({
            document_id: latestMtge.document_id,
            party_type:  '2',   // party_type='2' = lender on mortgage
            $select:     'name',
            $limit:      '1',
          })
          const partiesRes = await fetch(`${ACRIS_PARTIES}?${partiesParams}`, { signal })
          if (partiesRes.ok) {
            const partiesData = await partiesRes.json()
            if (Array.isArray(partiesData) && partiesData[0]?.name) {
              lender = partiesData[0].name.trim()
            }
          }
        }

        if (signal.aborted) return

        setLastMortgage(latestMtge ? {
          amount: parseFloat(latestMtge.doc_amount) || 0,
          date:   fmtDocDate(latestMtge.document_date),
          lender,
        } : null)

        setLastDeed(deedRecords[0] ? {
          date:    fmtDocDate(deedRecords[0].document_date),
          docType: deedRecords[0].doc_type,
        } : null)

      } catch (err) {
        if (err.name === 'AbortError') return
        console.warn('useAcrisDeeds fetch failed:', err.message)
      } finally {
        if (!signal.aborted) setLoading(false)
      }
    }

    fetchDeeds()
    return () => controller.abort()
  }, [bbl])

  return { lastMortgage, lastDeed, loading }
}
