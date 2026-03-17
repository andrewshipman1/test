// ─── Owner Portfolio (standalone) ────────────────────────────────────────────
// Extracted from hooks/useOwnerPortfolio.js

const NYC_API = 'https://data.cityofnewyork.us/resource/64uk-42ks.json'

export async function fetchOwnerPortfolio(ownerName, excludeBbl) {
  const name = (ownerName || '').trim()
  if (!name) return { portfolio: [], count: 0 }

  const params = new URLSearchParams({
    borough: 'MN',
    $where:  `LOWER(ownername)=LOWER('${name.replace(/'/g, "''")}')`,
    $select: 'bbl,address,zonedist1,lotarea,residfar,builtfar,landuse,latitude,longitude',
    $limit:  '60',
    $order:  'lotarea DESC',
  })

  const res = await fetch(`${NYC_API}?${params}`)
  if (!res.ok) throw new Error('PLUTO error')
  const data = await res.json()

  const currentKey = excludeBbl ? String(Math.round(Number(excludeBbl))) : null

  const portfolio = data
    .filter(d => {
      const bblKey = String(Math.round(parseFloat(d.bbl)))
      return (!currentKey || bblKey !== currentKey) && parseFloat(d.latitude) && parseFloat(d.longitude)
    })
    .map(d => ({
      bbl:      String(Math.round(parseFloat(d.bbl))),
      address:  d.address || '',
      zone:     d.zonedist1 || '',
      lotArea:  Math.round(parseFloat(d.lotarea) || 0),
      resFar:   parseFloat(d.residfar) || 0,
      builtFar: parseFloat(d.builtfar) || 0,
      landUse:  (d.landuse || '').padStart(2, '0'),
      lat:      parseFloat(d.latitude)  || null,
      lng:      parseFloat(d.longitude) || null,
    }))

  return { portfolio, count: portfolio.length }
}
