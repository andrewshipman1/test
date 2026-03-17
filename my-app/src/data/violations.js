// ─── HPD Violations (standalone) ─────────────────────────────────────────────
// Extracted from hooks/useHpdViolations.js

const HPD_VIOLATIONS_API = 'https://data.cityofnewyork.us/resource/wvxf-dwi5.json'

function bblTo10(bbl) {
  return String(Math.round(Number(bbl))).padStart(10, '0')
}

export async function fetchViolations(bbl) {
  const bbl10 = bblTo10(bbl)

  const params = new URLSearchParams({
    $where:  `bbl='${bbl10}' AND violationstatus='Open'`,
    $select: 'violationid,class,novdescription,novissueddate,violationstatus',
    $order:  'novissueddate DESC',
    $limit:  '20',
  })

  const res = await fetch(`${HPD_VIOLATIONS_API}?${params}`)
  if (!res.ok) throw new Error(`HPD violations error: ${res.status}`)
  const rows = await res.json()

  if (!Array.isArray(rows)) return { openCount: 0, byClass: { A: 0, B: 0, C: 0 }, recent: [] }

  const counts = { A: 0, B: 0, C: 0 }
  rows.forEach(r => {
    const cls = (r.class || '').toUpperCase()
    if (cls in counts) counts[cls]++
  })

  const recent = rows.slice(0, 3).map(r => ({
    class:       (r.class || '').toUpperCase(),
    description: (r.novdescription || '').trim(),
    issuedDate:  r.novissueddate ? r.novissueddate.slice(0, 10) : null,
  }))

  return { openCount: rows.length, byClass: counts, recent }
}
