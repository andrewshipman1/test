import { useState, useEffect, useMemo } from 'react'
import { X, Plus, Check, AlertTriangle, Building2, TrendingUp, User, DollarSign, Layers, Bookmark, BookmarkCheck, TrendingDown, Calculator, RotateCcw, MapPin, ChevronDown, ChevronRight, FileText, Wind, Info } from 'lucide-react'
import { NEIGHBORHOOD_PSF, getEffectivePsf } from '../hooks/usePlutoData'
import { useAcrisComps } from '../hooks/useAcrisData'
import { DEFAULT_ASSUMPTIONS, computeCondoProForma } from '../hooks/useUnderwritingAssumptions'
import { getBlockNeighbors, isUnderbuilt } from '../utils/assemblageUtils'
import { useOwnerPortfolio } from '../hooks/useOwnerPortfolio'
import Tooltip from './Tooltip'
import { GLOSSARY } from '../utils/glossary'
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

function fmtMonthYear(iso) {
  if (!iso) return null
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function holdingYears(iso) {
  if (!iso) return null
  const ms = Date.now() - new Date(iso + 'T12:00:00').getTime()
  const yrs = Math.floor(ms / (365.25 * 24 * 3600 * 1000))
  return yrs
}

function detectOwnerType(name) {
  if (!name) return null
  const n = name.toUpperCase()
  if (/\b(LLC|LP|LLP|CORP|INC|TRUST|FUND|ASSOCIATION|PARTNERS?|REALTY|HOLDINGS?|PROPERTIES|ESTATES?)\b/.test(n)) return 'Entity'
  return 'Individual'
}

const ZONE_DESCRIPTIONS = {
  R1: 'Very low-density detached', R2: 'Low-density detached',
  R3: 'Low-density residential mix', R4: 'Low-density residential',
  R5: 'Low-density walk-up', R6: 'Medium-density contextual',
  R7: 'Medium-density residential', R8: 'High-density residential',
  R9: 'High-density tower', R10: 'Ultra-high-density (FAR 10+)',
  C1: 'Local commercial overlay', C2: 'Local service commercial',
  C4: 'Regional commercial', C5: 'Restricted central commercial',
  C6: 'Dense central commercial', C8: 'Heavy commercial / auto',
  M1: 'Light industrial', M2: 'Medium industrial', M3: 'Heavy industrial',
}

function getZoneDesc(zoneDist) {
  if (!zoneDist) return null
  const key2 = zoneDist.replace(/[^A-Z0-9]/gi, '').slice(0, 2).toUpperCase()
  const key1 = key2[0]
  return ZONE_DESCRIPTIONS[key2] || ZONE_DESCRIPTIONS[key1] || null
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
  livePsf = {},
  allFeatures = [],
  getNote,
  setNote,
  onOpenModelTab,
  marketSignals,
  onFlyToLot,
}) {
  // All hooks MUST come before any conditional returns (Rules of Hooks)
  const [showOverrides, setShowOverrides] = useState(false)
  const [showBlockNeighbors, setShowBlockNeighbors] = useState(false)
  const [showPortfolio, setShowPortfolio] = useState(false)
  const [localNote, setLocalNote] = useState('')
  const { sales, loading: salesLoading } = useAcrisComps(property?.bbl)
  const { portfolio, count: portfolioCount, loading: portfolioLoading } = useOwnerPortfolio(
    property?.owner_name,
    property?.bbl
  )

  // Local editable values for per-property PSF / hard cost overrides
  const [localPsf,      setLocalPsf]      = useState(null)
  const [localHardCost, setLocalHardCost] = useState(null)

  // Re-initialize local override state when property changes
  useEffect(() => {
    if (!property) return
    const a = getPropertyAssumptions ? getPropertyAssumptions(property.bbl) : (globalAssumptions || DEFAULT_ASSUMPTIONS)
    setLocalPsf(a.selloutPsf ?? getEffectivePsf(property.zipcode, a, livePsf))
    setLocalHardCost(a.hardCostPerSF ?? (globalAssumptions?.hardCostPerSF ?? DEFAULT_ASSUMPTIONS.hardCostPerSF))
    setShowOverrides(false)
    setLocalNote(getNote ? getNote(property.bbl) : '')
  }, [property?.bbl]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!property) return null

  // ── Resolved assumptions for this property ──
  const baseAssumptions = globalAssumptions || DEFAULT_ASSUMPTIONS
  const propAssumptions = getPropertyAssumptions ? getPropertyAssumptions(property.bbl) : baseAssumptions
  const isOverridden    = hasOverride ? hasOverride(property.bbl) : false

  const nbhd       = NEIGHBORHOOD_PSF[property.zipcode] || { name: 'Manhattan', psf: 2500 }
  const effectivePsf   = getEffectivePsf(property.zipcode, baseAssumptions, livePsf)
  const activePsf      = localPsf      ?? propAssumptions.selloutPsf ?? effectivePsf
  const activeHardCost = localHardCost ?? propAssumptions.hardCostPerSF ?? baseAssumptions.hardCostPerSF

  // Scenario state for badge display
  const multiplier     = baseAssumptions.psfMultiplier ?? 1.0
  const scenarioAdj    = Math.round((multiplier - 1) * 100)
  const usingScenario  = multiplier !== 1.0 && !propAssumptions.selloutPsf && localPsf === null

  const activeAssumptions = { ...baseAssumptions, ...propAssumptions, hardCostPerSF: activeHardCost }

  // ── Block Neighbors ──
  const blockNeighbors = useMemo(
    () => getBlockNeighbors(property.bbl, allFeatures),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [property.bbl, allFeatures.length]
  )
  const underbuiltNeighbors = useMemo(
    () => blockNeighbors.filter(f => isUnderbuilt(f.properties)),
    [blockNeighbors]
  )
  const blockTotalResidual = useMemo(
    () => blockNeighbors.reduce((s, f) => s + Number(f.properties.available_far_sqft || 0), 0)
        + Number(property.available_far_sqft || 0),
    [blockNeighbors, property.available_far_sqft]
  )

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
    setLocalPsf(effectivePsf)
    setLocalHardCost(baseAssumptions.hardCostPerSF)
  }

  // (copy function removed — use PDF export from Saved tab)
  if (false) {
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

  }

  return (
    <div className="property-drawer">

      {/* ── Header ── */}
      <div className="drawer-header">
        <div className="drawer-header-top">
          <div>
            <a
              className="drawer-address"
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${property.address || ''}, New York, NY`)}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Open in Google Maps Street View"
            >
              {property.address || 'No Address'}
              <MapPin size={12} className="drawer-address-pin" />
            </a>
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
            <button className="close-btn" onClick={onClose}><X size={16} /></button>
          </div>
        </div>

        <div className="drawer-header-tags">
          <div className="deal-type-tag" style={{ color: dtConfig.color, background: dtConfig.bg, borderColor: `${dtConfig.color}33` }}>
            {dtConfig.label}
          </div>
          <Tooltip content={GLOSSARY.opportunityScore}>
            <div className="score-tag" style={{ color: scoreColor(score), background: `${scoreColor(score)}18`, borderColor: `${scoreColor(score)}33`, cursor: 'help' }}>
              Score {score} <Info size={9} style={{ opacity: 0.6, verticalAlign: 'middle' }} />
            </div>
          </Tooltip>
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
              {property.rent_stab_risk && <RiskFlag icon="🏘️" color="#f97316" label={<Tooltip content={GLOSSARY.rentStabilized}><span>Likely Rent Stabilized <Info size={9} style={{ opacity: 0.6, verticalAlign: 'middle' }} /></span></Tooltip>} desc="Pre-1974 rental building — significant tenant buyout costs" />}
              {property.has_landmark   && <RiskFlag icon="🏛️" color="#3b82f6" label="Landmark Designation"   desc="LPC approval required — may have transferable air rights (TDR)" />}
            </div>
          </div>
        )}

        {/* ── Market Activity Signals ── */}
        {(() => {
          const bblKey = String(Math.round(Number(property.bbl || 0)))
          const signals = (marketSignals?.[bblKey] || property.market_signals || [])
          if (!signals.length) return null
          const SIGNAL_CONFIG = {
            recent_sale:   { icon: '🔄', label: 'Recent Deed Transfer', color: '#f97316' },
            demo_permit:   { icon: '🔨', label: 'Demo Permit Filed',    color: '#ef4444' },
            new_building:  { icon: '🏗',  label: 'New Building Permit',  color: '#22d3ee' },
            city_owned:    { icon: '🏛',  label: 'City-Owned Property',  color: '#8b5cf6' },
          }
          return (
            <div className="drawer-section activity-section">
              <div className="section-header"><TrendingUp size={13} color="#f59e0b" /> Market Activity</div>
              <div className="activity-signals">
                {signals.map((s, i) => {
                  const cfg = SIGNAL_CONFIG[s.type] || { icon: '•', label: s.label, color: '#555' }
                  return (
                    <div key={i} className="activity-chip" style={{ borderColor: `${cfg.color}33`, background: `${cfg.color}0d` }}>
                      <span className="activity-icon">{cfg.icon}</span>
                      <div className="activity-body">
                        <span className="activity-label" style={{ color: cfg.color }}>{cfg.label}</span>
                        {s.date && (
                          <span className="activity-date">
                            {new Date(s.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        )}
                        {s.agency && <span className="activity-date">{s.agency}</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}

        {/* ── The Build ── */}
        <div className="drawer-section">
          <div className="section-header">
            <Building2 size={13} /> The Build
            <Tooltip content={GLOSSARY.far}>
              <Info size={11} style={{ marginLeft: 5, color: '#2e4060', cursor: 'help' }} />
            </Tooltip>
          </div>
          <div className="metrics-grid-4">
            <MetricBox label="Lot Area"      value={`${fmt(lotArea)} SF`} />
            <MetricBox
              label={<Tooltip content={GLOSSARY.maxBuildable}><span>Max Buildable <Info size={9} style={{ opacity: 0.5, verticalAlign: 'middle' }} /></span></Tooltip>}
              value={`${fmt(maxBuildable)} SF`}
              accent
            />
            <MetricBox label="Unused FAR"    value={availFAR > 0 ? `${fmt(availFAR)} SF` : 'None'} accent={availFAR > 10000} />
            <MetricBox label="Est. Floors"   value={maxBuildable > 0 && lotArea > 0 ? `~${Math.round((maxBuildable / lotArea) * 0.9)}` : '—'} />
          </div>
          <div className="info-rows" style={{ marginTop: 8 }}>
            <InfoRow label="Zoning District"    value={property.zone_dist} />
            <InfoRow label="Max Residential FAR" value={residFar || '—'} />
            <InfoRow label="Built FAR"           value={builtFar || '—'} />
            <InfoRow
              label={<Tooltip content={GLOSSARY.farUtilization}><span>FAR Utilization <Info size={9} style={{ opacity: 0.5, verticalAlign: 'middle' }} /></span></Tooltip>}
              value={residFar > 0 ? `${Math.round(farUtil * 100)}%` : '—'}
              highlight={farUtil < 0.5}
            />
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
            {usingScenario && (
              <span className="pf-scenario-badge" style={{
                color:      scenarioAdj > 0 ? '#22c55e' : '#ef4444',
                background: scenarioAdj > 0 ? '#22c55e12' : '#ef444412',
                borderColor: scenarioAdj > 0 ? '#22c55e33' : '#ef444433',
              }}>
                {scenarioAdj > 0 ? '📈' : '📉'} {scenarioAdj > 0 ? '+' : ''}{scenarioAdj}%
              </span>
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
                      {activePsf !== effectivePsf && (
                        <span className="pf-override-hint">global: ${effectivePsf.toLocaleString()}</span>
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
              {onOpenModelTab && (
                <button className="model-tab-link" onClick={onOpenModelTab}>
                  <Calculator size={11} /> Edit global assumptions →
                </button>
              )}
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
            <InfoRow label="Owner" value={property.owner_name} />
            {(() => {
              const ownerType = detectOwnerType(property.owner_name)
              const lastSale = sales[0]
              const heldSince = lastSale?.date
              const yrs = holdingYears(heldSince)
              const mo  = fmtMonthYear(heldSince)
              return (
                <>
                  {ownerType && (
                    <div className="owner-type-row">
                      <span className={`owner-type-badge ${ownerType === 'Entity' ? 'entity' : 'individual'}`}>
                        {ownerType === 'Entity' ? '🏢 Entity / LLC' : '👤 Individual'}
                      </span>
                      {ownerType === 'Entity' && (
                        <span className="owner-type-hint">May be harder to reach directly</span>
                      )}
                    </div>
                  )}
                  {heldSince ? (
                    <div className="held-since-row">
                      <span className="held-since-label">Last Purchased</span>
                      <span className={`held-since-value ${yrs >= 10 ? 'long-hold' : ''}`}>
                        {mo}
                        {yrs >= 0 && <span className="held-since-years">({yrs > 0 ? `${yrs}yr hold` : '<1yr'})</span>}
                        {yrs >= 15 && <span className="held-since-flag">Long-term hold</span>}
                      </span>
                    </div>
                  ) : !salesLoading && (
                    <div className="held-since-row">
                      <span className="held-since-label">Ownership History</span>
                      <span className="held-since-value" style={{ color: '#555' }}>No arm's-length transfer on record</span>
                    </div>
                  )}
                </>
              )
            })()}
            <InfoRow label="Building Class"    value={property.bldg_class} />
            <InfoRow label="Residential Units" value={property.units_res > 0 ? property.units_res : 'N/A'} />
            <InfoRow label="Assessed Value"    value={assessedValue > 0 ? `$${fmt(assessedValue)}` : '—'} />
          </div>

          {/* Owner portfolio */}
          {!portfolioLoading && (portfolioCount > 0) && (
            <div className="portfolio-section">
              <button
                className="portfolio-toggle"
                onClick={() => setShowPortfolio(v => !v)}
              >
                {showPortfolio ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                <span className="portfolio-toggle-label">
                  Owner holds <strong>{portfolioCount}</strong> other lot{portfolioCount !== 1 ? 's' : ''} in Manhattan
                </span>
                {portfolioCount >= 5 && (
                  <span className="portfolio-serial-badge">Repeat Seller</span>
                )}
              </button>
              {showPortfolio && (
                <div className="portfolio-list">
                  {portfolio.slice(0, 20).map(lot => {
                    const farUtil = lot.resFar > 0 ? lot.builtFar / lot.resFar : 1
                    const isUnderbuilt = farUtil < 0.6 && lot.resFar >= 2
                    return (
                      <div
                        key={lot.bbl}
                        className={`portfolio-lot-row ${onFlyToLot && lot.lat ? 'clickable' : ''}`}
                        onClick={() => onFlyToLot && lot.lat && onFlyToLot(lot.lat, lot.lng, lot.address)}
                      >
                        <div className="portfolio-lot-info">
                          <span className="portfolio-lot-address">{lot.address || lot.bbl}</span>
                          <span className="portfolio-lot-meta">
                            {lot.zone} · {lot.lotArea.toLocaleString()} SF
                            {isUnderbuilt && <span className="portfolio-underbuilt">Underbuilt</span>}
                          </span>
                        </div>
                        {onFlyToLot && lot.lat && <MapPin size={11} color="#444" />}
                      </div>
                    )
                  })}
                  {portfolioCount > 20 && (
                    <div className="portfolio-more">+{portfolioCount - 20} more lots not shown</div>
                  )}
                </div>
              )}
            </div>
          )}
          {portfolioLoading && (
            <div className="portfolio-loading">Looking up owner portfolio…</div>
          )}
        </div>

        {/* ── Zoning Detail ── */}
        <div className="drawer-section">
          <div className="section-header"><MapPin size={13} /> Zoning Detail</div>
          {getZoneDesc(property.zone_dist) && (
            <div className="zone-desc-badge">{property.zone_dist} — {getZoneDesc(property.zone_dist)}</div>
          )}
          <div className="info-rows">
            {property.overlay1 && <InfoRow label="Commercial Overlay" value={property.overlay1} highlight />}
            {property.overlay2 && <InfoRow label="Overlay 2"          value={property.overlay2} />}
            {property.spdist1  && <InfoRow label="Special District"   value={property.spdist1}  highlight />}
            {property.ltdheight && <InfoRow label="Height Limit"      value={`LH-${property.ltdheight}`} />}
            <InfoRow label="Residential FAR"         value={residFar || '—'} />
            {property.comm_far > 0 && <InfoRow label="Commercial FAR" value={property.comm_far} />}
            {property.fac_far  > 0 && <InfoRow label="Community Facility FAR" value={property.fac_far} />}
          </div>
          <a
            href={`https://zola.planning.nyc.gov/?search=${encodeURIComponent((property.address || '') + ', New York, NY')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="zr-link"
          >
            View on NYC ZoLa →
          </a>
        </div>

        {/* ── Air Rights / TDR (landmarks only) ── */}
        {property.has_landmark && availFAR > 0 && (
          <div className="drawer-section">
            <div className="section-header"><Wind size={13} /> Air Rights (TDR)</div>
            <div className="tdr-card">
              <div className="tdr-headline">
                <span className="tdr-label">Est. Transferable Development Rights</span>
                <span className="tdr-sf">{fmt(availFAR)} SF</span>
              </div>
              <div className="tdr-value-range">
                <span className="tdr-range-label">Value range</span>
                <span className="tdr-range-value">
                  {fmtM(availFAR * 25)} – {fmtM(availFAR * 60)}
                  <span className="tdr-psf-note">($25–$60/SF)</span>
                </span>
              </div>
              {property.landmark_name && (
                <div className="tdr-name">{property.landmark_name}</div>
              )}
              <div className="tdr-note">
                LPC-designated landmark. Unused development rights may be transferred to a receiving site per NYC ZR §74-79. TDR pricing reflects recent Manhattan market ($25–$60/SF depending on proximity and receiving site density).
              </div>
            </div>
          </div>
        )}

        {/* ── Deal Notes ── */}
        <div className="drawer-section">
          <div className="section-header">
            <FileText size={13} /> Deal Notes
            {localNote && <span className="notes-saved-dot" title="Note saved" />}
          </div>
          <textarea
            className="deal-notes-textarea"
            placeholder="Private notes on this deal… (auto-saved locally)"
            value={localNote}
            onChange={e => setLocalNote(e.target.value)}
            onBlur={() => setNote && setNote(property.bbl, localNote)}
            rows={3}
          />
          {localNote && (
            <button
              className="notes-clear-btn"
              onClick={() => { setLocalNote(''); setNote && setNote(property.bbl, '') }}
            >
              Clear
            </button>
          )}
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

        {/* ── Block Neighbors ── */}
        {blockNeighbors.length > 0 && (
          <div className="drawer-section">
            <button
              className="section-header block-neighbors-toggle"
              onClick={() => setShowBlockNeighbors(v => !v)}
            >
              {showBlockNeighbors ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <Layers size={12} /> Block Neighbors
              <span className="block-neighbor-count">{blockNeighbors.length} lots on block</span>
            </button>

            {showBlockNeighbors && (
              <div className="block-neighbors-body">
                {blockNeighbors.map(f => {
                  const p = f.properties
                  const ub = isUnderbuilt(p)
                  const avail = Number(p.available_far_sqft || 0)
                  return (
                    <div key={p.bbl} className="block-neighbor-row">
                      <div className="block-neighbor-info">
                        <span className="block-neighbor-address">{p.address || p.bbl}</span>
                        <span className="block-neighbor-stats">
                          {p.num_floors > 0 ? `${p.num_floors} fl` : '—'}
                          {avail > 0 ? ` · ${avail.toLocaleString()} SF avail` : ' · Built out'}
                          {p.has_landmark ? ' · 🏛' : ''}
                          {p.rent_stab_risk ? ' · 🏘' : ''}
                        </span>
                      </div>
                      <div className="block-neighbor-flags">
                        {ub && <span className="underbuilt-badge">Underbuilt</span>}
                      </div>
                    </div>
                  )
                })}

                <div className="block-totals-row">
                  <span className="block-totals-label">Block Residual (all lots)</span>
                  <span className="block-totals-val">{blockTotalResidual.toLocaleString()} SF</span>
                </div>

                {underbuiltNeighbors.length > 0 && (
                  <button
                    className="add-underbuilt-btn"
                    onClick={() => {
                      setAssemblageLots(prev => {
                        const existing = new Set(prev.map(l => String(l.bbl)))
                        const toAdd = []
                        if (!existing.has(String(property.bbl))) toAdd.push(property)
                        underbuiltNeighbors.forEach(f => {
                          if (!existing.has(String(f.properties.bbl))) toAdd.push(f.properties)
                        })
                        return [...prev, ...toAdd]
                      })
                    }}
                  >
                    <Plus size={13} />
                    Add {underbuiltNeighbors.length} underbuilt neighbor{underbuiltNeighbors.length !== 1 ? 's' : ''} to Assemblage
                  </button>
                )}
              </div>
            )}
          </div>
        )}

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
