// ─── Tool Execution Handlers ─────────────────────────────────────────────────
// Dispatches Claude tool_use calls to the standalone data functions.

import { searchProperties, getPropertyDetail, getFeaturesByBbl } from '../data/pluto.js'
import { fetchViolations } from '../data/violations.js'
import { fetchPermits } from '../data/permits.js'
import { fetchRentStabilization } from '../data/rentStabilization.js'
import { fetchMarketComps } from '../data/marketComps.js'
import { checkHistoricDistrict } from '../data/historicDistrict.js'
import { fetchOwnerPortfolio } from '../data/ownerPortfolio.js'
import { computeCondoProForma, DEFAULT_ASSUMPTIONS } from '../data/proForma.js'
import { computeAssemblageScore } from '../data/assemblage.js'

// Human-readable labels for UI status indicators
export const TOOL_LABELS = {
  searchProperties:       'Searching properties...',
  getPropertyDetail:      'Loading property details...',
  runProForma:            'Running pro forma...',
  checkRentStabilization: 'Checking rent stabilization...',
  checkViolations:        'Checking violations...',
  checkPermits:           'Checking permits...',
  getMarketComps:         'Loading market comps...',
  checkHistoricDistrict:  'Checking historic districts...',
  findAssemblages:        'Evaluating assemblage...',
  getOwnerPortfolio:      'Loading owner portfolio...',
}

const handlers = {
  searchProperties: async (input) => {
    return await searchProperties({
      address:       input.address,
      dealType:      input.dealType,
      neighborhood:  input.neighborhood,
      zoningType:    input.zoningType,
      minScore:      input.minScore,
      minBuildableSF: input.minBuildableSF,
      limit:         Math.min(input.limit || 10, 50),
    })
  },

  getPropertyDetail: async (input) => {
    return await getPropertyDetail(input.bbl)
  },

  runProForma: async (input) => {
    const assumptions = {
      ...DEFAULT_ASSUMPTIONS,
      ...(input.hardCostPerSF   != null ? { hardCostPerSF: input.hardCostPerSF } : {}),
      ...(input.softCostPct     != null ? { softCostPct: input.softCostPct } : {}),
      ...(input.brokerPct       != null ? { brokerPct: input.brokerPct } : {}),
      ...(input.profitTargetPct != null ? { profitTargetPct: input.profitTargetPct } : {}),
      ...(input.carryPct        != null ? { carryPct: input.carryPct } : {}),
    }
    const result = computeCondoProForma(input.buildableSF, input.selloutPsf, assumptions)
    if (!result) return { error: 'Invalid inputs — buildableSF and selloutPsf are required' }
    return { ...result, assumptions: { buildableSF: input.buildableSF, selloutPsf: input.selloutPsf, ...assumptions } }
  },

  checkRentStabilization: async (input) => {
    return await fetchRentStabilization(input.bbl)
  },

  checkViolations: async (input) => {
    return await fetchViolations(input.bbl)
  },

  checkPermits: async (input) => {
    return await fetchPermits(input.bbl)
  },

  getMarketComps: async (input) => {
    return await fetchMarketComps(input.bbl)
  },

  checkHistoricDistrict: async (input) => {
    return await checkHistoricDistrict(input.longitude, input.latitude)
  },

  findAssemblages: async (input) => {
    // Resolve BBLs to feature properties
    const features = await getFeaturesByBbl(input.bbls)
    if (!features.length) return { error: 'No matching properties found for the provided BBLs' }
    const lots = features.map(f => f.properties)
    return computeAssemblageScore(lots)
  },

  getOwnerPortfolio: async (input) => {
    return await fetchOwnerPortfolio(input.ownerName, input.excludeBbl)
  },
}

export async function executeTool(name, input) {
  const handler = handlers[name]
  if (!handler) throw new Error(`Unknown tool: ${name}`)
  try {
    return await handler(input)
  } catch (err) {
    return { error: err.message }
  }
}
