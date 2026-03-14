import { useState, useEffect } from 'react'

const DOB_API = 'https://data.cityofnewyork.us/resource/ipu4-2q9a.json'

function formatCost(costStr) {
  const n = Number(costStr)
  if (!n || n < 1000) return null
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`
  return `$${Math.round(n / 1e3)}K`
}

export function usePipelineData() {
  const [permits, setPermits] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const now = new Date()
        const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate())
          .toISOString().slice(0, 10)
        const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
          .toISOString().slice(0, 10)

        const fields = '$select=bbl,job_type,filing_date,initial_cost,job_status,job_description,building_type'

        const [nbRes, dmRes] = await Promise.all([
          fetch(`${DOB_API}?$where=job_type='NB' AND filing_date >= '${twoYearsAgo}T00:00:00.000'&${fields}&$limit=5000&$order=filing_date DESC`),
          fetch(`${DOB_API}?$where=job_type='DM' AND filing_date >= '${oneYearAgo}T00:00:00.000'&${fields}&$limit=2000&$order=filing_date DESC`),
        ])

        const [nbData, dmData] = await Promise.all([nbRes.json(), dmRes.json()])

        const normalize = (row, type) => ({
          bbl: String(Math.round(Number(row.bbl || 0))).padStart(10, '0'),
          type,
          filingDate: row.filing_date ? row.filing_date.slice(0, 10) : null,
          cost: formatCost(row.initial_cost),
          rawCost: Number(row.initial_cost) || 0,
          status: row.job_status || '',
          description: (row.job_description || row.building_type || '').slice(0, 80),
        })

        const nb = Array.isArray(nbData) ? nbData.map(r => normalize(r, 'NB')) : []
        const dm = Array.isArray(dmData) ? dmData.map(r => normalize(r, 'DM')) : []

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
