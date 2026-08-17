// ─── DOB Permits (standalone) ────────────────────────────────────────────────
// Extracted from hooks/useDobActivity.js

const DOB_PERMITS_API = 'https://data.cityofnewyork.us/resource/ipu4-2q9a.json'

function parseBblForDob(bbl) {
  const s = String(Math.round(Number(bbl))).padStart(10, '0')
  const block = String(parseInt(s.slice(1, 6), 10))
  const lot   = String(parseInt(s.slice(6, 10), 10))
  return { block, lot }
}

function parseDobDate(dateStr) {
  if (!dateStr) return null
  if (dateStr.includes('T')) return dateStr.slice(0, 10)
  const parts = dateStr.split('/')
  if (parts.length === 3) {
    const [m, d, y] = parts
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  return null
}

export async function fetchPermits(bbl) {
  const { block, lot } = parseBblForDob(bbl)

  const params = new URLSearchParams({
    $where:  `block='${block}' AND lot='${lot}' AND borough='MANHATTAN'`,
    $select: 'job__,job_type,house__,street_name,filing_date,issuance_date,permit_status,job_description,estimated_job_costs',
    $order:  'filing_date DESC',
    $limit:  '25',
  })

  const res = await fetch(`${DOB_PERMITS_API}?${params}`)
  if (!res.ok) throw new Error(`DOB permits error: ${res.status}`)
  const rows = await res.json()

  if (!Array.isArray(rows)) return { permits: [] }

  // Deduplicate on job__ field
  const seen = new Set()
  const deduped = []
  for (const row of rows) {
    const jobKey = row.job__ || `${row.filing_date}-${row.job_type}`
    if (!seen.has(jobKey)) {
      seen.add(jobKey)
      deduped.push(row)
    }
  }

  const permits = deduped.slice(0, 5).map(r => {
    const desc = (r.job_description || '').trim()
    return {
      jobType:      (r.job_type || '').trim(),
      filingDate:   parseDobDate(r.filing_date),
      status:       (r.permit_status || '').trim(),
      description:  desc.length > 80 ? desc.slice(0, 80) + '...' : desc,
      cost:         parseFloat(r.estimated_job_costs) || 0,
    }
  })

  return { permits }
}
