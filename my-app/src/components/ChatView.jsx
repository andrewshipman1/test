import { useState, useRef, useCallback, useEffect } from 'react'
import { sendMessage } from '../api/claude.js'
import { logConversation } from '../api/conversationLog.js'
import MessageList from './MessageList.jsx'
import ChatInput from './ChatInput.jsx'
import './ChatView.css'

const SUGGESTED_PROMPTS = [
  {
    label: 'Source a deal',
    text: 'Find me vacant lots in Harlem with 30,000+ buildable SF and no rent stabilization risk',
  },
  {
    label: 'Run the numbers',
    text: 'Run a condo pro forma on a 45,000 SF site in Tribeca at $3,200 sellout',
  },
  {
    label: 'Due diligence',
    text: 'What\'s the rent stabilization exposure on the big walk-ups in the East Village?',
  },
]

let messageIdCounter = Date.now()
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
    <div className="chat-view">
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
          <span className="chat-header-label">MANHATTAN · DEAL SOURCING</span>
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
              Ask about an address. Run a pro forma. Source a deal.<br />
              Frank will tell you when the numbers don't work.
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
        placeholder={showWelcome ? 'Ask Frank anything about this deal...' : 'Follow up...'}
      />
    </div>
  )
}
