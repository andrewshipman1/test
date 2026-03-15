import { useState, useRef } from 'react'
import './Tooltip.css'

export default function Tooltip({ content, children, width = 220 }) {
  const [visible, setVisible] = useState(false)
  const [pos, setPos] = useState(null)
  const wrapperRef = useRef(null)

  const handleMouseEnter = () => {
    if (wrapperRef.current) {
      const r = wrapperRef.current.getBoundingClientRect()
      setPos({ top: r.top, left: r.left + r.width / 2 })
    }
    setVisible(true)
  }

  return (
    <span
      ref={wrapperRef}
      className="tooltip-wrapper"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && content && pos && (
        <span
          className="tooltip-panel"
          role="tooltip"
          style={{
            width,
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            bottom: 'auto',
            transform: 'translate(-50%, calc(-100% - 8px))',
          }}
        >
          {content}
        </span>
      )}
    </span>
  )
}
