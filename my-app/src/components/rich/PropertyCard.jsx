import { useEffect, useState } from 'react'
import { getPropertyDetail } from '../../data/pluto.js'
import './PropertyCard.css'

function formatNum(n) {
  if (n == null) return '—'
  return n.toLocaleString()
}

function scoreClass(score) {
  if (score >= 85) return 'score-signal'
  if (score >= 60) return 'score-high'
  if (score >= 40) return 'score-medium'
  return 'score-low'
}

const DEAL_LABELS = {
  VACANT: 'Vacant',
  GARAGE: 'Garage',
  TEARDOWN: 'Teardown',
  COMMERCIAL: 'Commercial',
  CONVERSION: 'Conversion',
  CONDO: 'Condo',
  COOP: 'Co-op',
}

export default function PropertyCard({ bbl }) {
  const [property, setProperty] = useState(null)

  useEffect(() => {
    if (!bbl) return
    getPropertyDetail(bbl).then(data => {
      if (!data.error) setProperty(data)
    })
  }, [bbl])

  if (!property) {
    return (
      <div className="prop-card prop-card-loading">
        <span>Loading property...</span>
      </div>
    )
  }

  return (
    <div className="prop-card">
      <div className="prop-card-header">
        <div className="prop-card-address">{property.address || 'No address'}</div>
        <div className={`prop-card-score ${scoreClass(property.score)}`}>
          {property.score}
        </div>
      </div>

      <div className="prop-card-meta">
        <span className="prop-card-bbl">{property.bbl}</span>
        <span className="prop-card-deal">{DEAL_LABELS[property.deal_type] || property.deal_type}</span>
        {property.neighborhood && (
          <span className="prop-card-nbhd">{property.neighborhood}</span>
        )}
      </div>

      <div className="prop-card-grid">
        {property.lot_area != null && (
          <div className="prop-card-cell">
            <div className="prop-card-label">LOT AREA</div>
            <div className="prop-card-value">{formatNum(property.lot_area)} SF</div>
          </div>
        )}
        {property.available_far_sqft != null && (
          <div className="prop-card-cell">
            <div className="prop-card-label">BUILDABLE</div>
            <div className="prop-card-value">{formatNum(property.available_far_sqft)} SF</div>
          </div>
        )}
        {property.zone_dist && (
          <div className="prop-card-cell">
            <div className="prop-card-label">ZONING</div>
            <div className="prop-card-value">{property.zone_dist}</div>
          </div>
        )}
        {property.res_far != null && (
          <div className="prop-card-cell">
            <div className="prop-card-label">MAX FAR</div>
            <div className="prop-card-value">{property.res_far}</div>
          </div>
        )}
        {property.built_far != null && (
          <div className="prop-card-cell">
            <div className="prop-card-label">BUILT FAR</div>
            <div className="prop-card-value">{property.built_far}</div>
          </div>
        )}
        {property.num_floors != null && (
          <div className="prop-card-cell">
            <div className="prop-card-label">FLOORS</div>
            <div className="prop-card-value">{property.num_floors}</div>
          </div>
        )}
      </div>

      {/* Risk flags */}
      <div className="prop-card-flags">
        {property.rent_stab_risk && (
          <span className="prop-card-flag flag-warn">RENT STABILIZED</span>
        )}
        {property.has_landmark && (
          <span className="prop-card-flag flag-warn">LANDMARK</span>
        )}
        {property.retail_area > 0 && (
          <span className="prop-card-flag flag-info">RETAIL: {formatNum(property.retail_area)} SF</span>
        )}
      </div>
    </div>
  )
}
