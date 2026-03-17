// ─── Claude API Tool Definitions (Token-Optimized) ──────────────────────────

export const TOOLS = [
  {
    name: 'searchProperties',
    description: 'Search Manhattan tax lots. Returns properties with scores, addresses, zoning, buildable SF.',
    input_schema: {
      type: 'object',
      properties: {
        dealType: { type: 'string', enum: ['all', 'vacant', 'parking', 'teardown', 'commercial'], description: 'Deal type filter' },
        neighborhood: { type: 'string', description: 'CD number 1-12 or "all"' },
        zoningType: { type: 'string', enum: ['all', 'residential', 'commercial', 'manufacturing'], description: 'Zoning filter' },
        minScore: { type: 'number', description: 'Min score 0-100' },
        minBuildableSF: { type: 'number', description: 'Min buildable SF' },
        limit: { type: 'number', description: 'Max results (default 10)' },
      },
    },
  },
  {
    name: 'getPropertyDetail',
    description: 'Full property data for a BBL: zoning, FAR, lot area, building info, score, owner.',
    input_schema: {
      type: 'object',
      properties: {
        bbl: { type: 'string', description: '10-digit BBL' },
      },
      required: ['bbl'],
    },
  },
  {
    name: 'runProForma',
    description: 'Condo dev pro forma. Returns costs, revenue, land residual.',
    input_schema: {
      type: 'object',
      properties: {
        buildableSF: { type: 'number', description: 'Buildable SF' },
        selloutPsf: { type: 'number', description: 'Sellout $/SF' },
        hardCostPerSF: { type: 'number', description: 'Hard cost $/SF (default $425)' },
        softCostPct: { type: 'number', description: 'Soft cost % (default 18)' },
        brokerPct: { type: 'number', description: 'Broker % (default 5)' },
        profitTargetPct: { type: 'number', description: 'Profit % (default 15)' },
        carryPct: { type: 'number', description: 'Carry % (default 8)' },
      },
      required: ['buildableSF', 'selloutPsf'],
    },
  },
  {
    name: 'checkRentStabilization',
    description: 'Rent stabilization status: stabilized units, total units, market-rate.',
    input_schema: {
      type: 'object',
      properties: { bbl: { type: 'string', description: '10-digit BBL' } },
      required: ['bbl'],
    },
  },
  {
    name: 'checkViolations',
    description: 'Open HPD violations by class A/B/C.',
    input_schema: {
      type: 'object',
      properties: { bbl: { type: 'string', description: '10-digit BBL' } },
      required: ['bbl'],
    },
  },
  {
    name: 'checkPermits',
    description: 'DOB permits: NB/DM/A1/A2/A3, dates, costs.',
    input_schema: {
      type: 'object',
      properties: { bbl: { type: 'string', description: '10-digit BBL' } },
      required: ['bbl'],
    },
  },
  {
    name: 'getMarketComps',
    description: 'Recent arm\'s-length sales comps from DOF Rolling Sales.',
    input_schema: {
      type: 'object',
      properties: { bbl: { type: 'string', description: '10-digit BBL' } },
      required: ['bbl'],
    },
  },
  {
    name: 'checkHistoricDistrict',
    description: 'LPC historic district check for a location.',
    input_schema: {
      type: 'object',
      properties: {
        longitude: { type: 'number', description: 'Longitude' },
        latitude: { type: 'number', description: 'Latitude' },
      },
      required: ['longitude', 'latitude'],
    },
  },
  {
    name: 'findAssemblages',
    description: 'Assemblage potential score (0-100) for multiple lots.',
    input_schema: {
      type: 'object',
      properties: {
        bbls: { type: 'array', items: { type: 'string' }, description: 'BBLs to evaluate' },
      },
      required: ['bbls'],
    },
  },
  {
    name: 'getOwnerPortfolio',
    description: 'All Manhattan properties by owner name.',
    input_schema: {
      type: 'object',
      properties: {
        ownerName: { type: 'string', description: 'Owner name' },
        excludeBbl: { type: 'string', description: 'BBL to exclude' },
      },
      required: ['ownerName'],
    },
  },
]
