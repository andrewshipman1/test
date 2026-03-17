import { useMemo } from 'react'
import InlineMap from './rich/InlineMap.jsx'
import PropertyCard from './rich/PropertyCard.jsx'
import ProFormaTable from './rich/ProFormaTable.jsx'
import './MessageBubble.css'

// Parse rich content markers from Claude's response
function parseRichContent(text) {
  if (!text) return [{ type: 'text', content: '' }]

  const segments = []
  // Match [MAP:bbl1,bbl2,...] or [PROPERTY:bbl] or [PROFORMA:sf,psf,residual]
  const markerRegex = /\[(MAP|PROPERTY|PROFORMA):([^\]]+)\]/g

  let lastIndex = 0
  let match

  while ((match = markerRegex.exec(text)) !== null) {
    // Text before the marker
    if (match.index > lastIndex) {
      const textBefore = text.slice(lastIndex, match.index).trim()
      if (textBefore) segments.push({ type: 'text', content: textBefore })
    }

    const markerType = match[1]
    const markerData = match[2]

    if (markerType === 'MAP') {
      const bbls = markerData.split(',').map(b => b.trim()).filter(Boolean)
      segments.push({ type: 'map', bbls })
    } else if (markerType === 'PROPERTY') {
      segments.push({ type: 'property', bbl: markerData.trim() })
    } else if (markerType === 'PROFORMA') {
      const parts = markerData.split(',').map(p => parseFloat(p.trim()))
      if (parts.length >= 3) {
        segments.push({
          type: 'proforma',
          buildableSF: parts[0],
          selloutPsf: parts[1],
          landResidual: parts[2],
        })
      }
    }

    lastIndex = match.index + match[0].length
  }

  // Remaining text
  if (lastIndex < text.length) {
    const remaining = text.slice(lastIndex).trim()
    if (remaining) segments.push({ type: 'text', content: remaining })
  }

  if (segments.length === 0) {
    segments.push({ type: 'text', content: text })
  }

  return segments
}

// Format markdown-light text (bold, bullet lists, headers)
function formatText(text) {
  if (!text) return null

  const lines = text.split('\n')
  const elements = []
  let currentList = []

  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="msg-list">
          {currentList.map((item, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: inlineFormat(item) }} />
          ))}
        </ul>
      )
      currentList = []
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Bullet list items
    if (line.match(/^[\s]*[-•*]\s/)) {
      currentList.push(line.replace(/^[\s]*[-•*]\s/, ''))
      continue
    }

    // Numbered list items
    if (line.match(/^[\s]*\d+[.)]\s/)) {
      currentList.push(line.replace(/^[\s]*\d+[.)]\s/, ''))
      continue
    }

    flushList()

    // Headers (### or ##)
    if (line.match(/^#{1,3}\s/)) {
      elements.push(
        <div key={i} className="msg-heading"
          dangerouslySetInnerHTML={{ __html: inlineFormat(line.replace(/^#{1,3}\s/, '')) }}
        />
      )
      continue
    }

    // Empty lines
    if (!line.trim()) {
      if (elements.length > 0) {
        elements.push(<div key={i} className="msg-spacer" />)
      }
      continue
    }

    // Regular paragraph
    elements.push(
      <p key={i} className="msg-paragraph"
        dangerouslySetInnerHTML={{ __html: inlineFormat(line) }}
      />
    )
  }

  flushList()
  return elements
}

// Inline formatting: **bold**, `code`, strip orphaned markers
function inlineFormat(text) {
  if (!text || text.trim() === '**') return ''
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code class="msg-code">$1</code>')
}

export default function MessageBubble({ message }) {
  const { role, content, isStreaming, isError } = message

  const segments = useMemo(() => {
    if (role === 'user') return [{ type: 'text', content }]
    return parseRichContent(content)
  }, [content, role])

  if (role === 'user') {
    return (
      <div className="msg msg-user">
        <div className="msg-user-content">{content}</div>
      </div>
    )
  }

  return (
    <div className={`msg msg-assistant ${isError ? 'msg-error' : ''}`}>
      {segments.map((seg, i) => {
        switch (seg.type) {
          case 'text':
            return (
              <div key={i} className="msg-text">
                {formatText(seg.content)}
              </div>
            )
          case 'map':
            return <InlineMap key={i} bbls={seg.bbls} />
          case 'property':
            return <PropertyCard key={i} bbl={seg.bbl} />
          case 'proforma':
            return <ProFormaTable key={i} data={seg} />
          default:
            return null
        }
      })}
      {isStreaming && <span className="msg-cursor" />}
    </div>
  )
}
