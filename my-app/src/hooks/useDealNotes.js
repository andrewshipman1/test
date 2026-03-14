import { useState, useCallback } from 'react'

const STORAGE_KEY = 'atlas_deal_notes_v1'

function loadNotes() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }
  catch { return {} }
}

export function useDealNotes() {
  const [notes, setNotesState] = useState(loadNotes)

  const setNote = useCallback((bbl, text) => {
    const key = String(bbl)
    setNotesState(prev => {
      let next
      if (text && text.trim()) {
        next = { ...prev, [key]: text }
      } else {
        const { [key]: _removed, ...rest } = prev
        next = rest
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const getNote = useCallback((bbl) => notes[String(bbl)] || '', [notes])

  return { notes, setNote, getNote }
}
