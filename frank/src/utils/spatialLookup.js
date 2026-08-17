// Nearest-neighbor lookup against PLUTO point features.
// Uses Euclidean approximation (good enough at Manhattan latitudes).

const DEG_TO_M_LAT = 111320
const DEG_TO_M_LNG = 111320 * Math.cos(40.78 * Math.PI / 180) // ~84,300m per degree at Manhattan

export function findNearestLot(lngLat, features, maxDistMeters = 50) {
  if (!features || !features.length) return null

  const { lng, lat } = lngLat
  let best = null
  let bestDist = Infinity

  for (let i = 0; i < features.length; i++) {
    const coords = features[i].geometry.coordinates
    const dx = (coords[0] - lng) * DEG_TO_M_LNG
    const dy = (coords[1] - lat) * DEG_TO_M_LAT
    const dist = dx * dx + dy * dy // squared distance (skip sqrt for perf)
    if (dist < bestDist) {
      bestDist = dist
      best = features[i]
    }
  }

  if (!best) return null
  const actualDist = Math.sqrt(bestDist)
  return actualDist <= maxDistMeters ? best : null
}
