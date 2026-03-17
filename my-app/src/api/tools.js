// ─── Claude API Tool Definitions ─────────────────────────────────────────────
// JSON schemas for all tools available to the Parcel AI assistant.

export const TOOLS = [
  {
    name: 'searchProperties',
    description: 'Search Manhattan tax lots by deal type, neighborhood, zoning, minimum opportunity score, and minimum buildable square feet. Returns matching properties with scores, addresses, zoning, and development potential. Use this when the user asks about finding properties, lots, or opportunities.',
    input_schema: {
      type: 'object',
      properties: {
        dealType: {
          type: 'string',
          enum: ['all', 'vacant', 'parking', 'teardown', 'commercial'],
          description: 'Filter by deal type. "vacant" = empty lots, "parking" = garages/parking, "teardown" = 1-3 family homes, "commercial" = office/retail buildings',
        },
        neighborhood: {
          type: 'string',
          description: 'Community district number (1-12) or "all". CD 1=FiDi/Tribeca, 2=Greenwich/SoHo, 3=LES/East Village, 4=Chelsea/Hudson Yards, 5=Midtown, 6=Murray Hill/Stuyvesant, 7=UWS, 8=UES, 9=Morningside/Hamilton Heights, 10=Central Harlem, 11=East Harlem, 12=Washington Heights/Inwood',
        },
        zoningType: {
          type: 'string',
          enum: ['all', 'residential', 'commercial', 'manufacturing'],
          description: 'Filter by zoning prefix (R, C, or M zones)',
        },
        minScore: {
          type: 'number',
          description: 'Minimum opportunity score (0-100). 85+ is exceptional, 60-85 is strong, 40-60 is moderate.',
        },
        minBuildableSF: {
          type: 'number',
          description: 'Minimum available buildable square feet (unused FAR × lot area)',
        },
        limit: {
          type: 'number',
          description: 'Max results to return (default 10, max 50)',
        },
      },
    },
  },
  {
    name: 'getPropertyDetail',
    description: 'Get full property details for a specific BBL (Borough-Block-Lot) including zoning, FAR, lot area, building info, score, deal type, and owner. Use this when the user asks about a specific property or address.',
    input_schema: {
      type: 'object',
      properties: {
        bbl: {
          type: 'string',
          description: '10-digit BBL identifier (e.g., "1005870001")',
        },
      },
      required: ['bbl'],
    },
  },
  {
    name: 'runProForma',
    description: 'Run a condo development pro forma analysis. Returns gross sellout, hard/soft/carry costs, broker costs, developer profit, and land residual value. The land residual is the maximum price a developer should pay for the land.',
    input_schema: {
      type: 'object',
      properties: {
        buildableSF: {
          type: 'number',
          description: 'Total buildable square feet',
        },
        selloutPsf: {
          type: 'number',
          description: 'Expected sellout price per square foot',
        },
        hardCostPerSF: {
          type: 'number',
          description: 'Hard construction cost per SF (default $425)',
        },
        softCostPct: {
          type: 'number',
          description: 'Soft costs as % of hard costs (default 18%)',
        },
        brokerPct: {
          type: 'number',
          description: 'Broker fee as % of gross sellout (default 5%)',
        },
        profitTargetPct: {
          type: 'number',
          description: 'Developer profit margin as % of gross sellout (default 15%)',
        },
        carryPct: {
          type: 'number',
          description: 'Carry/financing cost as % of hard+soft costs (default 8%)',
        },
      },
      required: ['buildableSF', 'selloutPsf'],
    },
  },
  {
    name: 'checkRentStabilization',
    description: 'Check rent stabilization status for a property using HPD registration data and DOF unit counts. Returns stabilized unit count, total units, and market-rate units.',
    input_schema: {
      type: 'object',
      properties: {
        bbl: { type: 'string', description: '10-digit BBL identifier' },
      },
      required: ['bbl'],
    },
  },
  {
    name: 'checkViolations',
    description: 'Check open HPD housing violations for a property. Returns violation counts by class: A (non-hazardous), B (hazardous), C (immediately hazardous). Class C violations are the most serious.',
    input_schema: {
      type: 'object',
      properties: {
        bbl: { type: 'string', description: '10-digit BBL identifier' },
      },
      required: ['bbl'],
    },
  },
  {
    name: 'checkPermits',
    description: 'Check DOB building permits for a property. Returns recent permits with job type (NB=New Building, DM=Demolition, A1/A2/A3=Alterations), filing dates, and estimated costs.',
    input_schema: {
      type: 'object',
      properties: {
        bbl: { type: 'string', description: '10-digit BBL identifier' },
      },
      required: ['bbl'],
    },
  },
  {
    name: 'getMarketComps',
    description: 'Get recent arm\'s-length sales comparables for a property from DOF Rolling Sales data. Filters out $0 and nominal transfers.',
    input_schema: {
      type: 'object',
      properties: {
        bbl: { type: 'string', description: '10-digit BBL identifier' },
      },
      required: ['bbl'],
    },
  },
  {
    name: 'checkHistoricDistrict',
    description: 'Check if a location falls within an LPC (Landmarks Preservation Commission) historic district. Properties in historic districts face significant development restrictions.',
    input_schema: {
      type: 'object',
      properties: {
        longitude: { type: 'number', description: 'Longitude coordinate' },
        latitude: { type: 'number', description: 'Latitude coordinate' },
      },
      required: ['longitude', 'latitude'],
    },
  },
  {
    name: 'findAssemblages',
    description: 'Evaluate assemblage (multi-lot development) potential for a set of lots. Returns a 0-100 score with component breakdown: underbuilt ratio, residual capacity, landmark risk, lot count, and rent stabilization risk.',
    input_schema: {
      type: 'object',
      properties: {
        bbls: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of BBL identifiers to evaluate as an assemblage',
        },
      },
      required: ['bbls'],
    },
  },
  {
    name: 'getOwnerPortfolio',
    description: 'Find all Manhattan properties owned by the same entity or person. Useful for understanding an owner\'s holdings and potential acquisition targets.',
    input_schema: {
      type: 'object',
      properties: {
        ownerName: {
          type: 'string',
          description: 'Owner name (case-insensitive match)',
        },
        excludeBbl: {
          type: 'string',
          description: 'BBL to exclude from results (usually the property you already know about)',
        },
      },
      required: ['ownerName'],
    },
  },
]
