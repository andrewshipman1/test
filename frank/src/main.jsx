import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './brand/frank-design-system.css'
import './index.css'
import App from './App.jsx'
import { getDataGapSummary, getDataGaps, exportDataGaps, clearDataGaps } from './api/dataGapLog.js'
import { getLogStats, exportLog } from './api/conversationLog.js'

// Expose diagnostic tools on window for console access
// Usage: frankDiag.gaps()  — see data gap summary
//        frankDiag.rawGaps() — see all raw gap entries
//        frankDiag.exportGaps() — download gaps JSON
//        frankDiag.stats() — conversation stats
//        frankDiag.exportLog() — download full conversation log
window.frankDiag = {
  gaps: () => { const s = getDataGapSummary(); console.table(s.topCategories); return s },
  rawGaps: getDataGaps,
  exportGaps: exportDataGaps,
  clearGaps: clearDataGaps,
  stats: () => { const s = getLogStats(); console.log(s); return s },
  exportLog,
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
