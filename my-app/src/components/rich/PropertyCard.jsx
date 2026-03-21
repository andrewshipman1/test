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
  INSTITUTIONAL: 'Institutional',
}

export default function PropertyCard({ bbl, onCardClick }) {
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
    <div className="prop-card" data-bbl={bbl} onClick={() => onCardClick?.(bbl)} style={{ cursor: onCardClick ? 'pointer' : undefined }}>
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
        {(property.latitude || property.coordinates) && (
          <a
            className="prop-card-map-link"
            href={`https://www.google.com/maps/@${property.latitude || property.coordinates?.[1]},${property.longitude || property.coordinates?.[0]},18z`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
          >MAP</a>
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
        {property.retail_area > 0 && (
          <div className="prop-card-cell">
            <div className="prop-card-label">RETAIL</div>
            <div className="prop-card-value">{formatNum(property.retail_area)} SF</div>
          </div>
        )}
      </div>

      {/* Risk flags */}
      <div className="prop-card-flags">
        {property.owner_type === 'X' && (
          <span className="prop-card-flag flag-warn">NONPROFIT / TAX-EXEMPT</span>
        )}
        {(property.owner_type === 'C' || property.owner_type === 'O') && (
          <span className="prop-card-flag flag-warn">GOVERNMENT-OWNED</span>
        )}
        {(property.rent_stab_confirmed || property.rent_stab_risk) && (
          <span className="prop-card-flag flag-warn">
            {property.rent_stab_confirmed ? 'RENT STABILIZED (HPD)' : 'LIKELY RENT STABILIZED'}
          </span>
        )}
        {property.has_landmark && (
          <span className="prop-card-flag flag-warn">LANDMARK</span>
        )}
        {property.retail_area > 5000 && (
          <span className="prop-card-flag flag-warn">HIGH RETAIL EXPOSURE</span>
        )}
      </div>
    </div>
  )
}
