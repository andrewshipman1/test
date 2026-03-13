import { useState, useCallback } from 'react'

const STORAGE_KEY = 'atlas_saved_properties'

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

function save(properties) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(properties))
}

export function useSavedProperties() {
  const [savedProperties, setSavedProperties] = useState(() => load())

  const isSaved = useCallback(
    (bbl) => savedProperties.some(p => String(p.bbl) === String(bbl)),
    [savedProperties]
  )

  const toggleSave = useCallback((property) => {
    setSavedProperties(prev => {
      const exists = prev.some(p => String(p.bbl) === String(property.bbl))
      const next = exists
        ? prev.filter(p => String(p.bbl) !== String(property.bbl))
        : [property, ...prev]
      save(next)
      return next
    })
  }, [])

  const removeSaved = useCallback((bbl) => {
    setSavedProperties(prev => {
      const next = prev.filter(p => String(p.bbl) !== String(bbl))
      save(next)
      return next
    })
  }, [])

  return { savedProperties, isSaved, toggleSave, removeSaved }
}
