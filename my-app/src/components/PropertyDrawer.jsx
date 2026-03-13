import { useState, useEffect } from 'react'
import { X, Plus, Check, AlertTriangle, Building2, TrendingUp, User, DollarSign, Layers, Bookmark, BookmarkCheck, Copy, CheckCheck, TrendingDown, Calculator, RotateCcw } from 'lucide-react'
import { NEIGHBORHOOD_PSF } from '../hooks/usePlutoData'
import { useAcrisComps } from '../hooks/useAcrisData'
import { DEFAULT_ASSUMPTIONS, computeCondoProForma } from '../hooks/useUnderwritingAssumptions'
import './PropertyDrawer.css'

// ─── Helpers ────────────────────────────────────────────────────────────────

const DEAL_TYPE_CONFIG = {
  VACANT:     { label: 'Vacant Land',      color: '#22c55e', bg: '#22c55e18' },
  TEARDOWN:   { label: 'Teardown',         color: '#f97316', bg: '#f9731618' },
  GARAGE:     { label: 'Garage / Parking', color: '#f59e0b', bg: '#f59e0b18' },
  CONVERSION: { label: 'Conversion Play',  color: '#8b5cf6', bg: '#8b5cf618' },
  COMMERCIAL: { label: 'Commercial',       color: '#06b6d4', bg: '#06b6d418' },
  COOP:       { label: '⚠️ Co-op',         color: '#ef4444', bg: '#ef444418' },
  CONDO:      { label: '⚠️ Condo',         color: '#ef4444', bg: '#ef444418' },
}

const LAND_USE_LABELS = {
  '01': 'One & Two Family', '02': 'Multi-Family Walk-Up',
  '03': 'Multi-Family Elevator', '04': 'Mixed Residential & Commercial',
  '05': 'Commercial & Office', '06': 'Industrial & Manufacturing',
  '07': 'Transportation & Utility', '08': 'Public Facilities',
  '09': 'Open Space', '10': 'Parking Facilities', '11': 'Vacant Land',
}

function fmt(n)  { return Number(n || 0).toLocaleString() }
function fmtM(n) { return `$${(n / 1e6).toFixed(1)}M` }

function formatBBL(bbl) {
  const s = String(Math.round(Number(bbl))).padStart(10, '0')
  return `${s[0]}-${s.slice(1, 6)}-${s.slice(6)}`
}

function scoreColor(s) {
  return s >= 80 ? '#ef4444' : s >= 60 ? '#f97316' : s >= 40 ? '#f59e0b' : '#eab308'
}

function fmtDate(iso) {
  if (!iso) return '—'
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${m}/${d}/${y}`
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function RiskFlag({ icon, label, color, desc }) {
  return (
    <div className="risk-flag" style={{ borderColor: `${color}33`, background: `${color}0d` }}>
      <span style={{ fontSize: 14 }}>{icon}</span>
      <div>
        <div className="risk-flag-label" style={{ color }}>{label}</div>
        {desc && <div className="risk-flag-desc">{desc}</div>}
      </div>
    </div>
  )
}

function MetricBox({ label, value, sub, accent }) {
  return (
    <div className={`metric-box ${accent ? 'accent' : ''}`}>
      <div className="metric-value" style={accent ? { color: '#f59e0b' } : {}}>{value || '—'}</div>
      <div className="metric-label">{label}</div>
      {sub && <div className="metric-sub">{sub}</div>}
    </div>
  )
}

function InfoRow({ label, value, highlight }) {
  return (
    <div className="info-row">
      <span className="info-row-label">{label}</span>
      <span className="info-row-value" style={highlight ? { color: '#f59e0b', fontWeight: 600 } : {}}>{value || '—'}</span>
    </div>
  )
}

function ScoreBar({ label, points, max, value }) {
  const pct = max > 0 ? points / max : 0
  const color = pct >= 0.8 ? '#ef4444' : pct >= 0.5 ? '#f97316' : pct > 0 ? '#f59e0b' : '#2a2a3a'
  return (
    <div className="score-bar-row">
      <div className="score-bar-header">
        <span className="score-bar-label">{label}</span>
        <span className="score-bar-pts" style={{ color }}>{points}/{max}</span>
      </div>
      <div className="score-bar-track">
        <div className="score-bar-fill" style={{ width: `${pct * 100}%`, background: color }} />
      </div>
      <div className="score-bar-value">{value}</div>
    </div>
  )
}

// A single line in the pro forma table
function PfRow({ label, value, indent, subtotal, total, positive, muted, dimmed }) {
  return (
    <div className={`pf-row ${subtotal ? 'pf-subtotal' : ''} ${total ? 'pf-total' : ''} ${dimmed ? 'pf-dimmed' : ''}`}>
      <span className={`pf-label ${indent ? 'pf-indent' : ''}`}>{label}</span>
      <span className={`pf-value ${positive ? 'pf-positive' : ''} ${muted ? 'pf-muted' : ''}`}>{value}</span>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function PropertyDrawer({
  property, onClose, assemblageLots, setAssemblageLots, isSaved, toggleSave,
  globalAssumptions, getPropertyAssumptions, setPropertyOverride, clearPropertyOverride, hasOverride,
}) {
  // All hooks MUST come before any conditional returns (Rules of Hooks)
  const [copied, setCopied]       = useState(false)
  const [showOverrides, setShowOverrides] = useState(false)
  const { sales, loading: salesLoading } = useAcrisComps(property?.bbl)

  // Local editable values for per-property PSF / hard cost overrides
  const [localPsf,      setLocalPsf]      = useState(null)
  const [localHardCost, setLocalHardCost] = useState(null)

  // Re-initialize local override state when property changes
  useEffect(() => {
    if (!property) return
    const a = getPropertyAssumptions ? getPropertyAssumptions(property.bbl) : (globalAssumptions || DEFAULT_ASSUMPTIONS)
    const nbhd = NEIGHBORHOOD_PSF[property.zipcode] || { psf: 2500 }
    setLocalPsf(a.selloutPsf ?? nbhd.psf)
    setLocalHardCost(a.hardCostPerSF ?? (globalAssumptions?.hardCostPerSF ?? DEFAULT_ASSUMPTIONS.hardCostPerSF))
    setShowOverrides(false)
  }, [property?.bbl]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!property) return null

  // ── Resolved assumptions for this property ──
  const baseAssumptions = globalAssumptions || DEFAULT_ASSUMPTIONS
  const propAssumptions = getPropertyAssumptions ? getPropertyAssumptions(property.bbl) : baseAssumptions
  const isOverridden    = hasOverride ? hasOverride(property.bbl) : false

  const nbhd     = NEIGHBORHOOD_PSF[property.zipcode] || { name: 'Manhattan', psf: 2500 }
  const activePsf      = localPsf      ?? propAssumptions.selloutPsf ?? nbhd.psf
  const activeHardCost = localHardCost ?? propAssumptions.hardCostPerSF ?? baseAssumptions.hardCostPerSF

  const activeAssumptions = { ...baseAssumptions, ...propAssumptions, hardCostPerSF: activeHardCost }

  // ── Core numbers ──
  const saved    = isSaved ? isSaved(property.bbl) : false
  const isInAssemblage = assemblageLots.some(l => l.bbl === property.bbl)
  const isCoop   = property.deal_type === 'COOP'
  const isCondo  = property.deal_type === 'CONDO'

  const lotArea      = Number(property.lot_area)  || 0
  const residFar     = Number(property.res_far)   || 0
  const builtFar     = Number(property.built_far) || 0
  const floors       = Number(property.num_floors) || 0
  const maxBuildable = Math.round(residFar * lotArea)
  const availFAR     = Math.round(Math.max(0, (residFar - builtFar) * lotArea))
  const farUtil      = residFar > 0 ? builtFar / residFar : 1
  const score        = Number(property.score) || 0
  const assessedValue = Number(property.assess_total) || 0

  // ── Condo Pro Forma ──
  const pf = computeCondoProForma(maxBuildable, activePsf, activeAssumptions)
  const residualPerLotSF = pf && lotArea > 0 ? Math.round(pf.landResidual / lotArea) : 0
  const residualVsAssessed = pf && assessedValue > 0 ? (pf.landResidual / assessedValue).toFixed(1) : null
  const residualIsStrong = residualVsAssessed && parseFloat(residualVsAssessed) >= 2

  const dtConfig = DEAL_TYPE_CONFIG[property.deal_type] || DEAL_TYPE_CONFIG.TEARDOWN

  const scoreComponents = [
    {
      label: 'Development Rights',
      points: availFAR > 50000 ? 30 : availFAR > 20000 ? 20 : availFAR > 5000 ? 10 : 0,
      max: 30,
      value: availFAR > 0 ? `${fmt(availFAR)} SF unused` : 'Fully built out',
    },
    {
      label: 'Land Status',
      points: property.land_use === '11' ? 25 : 0,
      max: 25,
      value: property.land_use === '11' ? 'Vacant' : 'Improved lot',
    },
    {
      label: 'Underutilization',
      points: farUtil < 0.5 && residFar > 2 ? 20 : farUtil < 0.75 ? 10 : 0,
      max: 20,
      value: residFar > 0 ? `${Math.round(farUtil * 100)}% of FAR utilized` : 'N/A',
    },
    {
      label: 'Teardown Potential',
      points: floors < 3 && residFar >= 5 ? 15 : 0,
      max: 15,
      value: floors > 0 ? `${floors} floors on FAR ${residFar} zone` : '—',
    },
    {
      label: 'Zoning Density',
      points: residFar >= 10 ? 10 : residFar >= 6 ? 5 : 0,
      max: 10,
      value: `FAR ${residFar || '—'} allowed`,
    },
  ]

  const toggleAssemblage = () => {
    if (isInAssemblage) {
      setAssemblageLots(prev => prev.filter(l => l.bbl !== property.bbl))
    } else {
      setAssemblageLots(prev => [...prev, property])
    }
  }

  const handlePsfChange = (val) => {
    setLocalPsf(val)
    if (setPropertyOverride) setPropertyOverride(property.bbl, 'selloutPsf', val)
  }

  const handleHardCostChange = (val) => {
    setLocalHardCost(val)
    if (setPropertyOverride) setPropertyOverride(property.bbl, 'hardCostPerSF', val)
  }

  const handleClearOverrides = () => {
    if (clearPropertyOverride) clearPropertyOverride(property.bbl)
    const nbhdPsf = nbhd.psf
    setLocalPsf(nbhdPsf)
    setLocalHardCost(baseAssumptions.hardCostPerSF)
  }

  const handleCopy = () => {
    const lines = [
      `${property.address || 'No Address'} — BBL ${formatBBL(property.bbl)}`,
      `Deal Type: ${dtConfig.label} | Score: ${score}`,
      `${nbhd.name} | $${activePsf.toLocaleString()}/SF sellout`,
      '',
      'THE BUILD',
      `  Lot: ${fmt(lotArea)} SF | Max Buildable: ${fmt(maxBuildable)} SF | Unused FAR: ${fmt(availFAR)} SF`,
      `  Zone: ${property.zone_dist || '—'} | Res FAR: ${residFar || '—'} | Built FAR: ${builtFar || '—'}`,
      '',
    ]
    if (pf) {
      lines.push(
        'CONDO PRO FORMA (EST.)',
        `  Gross Sellout:    ${fmtM(pf.grossSellout)}`,
        `  − Broker/Mktg:   −${fmtM(pf.brokerCost)} (${activeAssumptions.brokerPct}%)`,
        `  − Hard Costs:    −${fmtM(pf.hardCosts)} ($${activeHardCost}/SF)`,
        `  − Soft Costs:    −${fmtM(pf.softCosts)} (${activeAssumptions.softCostPct}%)`,
        `  − Carry:         −${fmtM(pf.carryCosts)} (${activeAssumptions.carryPct}%)`,
        `  − Dev Profit:    −${fmtM(pf.devProfit)} (${activeAssumptions.profitTargetPct}%)`,
        `  = Land Residual:  ${fmtM(pf.landResidual)}`,
        `  Residual/Lot SF:  $${residualPerLotSF.toLocaleString()}`,
        residualVsAssessed ? `  vs Assessed:      ${residualVsAssessed}×` : '',
        '',
      )
    }
    lines.push(
      'OWNERSHIP',
      `  Owner: ${property.owner_name || '—'} | Units: ${property.units_res || 0}`,
      '',
      'Source: NYC PLUTO + ATLAS',
    )

    navigator.clipboard.writeText(lines.filter(l => l !== null).join('\n')).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="property-drawer">

      {/* ── Header ── */}
      <div className="drawer-header">
        <div className="drawer-header-top">
          <div>
            <div className="drawer-address">{property.address || 'No Address'}</div>
            <div className="drawer-neighborhood">{nbhd.name} · BBL {formatBBL(property.bbl)}</div>
          </div>
          <div className="drawer-header-actions">
            <button
              className={`header-icon-btn ${saved ? 'active-save' : ''}`}
              onClick={() => toggleSave && toggleSave(property)}
              title={saved ? 'Remove from saved' : 'Save property'}
            >
              {saved ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
            </button>
            <button
              className={`header-icon-btn ${copied ? 'active-copy' : ''}`}
              onClick={handleCopy}
              title="Copy deal brief"
            >
              {copied ? <CheckCheck size={15} /> : <Copy size={15} />}
            </button>
            <button className="close-btn" onClick={onClose}><X size={16} /></button>
          </div>
        </div>

        <div className="drawer-header-tags">
          <div className="deal-type-tag" style={{ color: dtConfig.color, background: dtConfig.bg, borderColor: `${dtConfig.color}33` }}>
            {dtConfig.label}
          </div>
          <div className="score-tag" style={{ color: scoreColor(score), background: `${scoreColor(score)}18`, borderColor: `${scoreColor(score)}33` }}>
            Score {score}
          </div>
        </div>
      </div>

      <div className="drawer-body">

        {/* ── Risk Flags ── */}
        {(isCoop || isCondo || property.rent_stab_risk || property.has_landmark) && (
          <div className="drawer-section">
            <div className="section-header"><AlertTriangle size={13} color="#ef4444" /> Deal Considerations</div>
            <div className="risk-flags">
              {isCoop  && <RiskFlag icon="🚫" color="#ef4444" label="Co-op Building"      desc="Shares owned, not land — extremely difficult to redevelop" />}
              {isCondo && <RiskFlag icon="⚠️" color="#ef4444" label="Condominium"         desc="Must buy out all individual unit owners to redevelop" />}
              {property.rent_stab_risk && <RiskFlag icon="🏘️" color="#f97316" label="Likely Rent Stabilized" desc="Pre-1974 rental building — significant tenant buyout costs" />}
              {property.has_landmark   && <RiskFlag icon="🏛️" color="#3b82f6" label="Landmark Designation"   desc="LPC approval required — may have transferable air rights (TDR)" />}
            </div>
          </div>
        )}

        {/* ── The Build ── */}
        <div className="drawer-section">
          <div className="section-header"><Building2 size={13} /> The Build</div>
          <div className="metrics-grid-4">
            <MetricBox label="Lot Area"      value={`${fmt(lotArea)} SF`} />
            <MetricBox label="Max Buildable" value={`${fmt(maxBuildable)} SF`} accent />
            <MetricBox label="Unused FAR"    value={availFAR > 0 ? `${fmt(availFAR)} SF` : 'None'} accent={availFAR > 10000} />
            <MetricBox label="Est. Floors"   value={maxBuildable > 0 && lotArea > 0 ? `~${Math.round((maxBuildable / lotArea) * 0.9)}` : '—'} />
          </div>
          <div className="info-rows" style={{ marginTop: 8 }}>
            <InfoRow label="Zoning District"    value={property.zone_dist} />
            <InfoRow label="Max Residential FAR" value={residFar || '—'} />
            <InfoRow label="Built FAR"           value={builtFar || '—'} />
            <InfoRow label="FAR Utilization"     value={residFar > 0 ? `${Math.round(farUtil * 100)}%` : '—'} highlight={farUtil < 0.5} />
            <InfoRow label="Lot Dimensions"      value={property.lot_front && property.lot_depth ? `${property.lot_front}' × ${property.lot_depth}'` : '—'} />
            <InfoRow label="Existing Building"   value={property.bldg_area ? `${fmt(property.bldg_area)} SF` : 'None'} />
            <InfoRow label="Year Built"          value={property.year_built > 0 ? property.year_built : 'N/A'} />
            <InfoRow label="Land Use"            value={LAND_USE_LABELS[property.land_use] || property.land_use} />
          </div>
        </div>

        {/* ── Condo Pro Forma ── */}
        <div className="drawer-section">
          <div className="section-header">
            <Calculator size={13} /> Condo Pro Forma
            {isOverridden && (
              <span className="pf-custom-badge">Custom</span>
            )}
            {isOverridden && (
              <button className="pf-reset-link" onClick={handleClearOverrides} title="Reset to global assumptions">
                <RotateCcw size={10} /> Reset
              </button>
            )}
          </div>

          {/* Land Residual headline */}
          {pf && maxBuildable > 0 ? (
            <>
              <div className="pf-headline">
                <div className="pf-headline-label">Land Residual</div>
                <div className={`pf-headline-value ${pf.landResidual <= 0 ? 'pf-headline-negative' : ''}`}>
                  {pf.landResidual > 0 ? fmtM(pf.landResidual) : 'Underwater'}
                </div>
                <div className="pf-headline-sub">
                  {residualPerLotSF > 0 && `$${residualPerLotSF.toLocaleString()}/lot SF`}
                  {residualVsAssessed && (
                    <span className={`pf-multiple ${residualIsStrong ? 'pf-multiple-strong' : ''}`}>
                      {' · '}{residualVsAssessed}× assessed
                    </span>
                  )}
                </div>
              </div>

              {/* P&L table */}
              <div className="pf-table">
                <div className="pf-group-label">Revenue</div>
                <PfRow label={`Gross Sellout (${fmt(maxBuildable)} SF × $${activePsf.toLocaleString()}/SF)`} value={fmtM(pf.grossSellout)} />
                <PfRow label={`− Broker / Mktg (${activeAssumptions.brokerPct}%)`} value={`−${fmtM(pf.brokerCost)}`} indent muted />
                <PfRow label="= Net Revenue" value={fmtM(pf.netRevenue)} subtotal />

                <div className="pf-group-label" style={{ marginTop: 6 }}>Costs</div>
                <PfRow label={`− Hard Costs ($${activeHardCost}/SF)`}              value={`−${fmtM(pf.hardCosts)}`}   indent muted />
                <PfRow label={`− Soft Costs (${activeAssumptions.softCostPct}%)`}  value={`−${fmtM(pf.softCosts)}`}   indent muted />
                <PfRow label={`− Carry (${activeAssumptions.carryPct}%)`}          value={`−${fmtM(pf.carryCosts)}`}  indent muted />
                <PfRow label={`− Dev Profit (${activeAssumptions.profitTargetPct}% of sellout)`} value={`−${fmtM(pf.devProfit)}`} indent muted />
                <PfRow label="= Land Residual" value={pf.landResidual > 0 ? fmtM(pf.landResidual) : 'Underwater'} total positive={pf.landResidual > 0} />

                {assessedValue > 0 && (
                  <PfRow label="Assessed Value" value={fmtM(assessedValue)} dimmed />
                )}
              </div>

              {/* Property-level overrides */}
              <div className="pf-overrides">
                <button className="pf-overrides-toggle" onClick={() => setShowOverrides(v => !v)}>
                  {showOverrides ? '▾' : '▸'} Adjust for this property
                  {isOverridden && <span className="pf-override-dot" />}
                </button>
                {showOverrides && (
                  <div className="pf-override-inputs">
                    <div className="pf-override-row">
                      <span className="pf-override-label">Sellout PSF</span>
                      <div className="pf-override-input-group">
                        <span className="uw-affix">$</span>
                        <input
                          type="number"
                          className="uw-number-input"
                          value={activePsf}
                          onChange={e => handlePsfChange(Number(e.target.value))}
                          min={500} max={10000} step={50}
                          style={{ width: 60 }}
                        />
                        <span className="uw-affix">/SF</span>
                      </div>
                      {activePsf !== nbhd.psf && (
                        <span className="pf-override-hint">global: ${nbhd.psf.toLocaleString()}</span>
                      )}
                    </div>
                    <div className="pf-override-row">
                      <span className="pf-override-label">Hard Cost</span>
                      <div className="pf-override-input-group">
                        <span className="uw-affix">$</span>
                        <input
                          type="number"
                          className="uw-number-input"
                          value={activeHardCost}
                          onChange={e => handleHardCostChange(Number(e.target.value))}
                          min={100} max={1200} step={25}
                          style={{ width: 60 }}
                        />
                        <span className="uw-affix">/SF</span>
                      </div>
                      {activeHardCost !== baseAssumptions.hardCostPerSF && (
                        <span className="pf-override-hint">global: ${baseAssumptions.hardCostPerSF}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="econ-disclaimer">
                Estimates only. Land residual = max supportable land cost given target returns. Not investment advice.
              </div>
            </>
          ) : (
            <div className="sales-empty">Insufficient zoning data to model</div>
          )}
        </div>

        {/* ── Recent Sales (ACRIS) ── */}
        <div className="drawer-section">
          <div className="section-header"><TrendingDown size={13} /> Recent Sales</div>
          {salesLoading ? (
            <div className="sales-loading">
              <div className="sales-skeleton" />
              <div className="sales-skeleton" />
              <div className="sales-skeleton short" />
            </div>
          ) : sales.length > 0 ? (
            <div className="sales-list">
              {sales.map((s, i) => (
                <div key={i} className="sale-row">
                  <span className="sale-date">{fmtDate(s.date)}</span>
                  <span className="sale-price">{s.price > 0 ? fmtM(s.price) : '—'}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="sales-empty">No recorded arm's-length transfers</div>
          )}
        </div>

        {/* ── Ownership ── */}
        <div className="drawer-section">
          <div className="section-header"><User size={13} /> Ownership</div>
          <div className="info-rows">
            <InfoRow label="Owner"             value={property.owner_name} />
            <InfoRow label="Building Class"    value={property.bldg_class} />
            <InfoRow label="Residential Units" value={property.units_res > 0 ? property.units_res : 'N/A'} />
            <InfoRow label="Assessed Value"    value={assessedValue > 0 ? `$${fmt(assessedValue)}` : '—'} />
          </div>
        </div>

        {/* ── Score Breakdown ── */}
        <div className="drawer-section">
          <div className="section-header"><TrendingUp size={13} /> Score Breakdown</div>
          <div className="score-bars">
            {scoreComponents.map(c => (
              <ScoreBar key={c.label} {...c} />
            ))}
          </div>
        </div>

        {/* ── Assemblage ── */}
        <div className="drawer-section">
          <div className="section-header"><Layers size={13} /> Assemblage</div>
          <button
            className={`assemblage-btn-full ${isInAssemblage ? 'active' : ''}`}
            onClick={toggleAssemblage}
          >
            {isInAssemblage ? <Check size={14} /> : <Plus size={14} />}
            {isInAssemblage ? 'Remove from Assemblage' : 'Add to Assemblage'}
          </button>
          {isInAssemblage && (
            <div className="assemblage-note">
              Switch to the Assemble tab to see combined analysis
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
