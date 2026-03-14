import { useState, useMemo } from 'react'
import { Filter, Target, Building2, TrendingUp, RotateCcw, Bookmark, MapPin, Calculator, DollarSign, ChevronDown, ChevronRight, Download, AlertTriangle, Activity } from 'lucide-react'
import { DEFAULT_ASSUMPTIONS, computeCondoProForma } from '../hooks/useUnderwritingAssumptions'
import { NEIGHBORHOOD_PSF, NEIGHBORHOOD_TIERS, getEffectivePsf } from '../hooks/usePlutoData'
import { exportSavedToPdf } from '../utils/exportPdf'
import { computeAssemblageScore } from '../utils/assemblageUtils'
import './Sidebar.css'

const SCENARIOS = [
  { label: 'Bear',  adj: -0.20, color: '#ef4444' },
  { label: 'Base',  adj:  0.00, color: '#f59e0b' },
  { label: 'Bull',  adj: +0.20, color: '#22c55e' },
]

const DEAL_TYPE_COLORS = {
  VACANT:     '#22c55e',
  TEARDOWN:   '#f97316',
  GARAGE:     '#f59e0b',
  CONVERSION: '#8b5cf6',
  COMMERCIAL: '#06b6d4',
  COOP:       '#ef4444',
  CONDO:      '#ef4444',
}

const DEAL_TYPE_LABELS = {
  VACANT: 'Vacant', TEARDOWN: 'Teardown', GARAGE: 'Garage',
  CONVERSION: 'Conversion', COMMERCIAL: 'Commercial', COOP: 'Co-op', CONDO: 'Condo',
}

const DEAL_TYPES = [
  { value: 'all',        label: 'All Sites',     icon: '✦',  desc: 'Show every lot' },
  { value: 'vacant',     label: 'Vacant Land',   icon: '🟢', desc: 'Nothing built — ready to develop' },
  { value: 'parking',    label: 'Parking',        icon: '🅿', desc: 'Surface lots & garages' },
  { value: 'teardown',   label: 'Teardown',       icon: '🔨', desc: '1–3 family & walk-up buildings' },
  { value: 'commercial', label: 'Commercial',     icon: '🏢', desc: 'Retail, office & mixed-use' },
]

const NEIGHBORHOODS = [
  { value: 'all', label: 'All Manhattan' },
  { value: '1',   label: 'Financial District / Tribeca' },
  { value: '2',   label: 'Greenwich Village / SoHo' },
  { value: '3',   label: 'Lower East Side / Chinatown' },
  { value: '4',   label: "Chelsea / Hell's Kitchen" },
  { value: '5',   label: 'Midtown' },
  { value: '6',   label: 'Murray Hill / Gramercy' },
  { value: '7',   label: 'Upper West Side' },
  { value: '8',   label: 'Upper East Side' },
  { value: '9',   label: 'Morningside Hts / Hamilton Hts' },
  { value: '10',  label: 'Central Harlem' },
  { value: '11',  label: 'East Harlem' },
  { value: '12',  label: 'Washington Heights / Inwood' },
]

const ZONE_TYPES = [
  { value: 'all', label: 'All' },
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'manufacturing', label: 'Manufacturing' },
]

const DEFAULT_FILTERS = {
  dealType: 'all',
  neighborhood: 'all',
  zoningType: 'all',
  zoningDistrict: 'all',
  minOpportunityScore: 0,
  minBuildableSF: 0,
  showLandmarks: true,
  cityOfYesOnly: false,
}

const HARD_COST_PRESETS = [
  { label: 'Conversion', value: 275 },
  { label: 'Market Rate', value: 350 },
  { label: 'Luxury',      value: 425 },
  { label: 'Super Lux',   value: 600 },
]

export default function Sidebar({
  filters, setFilters,
  assemblageLots, setAssemblageLots,
  zoningDistricts,
  savedProperties, removeSaved, onSelectSaved,
  assumptions, updateAssumption, resetAssumptions,
  updatePsfOverride, resetPsfOverride, resetAllPsf,
  livePsf = {},
  allFeatures = [],
  permits = [],
  pipelineLoading = false,
  pipelineSummary = { nbCount: 0, dmCount: 0 },
  onSelectPermit,
  notes = {},
  showPipeline = false,
  onTogglePipeline,
}) {
  const activeTab = filters._tab || 'filters'
  const setTab = (tab) => setFilters(prev => ({ ...prev, _tab: tab }))
  const updateFilter = (key, value) => setFilters(prev => ({ ...prev, [key]: value }))
  const [showNbhdTable, setShowNbhdTable] = useState(false)
  const [pipelineFilter, setPipelineFilter] = useState('all') // 'all' | 'NB' | 'DM'

  // Safe fallbacks if underwriting props aren't wired yet
  const uw      = assumptions || DEFAULT_ASSUMPTIONS
  const setUw   = updateAssumption  || (() => {})
  const resetUw = resetAssumptions  || (() => {})
  const setPsfOverride   = updatePsfOverride || (() => {})
  const clearPsfOverride = resetPsfOverride  || (() => {})

  // Build a name → live PSF lookup from zipcode-keyed livePsf
  const livePsfByName = useMemo(() => {
    if (!Object.keys(livePsf).length) return {}
    const byName = {}
    Object.entries(NEIGHBORHOOD_PSF).forEach(([zip, { name }]) => {
      const d = livePsf[zip]
      if (!d) return
      if (!byName[name]) byName[name] = { total: 0, count: 0, sales: 0 }
      byName[name].total += d.psf * d.count
      byName[name].count += d.count
      byName[name].sales += d.count
    })
    const result = {}
    Object.entries(byName).forEach(([name, { total, count, sales }]) => {
      result[name] = { psf: Math.round(total / count), count: sales }
    })
    return result
  }, [livePsf])

  const liveCount = Object.keys(livePsf).length
  const currentAdj = Math.round(((uw.psfMultiplier ?? 1.0) - 1) * 100)

  // ── Assemblage analysis (computed from lots already added) ──
  const assemblageAnalysis = useMemo(() => {
    if (!assemblageLots.length) return null
    const scoreData  = computeAssemblageScore(assemblageLots)
    const zipcode    = assemblageLots[0]?.zipcode
    const psf        = zipcode ? getEffectivePsf(zipcode, uw, livePsf) : 2500
    const pf         = computeCondoProForma(scoreData.totalResidualSF, psf, uw)
    return { ...scoreData, pf, psf }
  }, [assemblageLots, uw, livePsf])

  return (
    <div className="sidebar">
      {/* Tab navigation */}
      <div className="sidebar-tabs">
        <button className={`tab-btn ${activeTab === 'filters' ? 'active' : ''}`} onClick={() => setTab('filters')}>
          <Filter size={13} /> Filters
        </button>
        <button className={`tab-btn ${activeTab === 'assemblage' ? 'active' : ''}`} onClick={() => setTab('assemblage')}>
          <Target size={13} /> Assemble
          {assemblageLots.length > 0 && <span className="tab-badge">{assemblageLots.length}</span>}
        </button>
        <button className={`tab-btn ${activeTab === 'saved' ? 'active' : ''}`} onClick={() => setTab('saved')}>
          <Bookmark size={13} /> Saved
          {savedProperties?.length > 0 && <span className="tab-badge">{savedProperties.length}</span>}
        </button>
        <button className={`tab-btn ${activeTab === 'proforma' ? 'active' : ''}`} onClick={() => setTab('proforma')}>
          <Calculator size={13} /> Model
        </button>
        <button className={`tab-btn ${activeTab === 'pipeline' ? 'active' : ''}`} onClick={() => setTab('pipeline')}>
          <Activity size={13} /> Pipeline
          {(pipelineSummary.nbCount + pipelineSummary.dmCount) > 0 && (
            <span className="tab-badge">{pipelineSummary.nbCount + pipelineSummary.dmCount}</span>
          )}
        </button>
      </div>

      <div className="sidebar-content">

        {/* ── FILTERS TAB ── */}
        {activeTab === 'filters' && (
          <div className="tab-panel">

            {/* 1. DEAL TYPE */}
            <div className="section-title"><Building2 size={13} /> What are you looking for?</div>
            <div className="deal-type-grid">
              {DEAL_TYPES.map(dt => (
                <button
                  key={dt.value}
                  className={`deal-type-pill ${(filters.dealType || 'all') === dt.value ? 'active' : ''} ${dt.value === 'all' ? 'full-width' : ''}`}
                  onClick={() => updateFilter('dealType', dt.value)}
                  title={dt.desc}
                >
                  <span className="dt-icon">{dt.icon}</span>
                  <span className="dt-label">{dt.label}</span>
                </button>
              ))}
            </div>

            {/* 2. NEIGHBORHOOD */}
            <div className="section-title"><MapPin size={13} /> Neighborhood</div>
            <div className="select-group">
              <select
                value={filters.neighborhood || 'all'}
                onChange={e => updateFilter('neighborhood', e.target.value)}
                className="styled-select"
              >
                {NEIGHBORHOODS.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
              </select>
            </div>

            {/* 3. ZONING TYPE */}
            <div className="section-title"><Building2 size={13} /> Zoning Type</div>
            <div className="zone-pills">
              {ZONE_TYPES.map(z => (
                <button
                  key={z.value}
                  className={`zone-pill ${(filters.zoningType || 'all') === z.value ? 'active' : ''}`}
                  onClick={() => updateFilter('zoningType', z.value)}
                >{z.label}</button>
              ))}
            </div>

            {/* 4. MIN BUILDABLE SF */}
            <div className="section-title"><TrendingUp size={13} /> Min Available to Build</div>
            <div className="slider-group">
              <div className="slider-labels">
                <span>Minimum</span>
                <span className="slider-value">
                  {filters.minBuildableSF > 0 ? `${Math.round((filters.minBuildableSF)/1000)}k+ SF` : 'Any'}
                </span>
              </div>
              <input type="range" min="0" max="50000" step="5000"
                value={filters.minBuildableSF || 0}
                onChange={e => updateFilter('minBuildableSF', Number(e.target.value))}
                className="slider"
              />
              <div className="slider-ticks"><span>Any</span><span>25k SF</span><span>50k+</span></div>
            </div>

            {/* 5. MIN QUALITY SCORE */}
            <div className="section-title"><TrendingUp size={13} /> Min Quality Score</div>
            <div className="slider-group">
              <div className="slider-labels">
                <span>Threshold</span>
                <span className="slider-value">{filters.minOpportunityScore > 0 ? `${filters.minOpportunityScore}+` : 'Any'}</span>
              </div>
              <input type="range" min="0" max="100"
                value={filters.minOpportunityScore}
                onChange={e => updateFilter('minOpportunityScore', Number(e.target.value))}
                className="slider"
              />
              <div className="slider-ticks"><span>Any</span><span>50</span><span>Top</span></div>
              <div className="filter-hint">Based on unused FAR, lot size &amp; land use</div>
            </div>

            <button className="reset-btn" onClick={() => setFilters(DEFAULT_FILTERS)}>
              <RotateCcw size={12} /> Reset Filters
            </button>
          </div>
        )}

        {/* ── ASSEMBLAGE TAB ── */}
        {activeTab === 'assemblage' && (
          <div className="tab-panel">
            <div className="assemblage-header">
              <Target size={16} color="#f59e0b" />
              <div>
                <div className="assemblage-title">Block Assemblage</div>
                <div className="assemblage-sub">
                  {assemblageLots.length === 0
                    ? 'Open a lot → expand Block Neighbors → add underbuilt lots'
                    : `${assemblageLots.length} lot${assemblageLots.length !== 1 ? 's' : ''} · ${assemblageAnalysis?.totalResidualSF?.toLocaleString() || 0} SF residual`}
                </div>
              </div>
            </div>

            {assemblageLots.length === 0 ? (
              <div className="empty-state">
                <Target size={32} color="#2e4060" />
                <p>No lots selected</p>
                <p className="empty-sub">Open any property, expand "Block Neighbors", and tap "Add underbuilt neighbors" to start an assemblage</p>
              </div>
            ) : (
              <>
                {/* Lot list */}
                <div className="assemblage-lots">
                  {assemblageLots.map((lot, i) => (
                    <div key={lot.bbl} className="assemblage-lot-item">
                      <div className="lot-number">{i + 1}</div>
                      <div className="lot-info">
                        <div className="lot-address">{lot.address || lot.bbl}</div>
                        <div className="lot-stats">
                          {Number(lot.lot_area || 0).toLocaleString()} SF · FAR {lot.res_far || '—'}
                          {lot.has_landmark ? ' · 🏛' : ''}
                          {lot.rent_stab_risk ? ' · 🏘' : ''}
                        </div>
                      </div>
                      <button className="remove-btn" onClick={() => setAssemblageLots(prev => prev.filter(l => l.bbl !== lot.bbl))}>×</button>
                    </div>
                  ))}
                </div>

                {/* Assemblage Score */}
                {assemblageAnalysis && (
                  <div className="assemblage-score-card">
                    <div className="assemblage-score-label">Assemblage Score</div>
                    <div
                      className="assemblage-score-number"
                      style={{ color: assemblageAnalysis.score >= 70 ? '#22c55e' : assemblageAnalysis.score >= 40 ? '#f59e0b' : '#ef4444' }}
                    >
                      {assemblageAnalysis.score}
                    </div>
                    <div className="assemblage-score-bars">
                      {Object.values(assemblageAnalysis.components).map(c => (
                        <div key={c.label} className="asm-bar-row">
                          <div className="asm-bar-header">
                            <span className="asm-bar-label">{c.label}</span>
                            <span className="asm-bar-pts" style={{ color: c.pts >= c.max * 0.7 ? '#22c55e' : '#f59e0b' }}>{c.pts}/{c.max}</span>
                          </div>
                          <div className="asm-bar-track">
                            <div
                              className="asm-bar-fill"
                              style={{ width: `${c.pct * 100}%`, background: c.pts >= c.max * 0.7 ? '#22c55e' : c.pts > 0 ? '#f59e0b' : '#ef4444' }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Red Flags */}
                {assemblageAnalysis && (
                  assemblageAnalysis.landmarkLots.length > 0 ||
                  assemblageAnalysis.rentStabLots.length > 0 ||
                  assemblageAnalysis.condoCoopLots.length > 0
                ) && (
                  <div className="red-flags-section">
                    <div className="red-flags-title"><AlertTriangle size={11} /> Risk Flags</div>
                    {assemblageAnalysis.landmarkLots.map(l => (
                      <div key={l.bbl} className="red-flag-item">🏛 {l.address || l.bbl} — Landmark</div>
                    ))}
                    {assemblageAnalysis.rentStabLots.map(l => (
                      <div key={l.bbl} className="red-flag-item">🏘 {l.address || l.bbl} — Likely Rent Stabilized</div>
                    ))}
                    {assemblageAnalysis.condoCoopLots.map(l => (
                      <div key={l.bbl} className="red-flag-item">⚠️ {l.address || l.bbl} — {l.deal_type === 'COOP' ? 'Co-op' : 'Condo'}</div>
                    ))}
                  </div>
                )}

                {/* Combined Pro Forma */}
                {assemblageAnalysis?.pf && (
                  <div className="asm-pf-card">
                    <div className="asm-pf-headline">
                      <div className="asm-pf-headline-label">Land Residual (Max Bid)</div>
                      <div
                        className="asm-pf-headline-value"
                        style={{ color: assemblageAnalysis.pf.landResidual > 0 ? '#22c55e' : '#ef4444' }}
                      >
                        {assemblageAnalysis.pf.landResidual > 0
                          ? `$${(assemblageAnalysis.pf.landResidual / 1e6).toFixed(1)}M`
                          : `−$${(Math.abs(assemblageAnalysis.pf.landResidual) / 1e6).toFixed(1)}M`}
                      </div>
                      <div className="asm-pf-headline-sub">
                        ${assemblageAnalysis.pf.landPerSF?.toLocaleString() || '—'}/SF residual · {assemblageAnalysis.totalResidualSF.toLocaleString()} SF buildable
                      </div>
                    </div>
                    <div className="asm-pf-rows">
                      <div className="asm-pf-row">
                        <span className="asm-pf-row-label">Gross Sellout</span>
                        <span className="asm-pf-row-val">${(assemblageAnalysis.pf.grossSellout / 1e6).toFixed(1)}M</span>
                      </div>
                      <div className="asm-pf-row">
                        <span className="asm-pf-row-label">− Hard Costs</span>
                        <span className="asm-pf-row-val">−${(assemblageAnalysis.pf.hardCost / 1e6).toFixed(1)}M</span>
                      </div>
                      <div className="asm-pf-row">
                        <span className="asm-pf-row-label">− Soft Costs</span>
                        <span className="asm-pf-row-val">−${(assemblageAnalysis.pf.softCost / 1e6).toFixed(1)}M</span>
                      </div>
                      <div className="asm-pf-row">
                        <span className="asm-pf-row-label">− Carry</span>
                        <span className="asm-pf-row-val">−${(assemblageAnalysis.pf.carry / 1e6).toFixed(1)}M</span>
                      </div>
                      <div className="asm-pf-row">
                        <span className="asm-pf-row-label">− Broker / Mktg</span>
                        <span className="asm-pf-row-val">−${(assemblageAnalysis.pf.brokerCost / 1e6).toFixed(1)}M</span>
                      </div>
                      <div className="asm-pf-row">
                        <span className="asm-pf-row-label">− Dev Profit ({uw.profitTargetPct}%)</span>
                        <span className="asm-pf-row-val">−${(assemblageAnalysis.pf.devProfit / 1e6).toFixed(1)}M</span>
                      </div>
                      <div className={`asm-pf-row asm-pf-row-total ${assemblageAnalysis.pf.landResidual > 0 ? 'asm-pf-row-positive' : 'asm-pf-row-negative'}`}>
                        <span className="asm-pf-row-label">= Land Residual</span>
                        <span className="asm-pf-row-val">
                          {assemblageAnalysis.pf.landResidual > 0
                            ? `$${(assemblageAnalysis.pf.landResidual / 1e6).toFixed(1)}M`
                            : `−$${(Math.abs(assemblageAnalysis.pf.landResidual) / 1e6).toFixed(1)}M`}
                        </span>
                      </div>
                    </div>
                    <div className="asm-pf-psf-note">
                      PSF: ${assemblageAnalysis.psf.toLocaleString()}/SF · {assemblageAnalysis.landmarkLots.length > 0 ? '⚠️ Landmark risk' : 'From global assumptions'}
                    </div>
                  </div>
                )}

                <button className="clear-assemblage-btn" onClick={() => setAssemblageLots([])}>
                  Clear All Lots
                </button>
              </>
            )}
          </div>
        )}

        {/* ── SAVED TAB ── */}
        {activeTab === 'saved' && (
          <div className="tab-panel">
            <div className="saved-header">
              <Bookmark size={16} color="#f59e0b" />
              <div style={{ flex: 1 }}>
                <div className="assemblage-title">Saved Properties</div>
                <div className="assemblage-sub">Click a lot to fly to it on the map</div>
              </div>
              {savedProperties?.length > 0 && (
                <button
                  className="saved-export-btn"
                  onClick={() => exportSavedToPdf(savedProperties, assumptions)}
                  title="Export to PDF"
                >
                  <Download size={13} />
                  PDF
                </button>
              )}
            </div>

            {!savedProperties || savedProperties.length === 0 ? (
              <div className="empty-state">
                <Bookmark size={32} color="#333" />
                <p>No saved properties</p>
                <p className="empty-sub">Click the bookmark icon in any property drawer to save it here</p>
              </div>
            ) : (
              <div className="saved-list">
                {savedProperties.map(prop => {
                  const color = DEAL_TYPE_COLORS[prop.deal_type] || '#f97316'
                  const label = DEAL_TYPE_LABELS[prop.deal_type] || 'Teardown'
                  return (
                    <div key={prop.bbl} className="saved-item" onClick={() => onSelectSaved && onSelectSaved(prop)}>
                      <div className="saved-item-body">
                        <div className="saved-address">{prop.address || prop.bbl}</div>
                        <div className="saved-meta">
                          <span className="saved-type-chip" style={{ color, borderColor: `${color}44`, background: `${color}11` }}>{label}</span>
                          <span className="saved-score">Score {prop.score || 0}</span>
                        </div>
                        {notes?.[prop.bbl] && (
                          <div className="saved-note-preview">
                            {notes[prop.bbl].length > 70
                              ? notes[prop.bbl].slice(0, 70) + '…'
                              : notes[prop.bbl]}
                          </div>
                        )}
                      </div>
                      <div className="saved-item-actions">
                        <MapPin size={12} color="#444" />
                        <button
                          className="remove-btn"
                          onClick={e => { e.stopPropagation(); removeSaved && removeSaved(prop.bbl) }}
                        >×</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── MODEL / PRO FORMA TAB ── */}
        {activeTab === 'proforma' && (
          <div className="tab-panel">
            <div className="uw-tab-header">
              <Calculator size={16} color="#f59e0b" />
              <div>
                <div className="assemblage-title">Condo Underwriting</div>
                <div className="assemblage-sub">
                  {liveCount > 0
                    ? `Live ACRIS data · ${liveCount} zipcodes`
                    : 'Global defaults · override per property'}
                </div>
              </div>
              {liveCount > 0 && <span className="uw-live-badge">Live</span>}
            </div>

            {/* ── Market Scenario ── */}
            <div className="section-title"><TrendingUp size={13} /> Market Scenario</div>

            <div className="scenario-pills">
              {SCENARIOS.map(s => {
                const m = 1 + s.adj
                const isActive = Math.abs((uw.psfMultiplier ?? 1.0) - m) < 0.005
                return (
                  <button
                    key={s.label}
                    className={`scenario-pill ${isActive ? 'active' : ''}`}
                    style={isActive ? { borderColor: `${s.color}66`, color: s.color, background: `${s.color}12` } : {}}
                    onClick={() => setUw('psfMultiplier', m)}
                  >
                    <span className="scenario-label">{s.label}</span>
                    <span className="scenario-adj" style={isActive ? { color: s.color } : {}}>
                      {s.adj >= 0 ? '+' : ''}{Math.round(s.adj * 100)}%
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="uw-field" style={{ marginTop: 6 }}>
              <span className="uw-field-label">Custom adj.</span>
              <div className="uw-input-group">
                <input
                  type="number"
                  className="uw-number-input"
                  value={currentAdj}
                  onChange={e => setUw('psfMultiplier', 1 + Number(e.target.value) / 100)}
                  min={-50} max={100} step={5}
                />
                <span className="uw-affix">%</span>
              </div>
            </div>

            {(uw.psfMultiplier ?? 1.0) !== 1.0 && (
              <div className="scenario-active-note" style={{
                color: currentAdj > 0 ? '#22c55e' : '#ef4444',
                background: currentAdj > 0 ? '#22c55e0a' : '#ef44440a',
                borderColor: currentAdj > 0 ? '#22c55e22' : '#ef444422',
              }}>
                {currentAdj > 0 ? '📈' : '📉'} All PSFs {currentAdj > 0 ? '+' : ''}{currentAdj}% from baseline
              </div>
            )}

            {/* ── Neighborhood PSF ── */}
            <button className="nbhd-toggle" onClick={() => setShowNbhdTable(v => !v)}>
              {showNbhdTable ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <span>Neighborhood PSF</span>
              {liveCount > 0 && <span className="uw-live-badge" style={{ marginLeft: 'auto' }}>Live</span>}
              {Object.keys(uw.psfOverrides || {}).length > 0 && (
                <span className="uw-override-count">{Object.keys(uw.psfOverrides).length} pinned</span>
              )}
            </button>

            {showNbhdTable && (
              <div className="nbhd-table">
                {NEIGHBORHOOD_TIERS.map(({ name, defaultPsf }) => {
                  const liveData     = livePsfByName[name]
                  const manualOvr    = uw.psfOverrides?.[name]
                  const isOverridden = manualOvr != null
                  const basePsf      = liveData?.psf ?? defaultPsf
                  const effectivePsf = isOverridden
                    ? manualOvr
                    : Math.round(basePsf * (uw.psfMultiplier ?? 1.0))

                  return (
                    <div key={name} className={`nbhd-row ${isOverridden ? 'nbhd-pinned' : ''}`}>
                      <div className="nbhd-meta">
                        <span className="nbhd-name" title={name}>{name}</span>
                        {liveData
                          ? <span className="nbhd-badge live">{liveData.count} sales</span>
                          : <span className="nbhd-badge est">Est.</span>
                        }
                      </div>
                      <div className="nbhd-controls">
                        <div className="nbhd-input-wrap">
                          <span className="uw-affix">$</span>
                          <input
                            type="number"
                            className="uw-number-input nbhd-input"
                            value={isOverridden ? manualOvr : basePsf}
                            onChange={e => {
                              const v = Number(e.target.value)
                              if (v > 0) setPsfOverride(name, v)
                            }}
                            min={300} max={15000} step={50}
                            title={isOverridden ? 'Pinned — immune to scenario multiplier' : 'Edit to pin this neighborhood'}
                          />
                        </div>
                        {isOverridden
                          ? <button className="nbhd-reset-btn" onClick={() => clearPsfOverride(name)} title="Unpin">✕</button>
                          : <span className="nbhd-pin-hint">📌</span>
                        }
                      </div>
                      {(uw.psfMultiplier ?? 1.0) !== 1.0 && !isOverridden && (
                        <span className="nbhd-effective" style={{ color: effectivePsf > basePsf ? '#22c55e' : '#ef4444' }}>
                          → ${effectivePsf.toLocaleString()}
                        </span>
                      )}
                    </div>
                  )
                })}

                {Object.keys(uw.psfOverrides || {}).length > 0 && (
                  <button className="nbhd-reset-all" onClick={() => resetAllPsf && resetAllPsf()}>
                    <RotateCcw size={10} /> Reset all pins
                  </button>
                )}
              </div>
            )}

            {/* ── Construction ── */}
            <div className="section-title"><Building2 size={13} /> Construction Cost</div>

            <div className="uw-field">
              <span className="uw-field-label">Hard Cost / SF</span>
              <div className="uw-input-group">
                <span className="uw-affix">$</span>
                <input
                  type="number"
                  className="uw-number-input"
                  value={uw.hardCostPerSF}
                  onChange={e => setUw('hardCostPerSF', Number(e.target.value))}
                  min={100} max={1200} step={25}
                />
                <span className="uw-affix">/SF</span>
              </div>
            </div>

            <div className="uw-presets">
              {HARD_COST_PRESETS.map(p => (
                <button
                  key={p.value}
                  className={`uw-preset-btn ${uw.hardCostPerSF === p.value ? 'active' : ''}`}
                  onClick={() => setUw('hardCostPerSF', p.value)}
                >{p.label}</button>
              ))}
            </div>

            <div className="uw-field">
              <span className="uw-field-label">Soft Costs</span>
              <div className="uw-input-group">
                <input type="number" className="uw-number-input"
                  value={uw.softCostPct}
                  onChange={e => setUw('softCostPct', Number(e.target.value))}
                  min={5} max={35} step={1} />
                <span className="uw-affix">% of hard</span>
              </div>
            </div>

            <div className="uw-field">
              <span className="uw-field-label">Carry Cost</span>
              <div className="uw-input-group">
                <input type="number" className="uw-number-input"
                  value={uw.carryPct}
                  onChange={e => setUw('carryPct', Number(e.target.value))}
                  min={2} max={20} step={1} />
                <span className="uw-affix">% of build</span>
              </div>
            </div>

            {/* ── Returns ── */}
            <div className="section-title"><DollarSign size={13} /> Returns</div>

            <div className="uw-field">
              <span className="uw-field-label">Profit Target</span>
              <div className="uw-input-group">
                <input type="number" className="uw-number-input"
                  value={uw.profitTargetPct}
                  onChange={e => setUw('profitTargetPct', Number(e.target.value))}
                  min={5} max={40} step={1} />
                <span className="uw-affix">% of sellout</span>
              </div>
            </div>

            <div className="uw-field">
              <span className="uw-field-label">Broker / Mktg</span>
              <div className="uw-input-group">
                <input type="number" className="uw-number-input"
                  value={uw.brokerPct}
                  onChange={e => setUw('brokerPct', Number(e.target.value))}
                  min={2} max={10} step={0.5} />
                <span className="uw-affix">% of sellout</span>
              </div>
            </div>

            <button className="reset-btn" onClick={resetUw}>
              <RotateCcw size={12} /> Reset All to Defaults
            </button>

            <div className="uw-note">
              PSFs from live ACRIS condo sales where available, otherwise estimated. Open any property drawer to override PSF or hard cost for a specific site.
            </div>
          </div>
        )}

        {/* ── PIPELINE TAB ── */}
        {activeTab === 'pipeline' && (
          <div className="tab-panel">
            <div className="pipeline-header">
              <Activity size={16} color="#22d3ee" />
              <div style={{ flex: 1 }}>
                <div className="assemblage-title">DOB Pipeline</div>
                <div className="assemblage-sub">
                  {pipelineLoading
                    ? 'Loading permit data…'
                    : `${pipelineSummary.nbCount} new buildings · ${pipelineSummary.dmCount} demolitions`}
                </div>
              </div>
              <button
                className={`pipeline-map-btn ${showPipeline ? 'active' : ''}`}
                onClick={() => onTogglePipeline && onTogglePipeline(!showPipeline)}
                title={showPipeline ? 'Hide dots on map' : 'Show permits on map'}
              >
                <span className="pipeline-map-dot nb" />
                <span className="pipeline-map-dot dm" />
                {showPipeline ? 'On Map' : 'Map'}
              </button>
            </div>

            {/* Filter pills */}
            <div className="pipeline-filter-pills">
              {[
                { key: 'all', label: 'All' },
                { key: 'NB',  label: '🏗 New Buildings' },
                { key: 'DM',  label: '🔴 Demolitions' },
              ].map(f => (
                <button
                  key={f.key}
                  className={`pipeline-filter-pill ${pipelineFilter === f.key ? 'active' : ''}`}
                  onClick={() => setPipelineFilter(f.key)}
                >{f.label}</button>
              ))}
            </div>

            {pipelineLoading ? (
              <div className="empty-state">
                <div className="loading-spinner-sm" />
                <p>Loading permits…</p>
              </div>
            ) : permits.length === 0 ? (
              <div className="empty-state">
                <Activity size={32} color="#2e4060" />
                <p>No pipeline data</p>
                <p className="empty-sub">DOB permit data will appear here once loaded</p>
              </div>
            ) : (
              <div className="pipeline-list">
                {permits
                  .filter(p => pipelineFilter === 'all' || p.type === pipelineFilter)
                  .slice(0, 150)
                  .map((p, i) => (
                    <div
                      key={`${p.bbl}-${p.type}-${i}`}
                      className="pipeline-permit-card"
                      onClick={() => onSelectPermit && onSelectPermit(p)}
                    >
                      <div className="pipeline-card-top">
                        <span className={`pipeline-type-badge ${p.type === 'NB' ? 'pipeline-nb' : 'pipeline-dm'}`}>
                          {p.type === 'NB' ? 'NB' : 'DM'}
                        </span>
                        <span className="pipeline-permit-date">
                          {p.filingDate
                            ? new Date(p.filingDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
                            : '—'}
                        </span>
                        {p.cost && <span className="pipeline-cost">{p.cost}</span>}
                      </div>
                      <div className="pipeline-permit-address">
                        {p.address || p.bbl}
                      </div>
                      {p.description && (
                        <div className="pipeline-permit-desc">{p.description}</div>
                      )}
                    </div>
                  ))}
                {permits.filter(p => pipelineFilter === 'all' || p.type === pipelineFilter).length > 150 && (
                  <div className="pipeline-more">
                    + {permits.filter(p => pipelineFilter === 'all' || p.type === pipelineFilter).length - 150} more · toggle Pipeline on map to see all
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>

      <div className="sidebar-footer">
        <div className="footer-stat">
          <span className="footer-stat-val">8k+</span>
          <span className="footer-stat-label">Lots</span>
        </div>
        <div className="footer-stat">
          <span className="footer-stat-val">Manhattan</span>
          <span className="footer-stat-label">Coverage</span>
        </div>
        <div className="footer-stat">
          <span className="footer-stat-val">Live</span>
          <span className="footer-stat-label">Data</span>
        </div>
      </div>
    </div>
  )
}
