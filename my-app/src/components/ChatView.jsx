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

// Neighborhood → map center coordinates
const NEIGHBORHOODS = {
  'upper east side':      { lng: -73.9565, lat: 40.7736, zoom: 14 },
  'ues':                  { lng: -73.9565, lat: 40.7736, zoom: 14 },
  'upper west side':      { lng: -73.9756, lat: 40.7870, zoom: 14 },
  'uws':                  { lng: -73.9756, lat: 40.7870, zoom: 14 },
  'midtown':              { lng: -73.9800, lat: 40.7580, zoom: 14 },
  'midtown east':         { lng: -73.9710, lat: 40.7550, zoom: 14.5 },
  'midtown west':         { lng: -73.9900, lat: 40.7580, zoom: 14.5 },
  'chelsea':              { lng: -73.9980, lat: 40.7465, zoom: 14.5 },
  'hudson yards':         { lng: -74.0010, lat: 40.7530, zoom: 15 },
  'greenwich village':    { lng: -73.9986, lat: 40.7336, zoom: 14.5 },
  'west village':         { lng: -74.0050, lat: 40.7340, zoom: 15 },
  'east village':         { lng: -73.9840, lat: 40.7265, zoom: 14.5 },
  'lower east side':      { lng: -73.9840, lat: 40.7155, zoom: 14.5 },
  'les':                  { lng: -73.9840, lat: 40.7155, zoom: 14.5 },
  'soho':                 { lng: -74.0000, lat: 40.7233, zoom: 15 },
  'noho':                 { lng: -73.9930, lat: 40.7270, zoom: 15 },
  'tribeca':              { lng: -74.0085, lat: 40.7195, zoom: 15 },
  'financial district':   { lng: -74.0090, lat: 40.7075, zoom: 14.5 },
  'fidi':                 { lng: -74.0090, lat: 40.7075, zoom: 14.5 },
  'battery park':         { lng: -74.0170, lat: 40.7095, zoom: 15 },
  'harlem':               { lng: -73.9450, lat: 40.8116, zoom: 14 },
  'central harlem':       { lng: -73.9450, lat: 40.8116, zoom: 14 },
  'east harlem':          { lng: -73.9420, lat: 40.7955, zoom: 14 },
  'hamilton heights':     { lng: -73.9500, lat: 40.8250, zoom: 14.5 },
  'washington heights':   { lng: -73.9400, lat: 40.8430, zoom: 14 },
  'inwood':               { lng: -73.9230, lat: 40.8680, zoom: 14.5 },
  'murray hill':          { lng: -73.9785, lat: 40.7480, zoom: 14.5 },
  'gramercy':             { lng: -73.9855, lat: 40.7370, zoom: 14.5 },
  'gramercy park':        { lng: -73.9855, lat: 40.7370, zoom: 14.5 },
  'flatiron':             { lng: -73.9893, lat: 40.7410, zoom: 15 },
  'hell\'s kitchen':      { lng: -73.9930, lat: 40.7640, zoom: 14.5 },
  'hells kitchen':        { lng: -73.9930, lat: 40.7640, zoom: 14.5 },
  'morningside heights':  { lng: -73.9600, lat: 40.8100, zoom: 14.5 },
  'yorkville':            { lng: -73.9490, lat: 40.7790, zoom: 14.5 },
  'lenox hill':           { lng: -73.9610, lat: 40.7660, zoom: 14.5 },
  'sutton place':         { lng: -73.9610, lat: 40.7580, zoom: 15 },
  'kips bay':             { lng: -73.9770, lat: 40.7420, zoom: 14.5 },
  'stuyvesant':           { lng: -73.9810, lat: 40.7315, zoom: 14.5 },
  'chinatown':            { lng: -73.9970, lat: 40.7158, zoom: 15 },
  'little italy':         { lng: -73.9975, lat: 40.7195, zoom: 15 },
  'nolita':               { lng: -73.9950, lat: 40.7230, zoom: 15 },
  'two bridges':          { lng: -73.9890, lat: 40.7110, zoom: 15 },
  'roosevelt island':     { lng: -73.9510, lat: 40.7620, zoom: 14.5 },
  'manhattan':            { lng: -73.9712, lat: 40.7831, zoom: 12 },
}

// Extract neighborhood from user text
function detectNeighborhood(text) {
  const lower = text.toLowerCase()
  // Sort by length descending so "upper east side" matches before "east"
  const sorted = Object.keys(NEIGHBORHOODS).sort((a, b) => b.length - a.length)
  for (const name of sorted) {
    if (lower.includes(name)) return NEIGHBORHOODS[name]
  }
  return null
}

// Extract BBLs from assistant message text ([MAP:...] and [PROPERTY:...] markers)
function extractBblsFromText(text) {
  const bbls = []
  const mapMatches = text.matchAll(/\[MAP:([^\]]+)\]/g)
  for (const m of mapMatches) {
    m[1].split(',').forEach(b => {
      const t = b.trim()
      if (t) bbls.push(t)
    })
  }
  const propMatches = text.matchAll(/\[PROPERTY:([^\]]+)\]/g)
  for (const m of propMatches) {
    const t = m[1].trim()
    if (t) bbls.push(t)
  }
  return bbls
}

let messageIdCounter = Date.now()
function nextId() { return `msg_${++messageIdCounter}` }

export default function ChatView() {
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [toolStatus, setToolStatus] = useState(null)
  const [mapTarget, setMapTarget] = useState(null)         // { lng, lat, zoom } for fly-to
  const [highlightedBbls, setHighlightedBbls] = useState([]) // BBLs to highlight
  const [selectedBbl, setSelectedBbl] = useState(null)     // BBL selected from chat card → zoom map
  const abortRef = useRef(null)

  // Auto-preload the PLUTO dataset on mount
  useEffect(() => {
    import('../data/pluto.js').then(m => m.loadAllLots())
  }, [])

  // Also extract BBLs from assistant message text as they stream
  useEffect(() => {
    const lastMsg = messages[messages.length - 1]
    if (!lastMsg || lastMsg.role !== 'assistant' || !lastMsg.content) return
    const textBbls = extractBblsFromText(lastMsg.content)
    if (textBbls.length > 0) {
      setHighlightedBbls(prev => {
        const set = new Set([...prev, ...textBbls])
        return Array.from(set)
      })
    }
  }, [messages])

  const handleSend = useCallback((text) => {
    if (!text.trim() || isLoading) return

    logConversation({ type: 'user_message', text, timestamp: Date.now() })

    // Detect neighborhood in user query → fly map immediately
    const nbhd = detectNeighborhood(text)
    if (nbhd) {
      setMapTarget({ ...nbhd, _ts: Date.now() })
    }

    // Clear previous highlights for new query
    setHighlightedBbls([])

    const userMsg = { id: nextId(), role: 'user', content: text }
    const assistantMsg = { id: nextId(), role: 'assistant', content: '', isStreaming: true }

    setMessages(prev => [...prev, userMsg, assistantMsg])
    setIsLoading(true)
    setToolStatus(null)

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

      // Map feedback: capture BBLs from tool results in real-time
      onMapUpdate: (update) => {
        if (update.bbls?.length > 0) {
          setHighlightedBbls(prev => {
            const set = new Set([...prev, ...update.bbls])
            return Array.from(set)
          })
        }
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

  // Chat → Map: click a PropertyCard to zoom map to that lot
  const handleCardClick = useCallback((bbl) => {
    setSelectedBbl(bbl)
  }, [])

  // Map → Chat: click a highlighted lot to scroll to its PropertyCard
  const handleLotClick = useCallback((bbl) => {
    const card = document.querySelector(`[data-bbl="${bbl}"]`)
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' })
      card.classList.remove('prop-card-flash')
      // Force reflow to restart animation
      void card.offsetWidth
      card.classList.add('prop-card-flash')
    }
  }, [])

  const handleClear = () => {
    if (abortRef.current) abortRef.current()
    setMessages([])
    setIsLoading(false)
    setToolStatus(null)
    setHighlightedBbls([])
    setMapTarget(null)
    setSelectedBbl(null)
  }

  const showWelcome = messages.length === 0

  return (
    <div className="chat-layout">
      {/* ── Left: Chat panel ── */}
      <div className="chat-panel">
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
            onCardClick={handleCardClick}
          />
        )}

        <ChatInput
          onSend={handleSend}
          disabled={isLoading}
          placeholder={showWelcome ? 'Ask Frank anything...' : 'Follow up...'}
        />
      </div>

      {/* ── Right: Map panel ── */}
      <div className="map-panel">
        <MapPanel
          highlightedBbls={highlightedBbls}
          mapTarget={mapTarget}
          selectedBbl={selectedBbl}
          onLotClick={handleLotClick}
        />
      </div>
    </div>
  )
}
