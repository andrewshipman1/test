import { useState, useRef, useCallback, useEffect } from 'react'
import { sendMessage } from '../api/claude.js'
import { logConversation } from '../api/conversationLog.js'
import MessageList from './MessageList.jsx'
import ChatInput from './ChatInput.jsx'
import './ChatView.css'

const SUGGESTED_PROMPTS = [
  {
    label: 'Find opportunities',
    text: 'Find the highest-scoring vacant lots in Harlem with at least 30,000 buildable SF',
  },
  {
    label: 'Underwrite a deal',
    text: 'Run a condo pro forma for a 45,000 SF site in Tribeca at $3,200/SF sellout',
  },
  {
    label: 'Due diligence',
    text: 'What are the biggest rent-stabilized buildings in the East Village with open violations?',
  },
]

let messageIdCounter = 0
function nextId() { return `msg_${++messageIdCounter}` }

export default function ChatView() {
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [toolStatus, setToolStatus] = useState(null)
  const abortRef = useRef(null)

  // Auto-preload the PLUTO dataset on mount
  useEffect(() => {
    import('../data/pluto.js').then(m => m.loadAllLots())
  }, [])

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
              content: `Error: ${err.message}`,
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
    <div className="chat-view">
      {/* Minimal header */}
      <header className="chat-header">
        <div className="chat-header-brand">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <rect x="0.5" y="0.5" width="23" height="23" stroke="#8A8278" strokeWidth="1.25" fill="none"/>
            <rect x="3" y="3" width="18" height="18" stroke="#8A8278" strokeWidth="0.4" fill="none"/>
            <line x1="3" y1="16" x2="21" y2="16" stroke="#8A8278" strokeWidth="0.4"/>
            <circle cx="12" cy="10" r="1.75" fill="none" stroke="#C4A06A" strokeWidth="1"/>
            <circle cx="12" cy="10" r="0.7" fill="#C4A06A"/>
          </svg>
          <span className="chat-wordmark">PARCEL</span>
        </div>
        <div className="chat-header-meta">
          {messages.length > 0 && (
            <button className="chat-clear-btn" onClick={handleClear}>
              CLEAR
            </button>
          )}
          <span className="chat-header-label">AI ACQUISITION ANALYST</span>
        </div>
      </header>

      {/* Welcome state or messages */}
      {showWelcome ? (
        <div className="chat-welcome">
          <div className="chat-welcome-inner">
            <div className="chat-welcome-rule" />
            <h1 className="chat-welcome-title">
              ASK PARCEL
            </h1>
            <p className="chat-welcome-subtitle">
              Acquisition intelligence for every lot in Manhattan.
              Ask about properties, run pro formas, or surface hidden opportunities.
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
        placeholder={showWelcome ? 'Ask Parcel anything about Manhattan real estate...' : 'Follow up...'}
      />
    </div>
  )
}
