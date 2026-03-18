import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { sendMessage } from '../api/claude.js'
import { logConversation } from '../api/conversationLog.js'
import MessageList from './MessageList.jsx'
import ChatInput from './ChatInput.jsx'
import MapPanel from './MapPanel.jsx'
import './ChatView.css'

const SUGGESTED_PROMPTS = [
  {
    label: 'Source a deal',
    text: 'Show me the best conversion plays on the Upper East Side right now.',
  },
  {
    label: 'Run the numbers',
    text: 'Run a condo pro forma on 383 Lafayette Street assuming $3,400 sellout PSF. What\'s the land residual?',
  },
  {
    label: 'Due diligence',
    text: 'Pull the full risk profile on 120 East 13th Street — rent stabilization, violations, historic district, everything.',
  },
]

let messageIdCounter = Date.now()
function nextId() { return `msg_${++messageIdCounter}` }

// Extract BBLs from all assistant messages (from [MAP:...] and [PROPERTY:...] markers)
function extractBblsFromMessages(messages) {
  const bbls = new Set()
  for (const msg of messages) {
    if (msg.role !== 'assistant' || !msg.content) continue
    // [MAP:bbl1,bbl2,...]
    const mapMatches = msg.content.matchAll(/\[MAP:([^\]]+)\]/g)
    for (const m of mapMatches) {
      m[1].split(',').forEach(b => {
        const trimmed = b.trim()
        if (trimmed) bbls.add(trimmed)
      })
    }
    // [PROPERTY:bbl]
    const propMatches = msg.content.matchAll(/\[PROPERTY:([^\]]+)\]/g)
    for (const m of propMatches) {
      const trimmed = m[1].trim()
      if (trimmed) bbls.add(trimmed)
    }
  }
  return Array.from(bbls)
}

export default function ChatView() {
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [toolStatus, setToolStatus] = useState(null)
  const abortRef = useRef(null)

  // Auto-preload the PLUTO dataset on mount
  useEffect(() => {
    import('../data/pluto.js').then(m => m.loadAllLots())
  }, [])

  // Extract BBLs from messages to highlight on map
  const highlightedBbls = useMemo(() => extractBblsFromMessages(messages), [messages])

  const handleSend = useCallback((text) => {
    if (!text.trim() || isLoading) return

    // Log user message
    logConversation({ type: 'user_message', text, timestamp: Date.now() })

    const userMsg = { id: nextId(), role: 'user', content: text }
    const assistantMsg = { id: nextId(), role: 'assistant', content: '', isStreaming: true }

    setMessages(prev => [...prev, userMsg, assistantMsg])
    setIsLoading(true)
    setToolStatus(null)

    // Build conversation history for the API
    const history = [...messages, userMsg].map(m => ({
      role: m.role,
      content: m.content,
    }))

    const abort = sendMessage(history, {
      onText: (chunk) => {
        setMessages(prev => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (last && last.role === 'assistant') {
            updated[updated.length - 1] = {
              ...last,
              content: last.content + chunk,
            }
          }
          return updated
        })
      },

      onToolStart: (label) => {
        setToolStatus(label)
      },

      onToolEnd: () => {
        setToolStatus(null)
      },

      onDone: (fullText) => {
        setMessages(prev => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (last && last.role === 'assistant') {
            updated[updated.length - 1] = {
              ...last,
              content: last.content || fullText,
              isStreaming: false,
            }
          }
          return updated
        })
        setIsLoading(false)
        setToolStatus(null)
      },

      onError: (err) => {
        console.error('Claude API error:', err)
        logConversation({ type: 'error', text: err.message, timestamp: Date.now() })
        setMessages(prev => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (last && last.role === 'assistant') {
            updated[updated.length - 1] = {
              ...last,
              content: 'Having trouble connecting right now. Try again in a moment.',
              isStreaming: false,
              isError: true,
            }
          }
          return updated
        })
        setIsLoading(false)
        setToolStatus(null)
      },
    })

    abortRef.current = abort
  }, [messages, isLoading])

  const handleSuggestion = (text) => {
    handleSend(text)
  }

  const handleClear = () => {
    if (abortRef.current) abortRef.current()
    setMessages([])
    setIsLoading(false)
    setToolStatus(null)
  }

  const showWelcome = messages.length === 0

  return (
    <div className="chat-layout">
      {/* ── Left: Chat panel ── */}
      <div className="chat-panel">
        {/* Minimal header */}
        <header className="chat-header">
          <div className="chat-header-brand">
            <span className="chat-wordmark">Frank<span className="chat-period">.</span></span>
          </div>
          <div className="chat-header-meta">
            {messages.length > 0 && (
              <button className="chat-clear-btn" onClick={handleClear}>
                CLEAR
              </button>
            )}
            <span className="chat-header-label">MANHATTAN</span>
          </div>
        </header>

        {/* Welcome state or messages */}
        {showWelcome ? (
          <div className="chat-welcome">
            <div className="chat-welcome-inner">
              <div className="chat-welcome-rule" />
              <h1 className="chat-welcome-title">
                WHAT'S THE DEAL.
              </h1>
              <p className="chat-welcome-subtitle">
                Ask about an address. Run a pro forma. Source a deal.
              </p>

              <div className="chat-suggestions">
                <div className="chat-suggestions-label">TRY ASKING</div>
                {SUGGESTED_PROMPTS.map((sp, i) => (
                  <button
                    key={i}
                    className="chat-suggestion"
                    onClick={() => handleSuggestion(sp.text)}
                  >
                    <span className="chat-suggestion-label">{sp.label}</span>
                    <span className="chat-suggestion-text">{sp.text}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <MessageList
            messages={messages}
            toolStatus={toolStatus}
            isLoading={isLoading}
          />
        )}

        {/* Input bar */}
        <ChatInput
          onSend={handleSend}
          disabled={isLoading}
          placeholder={showWelcome ? 'Ask Frank anything...' : 'Follow up...'}
        />
      </div>

      {/* ── Right: Map panel ── */}
      <div className="map-panel">
        <MapPanel highlightedBbls={highlightedBbls} />
      </div>
    </div>
  )
}
