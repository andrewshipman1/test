// ─── Conversation Logging & Evaluation ──────────────────────────────────────
// Stores all conversations to localStorage for analysis.
// Every user message, tool call, and assistant response is logged.

const STORAGE_KEY = 'parcel_conversation_log'
const SESSION_KEY = 'parcel_session_id'
const MAX_ENTRIES = 500

function getSessionId() {
  let id = sessionStorage.getItem(SESSION_KEY)
  if (!id) {
    id = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    sessionStorage.setItem(SESSION_KEY, id)
  }
  return id
}

function loadLog() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []
  } catch {
    return []
  }
}

function saveLog(entries) {
  try {
    // Keep only the most recent entries
    const trimmed = entries.slice(-MAX_ENTRIES)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
  } catch (e) {
    console.warn('Failed to save conversation log:', e)
  }
}

/**
 * Log a conversation event.
 * @param {object} entry
 *   type: 'user_message' | 'response' | 'tool_call' | 'error'
 *   text?: string
 *   tool?: string
 *   input?: object
 *   output?: object
 *   timestamp: number
 */
export function logConversation(entry) {
  const log = loadLog()
  log.push({
    ...entry,
    sessionId: getSessionId(),
    timestamp: entry.timestamp || Date.now(),
  })
  saveLog(log)
}

/**
 * Get full conversation log for analysis.
 */
export function getConversationLog() {
  return loadLog()
}

/**
 * Get log entries grouped by session.
 */
export function getLogBySession() {
  const log = loadLog()
  const sessions = {}
  for (const entry of log) {
    const sid = entry.sessionId || 'unknown'
    if (!sessions[sid]) sessions[sid] = []
    sessions[sid].push(entry)
  }
  return sessions
}

/**
 * Get summary statistics for evaluation.
 */
export function getLogStats() {
  const log = loadLog()
  const sessions = getLogBySession()

  const toolCalls = log.filter(e => e.type === 'tool_call')
  const toolFreq = {}
  toolCalls.forEach(tc => {
    toolFreq[tc.tool] = (toolFreq[tc.tool] || 0) + 1
  })

  const userMessages = log.filter(e => e.type === 'user_message')

  return {
    totalSessions:  Object.keys(sessions).length,
    totalMessages:  userMessages.length,
    totalToolCalls: toolCalls.length,
    toolFrequency:  toolFreq,
    firstEntry:     log[0]?.timestamp ? new Date(log[0].timestamp).toISOString() : null,
    lastEntry:      log[log.length - 1]?.timestamp ? new Date(log[log.length - 1].timestamp).toISOString() : null,
  }
}

/**
 * Export log as downloadable JSON.
 */
export function exportLog() {
  const log = loadLog()
  const blob = new Blob([JSON.stringify(log, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `parcel-conversations-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Clear all logs.
 */
export function clearLog() {
  localStorage.removeItem(STORAGE_KEY)
}
