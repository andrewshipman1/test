import { useRef, useEffect } from 'react'
import MessageBubble from './MessageBubble.jsx'
import './MessageList.css'

export default function MessageList({ messages, toolStatus, isLoading }) {
  const bottomRef = useRef(null)
  const containerRef = useRef(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, toolStatus])

  return (
    <div className="message-list" ref={containerRef}>
      <div className="message-list-inner">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {/* Tool execution status */}
        {toolStatus && (
          <div className="tool-status">
            <div className="tool-status-dot" />
            <span>{toolStatus}</span>
          </div>
        )}

        {/* Loading indicator when waiting for initial response */}
        {isLoading && !toolStatus && messages[messages.length - 1]?.role === 'assistant' && !messages[messages.length - 1]?.content && (
          <div className="tool-status">
            <div className="tool-status-dot" />
            <span>Thinking...</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}
