// ─── Assemblage Utility Functions ────────────────────────────────────────────
// Pure functions — no React, no side effects. Safe to import anywhere.

/**
 * Given a BBL and the full PLUTO features array, return all features
 * that are on the same tax block (excluding the lot itself).
 * Block = borough digit (1) + block digits (5) = first 6 chars of zero-padded BBL.
 */
export function getBlockNeighbors(bbl, allFeatures) {
  if (!allFeatures?.length || !bbl) return []
  const prefix = String(Math.round(Number(bbl))).padStart(10, '0').slice(0, 6)
  return allFeatures.filter(f => {
    const b = String(Math.round(Number(f.properties?.bbl))).padStart(10, '0')
    return b.slice(0, 6) === prefix && String(f.properties?.bbl) !== String(bbl)
  })
}

/**
 * Returns true if a lot is meaningfully underbuilt.
 * Criteria: using <50% of allowed FAR, OR ≤3 floors in a high-FAR zone (≥5).
 * Accepts a plain property object (from feature.properties or direct).
 */
export function isUnderbuilt(lot) {
  const builtFar = Number(lot?.built_far  || 0)
  const resFar   = Number(lot?.res_far    || 0)
  const floors   = Number(lot?.num_floors || 0)
  if (resFar <= 0) return false
  return (builtFar / resFar < 0.5) || (floors <= 3 && resFar >= 5)
}

/**
 * Compute a 0-100 assemblage opportunity score from an array of property objects.
 *
 * Components (max pts):
 *   A. Underbuilt ratio        — 30 pts  (what fraction of lots are underbuilt)
 *   B. Residual capacity       — 20 pts  (total available SF vs. 50k threshold)
 *   C. No landmarks            — 20 pts  (binary: any landmark = 0)
 *   D. Lot count               — 15 pts  (3+ lots = full score)
 *   E. No rent stabilization   — 15 pts  (full if none, half if some)
 *
 * Returns score + per-component breakdown + categorised lot lists.
 */
export function computeAssemblageScore(lots) {
  if (!lots?.length) return { score: 0, components: {}, totalResidualSF: 0 }

  const total    = lots.length
  const ubCount  = lots.filter(l => isUnderbuilt(l)).length
  const totalRes = lots.reduce((s, l) => s + Number(l.available_far_sqft || 0), 0)
  const hasLmark = lots.some(l => l.has_landmark)
  const anyRstab = lots.some(l => l.rent_stab_risk)
  const allRstab = lots.every(l => l.rent_stab_risk)

  const a = total > 0 ? (ubCount / total) * 30 : 0
  const b = Math.min((totalRes / 50000) * 20, 20)
  const c = hasLmark ? 0 : 20
  const d = Math.min((total / 3) * 15, 15)
  const e = allRstab ? 0 : anyRstab ? 7.5 : 15

  const score = Math.round(a + b + c + d + e)

  return {
    score,
    components: {
      underbuilt: { pts: Math.round(a), max: 30, label: 'Underbuilt lots',     pct: total > 0 ? ubCount / total : 0 },
      capacity:   { pts: Math.round(b), max: 20, label: 'Residual capacity',   pct: Math.min(totalRes / 50000, 1) },
      landmarks:  { pts: Math.round(c), max: 20, label: 'No landmark risk',    pct: c / 20 },
      lotCount:   { pts: Math.round(d), max: 15, label: 'Lot count (3+ ideal)',pct: Math.min(total / 3, 1) },
      rentStab:   { pts: Math.round(e), max: 15, label: 'No rent stabilization', pct: e / 15 },
    },
    totalResidualSF: totalRes,
    totalLotArea:    lots.reduce((s, l) => s + Number(l.lot_area || 0), 0),
    maxBuildable:    lots.reduce((s, l) => s + (Number(l.res_far || 0) * Number(l.lot_area || 0)), 0),
    underbuiltCount: ubCount,
    landmarkLots:    lots.filter(l => l.has_landmark),
    rentStabLots:    lots.filter(l => l.rent_stab_risk),
    condoCoopLots:   lots.filter(l => l.deal_type === 'CONDO' || l.deal_type === 'COOP'),
  }
}
