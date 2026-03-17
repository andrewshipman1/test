// ─── Market Comps (standalone) ───────────────────────────────────────────────
// Extracted from hooks/useAcrisData.js

const DOF_SALES_API = 'https://data.cityofnewyork.us/resource/usep-8jbt.json'

function parseBBL(bbl) {
  const s = String(Math.round(Number(bbl))).padStart(10, '0')
  return {
    borough: parseInt(s[0], 10),
    block:   parseInt(s.slice(1, 6), 10),
    lot:     parseInt(s.slice(6), 10),
  }
}

export async function fetchMarketComps(bbl) {
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

  const sales = rows
    .map(r => ({
      date:  (r.sale_date || '').slice(0, 10),
      price: parseFloat(r.sale_price) || 0,
      bldg_class: r.building_class_at_time_of || '',
    }))
    .filter(s => s.price > 10000)
    .slice(0, 4)

  return { sales }
}
