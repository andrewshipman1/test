import { useState, useEffect } from 'react'

const NYC_API = 'https://data.cityofnewyork.us/resource/64uk-42ks.json'

export function useOwnerPortfolio(ownerName, currentBbl) {
  const [portfolio, setPortfolio] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const name = (ownerName || '').trim()
    if (!name) { setPortfolio([]); return }

    let cancelled = false

    async function load() {
      setLoading(true)
      setPortfolio([])
      try {
        // Case-insensitive exact match on ownername, Manhattan only
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

        if (!cancelled) {
          const currentKey = String(Math.round(Number(currentBbl || 0)))
          setPortfolio(
            data
              .filter(d => {
                const bblKey = String(Math.round(parseFloat(d.bbl)))
                return bblKey !== currentKey && parseFloat(d.latitude) && parseFloat(d.longitude)
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
          )
        }
      } catch {
        if (!cancelled) setPortfolio([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [ownerName]) // eslint-disable-line react-hooks/exhaustive-deps

  return { portfolio, count: portfolio.length, loading }
}
