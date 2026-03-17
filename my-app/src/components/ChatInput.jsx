import { useState, useRef, useEffect } from 'react'
import './ChatInput.css'

export default function ChatInput({ onSend, disabled, placeholder }) {
  const [value, setValue] = useState('')
  const textareaRef = useRef(null)

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }, [value])

  const handleSubmit = () => {
    if (!value.trim() || disabled) return
    onSend(value.trim())
    setValue('')
    // Reset height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="chat-input-bar">
      <div className="chat-input-container">
        <textarea
          ref={textareaRef}
          className="chat-input-textarea"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          autoFocus
        />
        <button
          className="chat-send-btn"
          onClick={handleSubmit}
          disabled={disabled || !value.trim()}
        >
          SEND
        </button>
      </div>
      <div className="chat-input-footer">
        <span>FRANK.AI</span>
        <span>·</span>
        <span>LIVE NYC DATA</span>
        <span>·</span>
        <span>42,000+ LOTS</span>
      </div>
    </div>
  )
}
