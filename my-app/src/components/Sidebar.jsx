import { Filter, Target, Building2, TrendingUp, RotateCcw, Bookmark, MapPin } from 'lucide-react'
import './Sidebar.css'

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

const LAND_USE_OPTIONS = [
  { value: 'all',  label: 'All Land Uses' },
  { value: '01',   label: '01 · One & Two Family' },
  { value: '02',   label: '02 · Multi-Family Walk-Up' },
  { value: '03',   label: '03 · Multi-Family Elevator' },
  { value: '04',   label: '04 · Mixed Residential & Commercial' },
  { value: '05',   label: '05 · Commercial & Office' },
  { value: '06',   label: '06 · Industrial & Manufacturing' },
  { value: '07',   label: '07 · Transportation & Utility' },
  { value: '08',   label: '08 · Public Facilities & Institutions' },
  { value: '09',   label: '09 · Open Space & Recreation' },
  { value: '10',   label: '10 · Parking Facilities' },
  { value: '11',   label: '11 · Vacant Land' },
]

const ZONE_TYPES = [
  { value: 'all', label: 'All' },
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'manufacturing', label: 'Manufacturing' },
]

const DEFAULT_FILTERS = {
  minAvailableFAR: 0,
  landUse: 'all',
  zoningType: 'all',
  zoningDistrict: 'all',
  minOpportunityScore: 0,
  minAllowedFAR: 0,
  showLandmarks: true,
  showVacantOnly: false,
  cityOfYesOnly: false,
}

export default function Sidebar({
  filters, setFilters,
  assemblageLots, setAssemblageLots,
  zoningDistricts,
  savedProperties, removeSaved, onSelectSaved
}) {
  const activeTab = filters._tab || 'filters'
  const setTab = (tab) => setFilters(prev => ({ ...prev, _tab: tab }))
  const updateFilter = (key, value) => setFilters(prev => ({ ...prev, [key]: value }))

  return (
    <div className="sidebar">
      {/* Tab navigation */}
      <div className="sidebar-tabs">
        <button className={`tab-btn ${activeTab === 'filters' ? 'active' : ''}`} onClick={() => setTab('filters')}>
          <Filter size={14} /> Filters
        </button>
        <button className={`tab-btn ${activeTab === 'assemblage' ? 'active' : ''}`} onClick={() => setTab('assemblage')}>
          <Target size={14} /> Assemble
          {assemblageLots.length > 0 && <span className="tab-badge">{assemblageLots.length}</span>}
        </button>
        <button className={`tab-btn ${activeTab === 'saved' ? 'active' : ''}`} onClick={() => setTab('saved')}>
          <Bookmark size={14} /> Saved
          {savedProperties?.length > 0 && <span className="tab-badge">{savedProperties.length}</span>}
        </button>
      </div>

      <div className="sidebar-content">

        {/* ── FILTERS TAB ── */}
        {activeTab === 'filters' && (
          <div className="tab-panel">
            <div className="section-title"><TrendingUp size={13} /> Opportunity Score</div>
            <div className="slider-group">
              <div className="slider-labels">
                <span>Minimum</span>
                <span className="slider-value">{filters.minOpportunityScore}+</span>
              </div>
              <input type="range" min="0" max="100"
                value={filters.minOpportunityScore}
                onChange={e => updateFilter('minOpportunityScore', Number(e.target.value))}
                className="slider"
              />
              <div className="slider-ticks"><span>Any</span><span>50</span><span>Top</span></div>
            </div>

            <div className="section-title"><Building2 size={13} /> Land Use</div>
            <div className="select-group">
              <select value={filters.landUse} onChange={e => updateFilter('landUse', e.target.value)} className="styled-select">
                {LAND_USE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>

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

            <div className="section-title"><TrendingUp size={13} /> Min Allowed FAR</div>
            <div className="slider-group">
              <div className="slider-labels">
                <span>Minimum</span>
                <span className="slider-value">{filters.minAllowedFAR > 0 ? `${filters.minAllowedFAR}+` : 'Any'}</span>
              </div>
              <input type="range" min="0" max="15" step="0.5"
                value={filters.minAllowedFAR || 0}
                onChange={e => updateFilter('minAllowedFAR', Number(e.target.value))}
                className="slider"
              />
              <div className="slider-ticks"><span>Any</span><span>R8 (~6)</span><span>R10 (15)</span></div>
            </div>

            <div className="section-title">Quick Filters</div>
            <div className="toggle-group">
              <label className="toggle-label">
                <span>Vacant lots only</span>
                <div className={`toggle ${filters.showVacantOnly ? 'on' : ''}`}
                  onClick={() => updateFilter('showVacantOnly', !filters.showVacantOnly)} />
              </label>
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
                <div className="assemblage-title">Assemblage Simulator</div>
                <div className="assemblage-sub">Click lots on the map to add them</div>
              </div>
            </div>

            {assemblageLots.length === 0 ? (
              <div className="empty-state">
                <Target size={32} color="#333" />
                <p>No lots selected</p>
                <p className="empty-sub">Click any lot on the map, then tap "Add to Assemblage" in the property panel</p>
              </div>
            ) : (
              <div className="assemblage-lots">
                {assemblageLots.map((lot, i) => (
                  <div key={lot.bbl} className="assemblage-lot-item">
                    <div className="lot-number">{i + 1}</div>
                    <div className="lot-info">
                      <div className="lot-address">{lot.address || lot.bbl}</div>
                      <div className="lot-stats">{Number(lot.lot_area || 0).toLocaleString()} SF · FAR {lot.res_far || '—'}</div>
                    </div>
                    <button className="remove-btn" onClick={() => setAssemblageLots(prev => prev.filter(l => l.bbl !== lot.bbl))}>×</button>
                  </div>
                ))}

                <div className="assemblage-summary">
                  <div className="summary-title">Combined Analysis</div>
                  <div className="summary-stats">
                    <div className="stat-row">
                      <span>Total Lot Area</span>
                      <span className="stat-val">{assemblageLots.reduce((s, l) => s + Number(l.lot_area || 0), 0).toLocaleString()} SF</span>
                    </div>
                    <div className="stat-row">
                      <span>Max Buildable</span>
                      <span className="stat-val highlight">{assemblageLots.reduce((s, l) => s + (Number(l.res_far || 0) * Number(l.lot_area || 0)), 0).toLocaleString()} SF</span>
                    </div>
                    <div className="stat-row">
                      <span>Est. Air Rights Value</span>
                      <span className="stat-val highlight">
                        ${(assemblageLots.reduce((s, l) => {
                          const avail = (Number(l.res_far || 0) - Number(l.built_far || 0)) * Number(l.lot_area || 0)
                          return s + Math.max(0, avail * 350)
                        }, 0) / 1000000).toFixed(1)}M
                      </span>
                    </div>
                    <div className="stat-row">
                      <span>Lots Selected</span>
                      <span className="stat-val">{assemblageLots.length}</span>
                    </div>
                  </div>
                  <button className="clear-assemblage-btn" onClick={() => setAssemblageLots([])}>Clear All</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── SAVED TAB ── */}
        {activeTab === 'saved' && (
          <div className="tab-panel">
            <div className="saved-header">
              <Bookmark size={16} color="#f59e0b" />
              <div>
                <div className="assemblage-title">Saved Properties</div>
                <div className="assemblage-sub">Click a lot to fly to it on the map</div>
              </div>
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
