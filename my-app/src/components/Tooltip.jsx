import { useState } from 'react'
import './Tooltip.css'

export default function Tooltip({ content, children, width = 220 }) {
  const [visible, setVisible] = useState(false)

  return (
    <span
      className="tooltip-wrapper"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && content && (
        <span className="tooltip-panel" role="tooltip" style={{ width }}>
          {content}
        </span>
      )}
    </span>
  )
}
