import { useState, useCallback } from 'react'

const STORAGE_KEY   = 'atlas_uw_assumptions'
const OVERRIDES_KEY = 'atlas_uw_overrides'

export const DEFAULT_ASSUMPTIONS = {
  hardCostPerSF:    425,  // $/SF construction hard cost
  softCostPct:       18,  // % of hard cost (arch, permits, legal)
  brokerPct:          5,  // % of gross sellout
  profitTargetPct:   15,  // % of gross sellout (developer margin)
  carryPct:           8,  // % of (hard + soft) — simplified construction carry
}

function loadAssumptions() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY))
    return stored ? { ...DEFAULT_ASSUMPTIONS, ...stored } : { ...DEFAULT_ASSUMPTIONS }
  } catch { return { ...DEFAULT_ASSUMPTIONS } }
}

function loadOverrides() {
  try { return JSON.parse(localStorage.getItem(OVERRIDES_KEY)) || {} }
  catch { return {} }
}

// ─── Pure calculation — no React, importable anywhere ────────────────────────
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

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useUnderwritingAssumptions() {
  const [assumptions, setAssumptions] = useState(loadAssumptions)
  const [overrides,   setOverrides]   = useState(loadOverrides)

  const updateAssumption = useCallback((key, value) => {
    setAssumptions(prev => {
      const next = { ...prev, [key]: value }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const resetAssumptions = useCallback(() => {
    setAssumptions({ ...DEFAULT_ASSUMPTIONS })
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_ASSUMPTIONS))
  }, [])

  // Returns global assumptions merged with any property-level overrides
  const getPropertyAssumptions = useCallback((bbl) => {
    const override = overrides[String(bbl)] || {}
    return { ...assumptions, ...override }
  }, [assumptions, overrides])

  // Set a single key override for a specific property
  const setPropertyOverride = useCallback((bbl, key, value) => {
    setOverrides(prev => {
      const next = { ...prev, [String(bbl)]: { ...(prev[String(bbl)] || {}), [key]: value } }
      localStorage.setItem(OVERRIDES_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  // Clear all overrides for a property (revert to global)
  const clearPropertyOverride = useCallback((bbl) => {
    setOverrides(prev => {
      const next = { ...prev }
      delete next[String(bbl)]
      localStorage.setItem(OVERRIDES_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const hasOverride = useCallback((bbl) => {
    const o = overrides[String(bbl)]
    return !!(o && Object.keys(o).length > 0)
  }, [overrides])

  return {
    assumptions,
    updateAssumption,
    resetAssumptions,
    getPropertyAssumptions,
    setPropertyOverride,
    clearPropertyOverride,
    hasOverride,
  }
}
