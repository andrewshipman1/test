// ─── Data Gap Logger ─────────────────────────────────────────────────────────
// Tracks every question/tool call where we lack data or return empty results.
// Helps identify which data sources users want that we don't have yet.

const STORAGE_KEY = 'frank_data_gaps'
const MAX_ENTRIES = 200

// Known data categories we DON'T cover yet (for auto-tagging)
const GAP_PATTERNS = [
  { pattern: /rent roll|lease|tenant|rental income/i, category: 'rent_rolls', source: 'Owner / CoStar / Reonomy' },
  { pattern: /cap rate|noi|net operating/i, category: 'investment_metrics', source: 'CoStar / Real Capital Analytics' },
  { pattern: /air rights|transfer.*development/i, category: 'air_rights', source: 'NYC DOB / Zoning Lot Merger records' },
  { pattern: /environmental|phase [12]|contamination|brownfield/i, category: 'environmental', source: 'NYC OER / EPA Envirofacts' },
  { pattern: /flood|fema|climate|sea level/i, category: 'flood_risk', source: 'FEMA NFHL / NYC Flood Hazard Mapper' },
  { pattern: /school|transit|walk score|amenity/i, category: 'location_amenities', source: 'Walk Score API / NYC Open Data' },
  { pattern: /tax abatement|421a|j-51|icap|opportunity zone/i, category: 'tax_incentives', source: 'NYC DOF / HPD' },
  { pattern: /mortgage|lien|debt|foreclosure|lis pendens/i, category: 'liens_debt', source: 'ACRIS / PropertyShark' },
  { pattern: /comparable|comp.*sale|recent sale/i, category: 'sales_comps', source: 'ACRIS / DOF Rolling Sales (have partial)' },
  { pattern: /vacancy|vacant.*rate|absorption/i, category: 'market_vacancy', source: 'CoStar / CBRE Research' },
  { pattern: /population|demographic|census|income.*median/i, category: 'demographics', source: 'Census ACS / NYC DCP' },
  { pattern: /parking|garage.*space/i, category: 'parking', source: 'NYC DOT / DCA' },
  { pattern: /retail.*lease|ground.*lease|commercial.*lease/i, category: 'retail_leases', source: 'CoStar / REBNY' },
  { pattern: /landmark|individual.*landmark/i, category: 'individual_landmarks', source: 'LPC Individual Landmarks dataset' },
  { pattern: /broker|listing|for sale|asking price/i, category: 'active_listings', source: 'LoopNet / Crexi / Cushman' },
  { pattern: /rezoning|ulurp|city council|land use review/i, category: 'rezoning_pipeline', source: 'NYC DCP ULURP tracker' },
  { pattern: /construction|pipeline|new dev|under construction/i, category: 'construction_pipeline', source: 'DOB NOW / TRD' },
  { pattern: /hotel|hospitality|tourist/i, category: 'hospitality', source: 'STR / NYC & Co' },
  { pattern: /queens|brooklyn|bronx|staten/i, category: 'outer_boroughs', source: 'PLUTO (currently Manhattan only)' },
]

function loadGaps() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []
  } catch {
    return []
  }
}

function saveGaps(entries) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)))
  } catch (e) {
    console.warn('Failed to save data gap log:', e)
  }
}

/**
 * Log a data gap from a failed/empty tool result.
 * Called automatically by the tool execution layer.
 */
export function logDataGap({ tool, input, error, userQuery, emptyResult }) {
  const gaps = loadGaps()

  // Auto-detect category from the user query or tool input
  const searchText = [userQuery, JSON.stringify(input)].filter(Boolean).join(' ')
  const matched = GAP_PATTERNS.filter(gp => gp.pattern.test(searchText))

  gaps.push({
    timestamp: Date.now(),
    date: new Date().toISOString().slice(0, 10),
    tool: tool || null,
    input: input || null,
    error: error || null,
    emptyResult: emptyResult || false,
    userQuery: userQuery || null,
    categories: matched.map(m => m.category),
    suggestedSources: matched.map(m => m.source),
    sessionId: sessionStorage.getItem('parcel_session_id') || 'unknown',
  })

  saveGaps(gaps)
}

/**
 * Log when a user asks a question that doesn't map to any tool.
 * Called when Claude responds without using any tools (might indicate a gap).
 */
export function logUnansweredQuery(userQuery) {
  const searchText = userQuery || ''
  const matched = GAP_PATTERNS.filter(gp => gp.pattern.test(searchText))

  // Only log if we detect a known gap pattern
  if (matched.length > 0) {
    logDataGap({
      tool: null,
      input: null,
      error: 'No tool available for this query type',
      userQuery,
      emptyResult: false,
    })
  }
}

/**
 * Get all logged data gaps.
 */
export function getDataGaps() {
  return loadGaps()
}

/**
 * Get a summary of data gaps by category — the key output for product decisions.
 */
export function getDataGapSummary() {
  const gaps = loadGaps()
  const byCategory = {}
  const byTool = {}
  const uncategorized = []

  for (const gap of gaps) {
    // By tool
    if (gap.tool) {
      byTool[gap.tool] = (byTool[gap.tool] || 0) + 1
    }

    // By category
    if (gap.categories?.length > 0) {
      for (const cat of gap.categories) {
        if (!byCategory[cat]) {
          byCategory[cat] = { count: 0, source: '', queries: [] }
        }
        byCategory[cat].count++
        // Keep the suggested source from the first match
        const gapMatch = GAP_PATTERNS.find(gp => gp.category === cat)
        if (gapMatch) byCategory[cat].source = gapMatch.source
        if (gap.userQuery && byCategory[cat].queries.length < 3) {
          byCategory[cat].queries.push(gap.userQuery)
        }
      }
    } else if (gap.userQuery) {
      uncategorized.push(gap.userQuery)
    }
  }

  // Sort categories by frequency
  const ranked = Object.entries(byCategory)
    .sort(([, a], [, b]) => b.count - a.count)
    .map(([category, data]) => ({
      category,
      count: data.count,
      suggestedSource: data.source,
      sampleQueries: data.queries,
    }))

  return {
    totalGaps: gaps.length,
    topCategories: ranked,
    toolFailures: byTool,
    uncategorizedQueries: uncategorized.slice(-10),
    dateRange: {
      first: gaps[0]?.date || null,
      last: gaps[gaps.length - 1]?.date || null,
    },
  }
}

/**
 * Export data gaps as downloadable JSON.
 */
export function exportDataGaps() {
  const summary = getDataGapSummary()
  const raw = loadGaps()
  const output = { summary, raw }
  const blob = new Blob([JSON.stringify(output, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `frank-data-gaps-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Clear all data gap logs.
 */
export function clearDataGaps() {
  localStorage.removeItem(STORAGE_KEY)
}
