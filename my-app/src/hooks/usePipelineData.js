import { useState, useEffect } from 'react'

// DOB Permit Issuance dataset — has gis_latitude/gis_longitude directly
const DOB_API = 'https://data.cityofnewyork.us/resource/ipu4-2q9a.json'

const BOROUGH_CODE = {
  MANHATTAN:  '1',
  BRONX:      '2',
  BROOKLYN:   '3',
  QUEENS:     '4',
  'STATEN IS': '5',
}

function buildBbl(row) {
  const code  = BOROUGH_CODE[row.borough] || '1'
  const block = String(row.block || '').replace(/^0+/, '') || '0'
  const lot   = String(row.lot   || '').replace(/^0+/, '') || '0'
  return `${code}${block.padStart(5, '0')}${lot.padStart(4, '0')}`
}

function buildAddress(row) {
  const h = (row.house__ || '').trim()
  const s = (row.street_name || '').trim()
  if (h && s) return `${h} ${s}`
  return s || h || ''
}

export function usePipelineData() {
  const [permits, setPermits] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const fields = '$select=borough,block,lot,house__,street_name,job_type,issuance_date,gis_latitude,gis_longitude,permit_status,bldg_type'

        const [nbRes, dmRes] = await Promise.all([
          fetch(`${DOB_API}?$where=job_type='NB' AND borough='MANHATTAN' AND gis_latitude IS NOT NULL&${fields}&$limit=3000&$order=issuance_date DESC`),
          fetch(`${DOB_API}?$where=job_type='DM' AND borough='MANHATTAN' AND gis_latitude IS NOT NULL&${fields}&$limit=1500&$order=issuance_date DESC`),
        ])

        const [nbData, dmData] = await Promise.all([nbRes.json(), dmRes.json()])

        const normalize = (row, type) => ({
          bbl:        buildBbl(row),
          type,
          address:    buildAddress(row),
          filingDate: row.issuance_date ? row.issuance_date.slice(0, 10) : null,
          status:     row.permit_status || '',
          description: type === 'NB' ? 'New construction permit' : 'Demolition — site being cleared',
          lat:  Number(row.gis_latitude)  || null,
          lng:  Number(row.gis_longitude) || null,
        })

        const nb = Array.isArray(nbData) ? nbData.map(r => normalize(r, 'NB')) : []
        const dm = Array.isArray(dmData) ? dmData.map(r => normalize(r, 'DM')) : []

        // Sort newest first; nulls to end
        const all = [...nb, ...dm].sort((a, b) =>
          (b.filingDate || '').localeCompare(a.filingDate || '')
        )

        setPermits(all)
      } catch (err) {
        console.warn('Pipeline data fetch failed:', err)
        setPermits([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const nbCount = permits.filter(p => p.type === 'NB').length
  const dmCount = permits.filter(p => p.type === 'DM').length

  return { permits, loading, summary: { nbCount, dmCount } }
}
