// ─── Pro Forma (re-export) ───────────────────────────────────────────────────
// Pure calculation — no React. Originally in hooks/useUnderwritingAssumptions.js

export const DEFAULT_ASSUMPTIONS = {
  hardCostPerSF:    425,
  softCostPct:       18,
  brokerPct:          5,
  profitTargetPct:   15,
  carryPct:           8,
  psfMultiplier:    1.0,
  psfOverrides:      {},
}

export function computeCondoProForma(buildableSF, selloutPsf, assumptions) {
  const { hardCostPerSF, softCostPct, brokerPct, profitTargetPct, carryPct } = assumptions
  if (!buildableSF || !selloutPsf) return null

  const grossSellout  = buildableSF * selloutPsf
  const brokerCost    = grossSellout * (brokerPct / 100)
  const netRevenue    = grossSellout - brokerCost
  const hardCosts     = buildableSF * hardCostPerSF
  const softCosts     = hardCosts * (softCostPct / 100)
  const carryCosts    = (hardCosts + softCosts) * (carryPct / 100)
  const totalDevCost  = hardCosts + softCosts + carryCosts
  const devProfit     = grossSellout * (profitTargetPct / 100)
  const landResidual  = Math.max(0, netRevenue - totalDevCost - devProfit)

  return {
    grossSellout, brokerCost, netRevenue,
    hardCosts, softCosts, carryCosts, totalDevCost,
    devProfit, landResidual,
  }
}
