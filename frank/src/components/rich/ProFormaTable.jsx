import './ProFormaTable.css'

function fmt(n) {
  if (n == null) return '—'
  return '$' + Math.round(n).toLocaleString()
}

export default function ProFormaTable({ data }) {
  if (!data) return null

  const { buildableSF, selloutPsf, landResidual } = data

  // If we only have the marker data (SF, PSF, residual), show compact
  return (
    <div className="proforma-table">
      <div className="proforma-header">
        <span className="proforma-title">CONDO PRO FORMA</span>
      </div>
      <div className="proforma-grid">
        <div className="proforma-row">
          <span className="proforma-label">Buildable SF</span>
          <span className="proforma-value">{Math.round(buildableSF).toLocaleString()} SF</span>
        </div>
        <div className="proforma-row">
          <span className="proforma-label">Sellout $/SF</span>
          <span className="proforma-value">{fmt(selloutPsf)}</span>
        </div>
        <div className="proforma-row">
          <span className="proforma-label">Gross Sellout</span>
          <span className="proforma-value">{fmt(buildableSF * selloutPsf)}</span>
        </div>
        <div className="proforma-divider" />
        <div className="proforma-row proforma-row-result">
          <span className="proforma-label">Land Residual</span>
          <span className="proforma-value proforma-value-highlight">{fmt(landResidual)}</span>
        </div>
      </div>
    </div>
  )
}
