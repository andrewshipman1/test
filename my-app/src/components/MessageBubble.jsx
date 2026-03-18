import { useMemo } from 'react'
import InlineMap from './rich/InlineMap.jsx'
import PropertyCard from './rich/PropertyCard.jsx'
import ProFormaTable from './rich/ProFormaTable.jsx'
import './MessageBubble.css'

// Parse rich content markers from Claude's response
function parseRichContent(text) {
  if (!text) return [{ type: 'text', content: '' }]

  const segments = []
  // Match [MAP:...], [PROPERTY:...], [PROFORMA:...], [STAMP], [PUSHBACK]
  const markerRegex = /\[(MAP|PROPERTY|PROFORMA):([^\]]+)\]|\[(STAMP)\]|\[(PUSHBACK)\]\s*/g

  let lastIndex = 0
  let match
  let isPushback = false

  while ((match = markerRegex.exec(text)) !== null) {
    // Text before the marker
    if (match.index > lastIndex) {
      const textBefore = text.slice(lastIndex, match.index).trim()
      if (textBefore) {
        segments.push({ type: isPushback ? 'pushback-text' : 'text', content: textBefore })
        isPushback = false
      }
    }

    const markerType = match[1] || match[3] || match[4]

    if (markerType === 'MAP') {
      const bbls = match[2].split(',').map(b => b.trim()).filter(Boolean)
      segments.push({ type: 'map', bbls })
    } else if (markerType === 'PROPERTY') {
      segments.push({ type: 'property', bbl: match[2].trim() })
    } else if (markerType === 'PROFORMA') {
      const parts = match[2].split(',').map(p => parseFloat(p.trim()))
      if (parts.length >= 3) {
        segments.push({
          type: 'proforma',
          buildableSF: parts[0],
          selloutPsf: parts[1],
          landResidual: parts[2],
        })
      }
    } else if (markerType === 'STAMP') {
      segments.push({ type: 'stamp' })
    } else if (markerType === 'PUSHBACK') {
      // Next text segment becomes pushback-styled
      isPushback = true
    }

    lastIndex = match.index + match[0].length
  }

  // Remaining text
  if (lastIndex < text.length) {
    const remaining = text.slice(lastIndex).trim()
    if (remaining) segments.push({ type: isPushback ? 'pushback-text' : 'text', content: remaining })
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
      <div className="msg-frank-header">
        <span className="msg-frank-wordmark">Frank<span className="msg-frank-period">.</span></span>
        <span className="msg-frank-rule" />
      </div>
      <div className="msg-frank-body">
        {segments.map((seg, i) => {
          switch (seg.type) {
            case 'text':
              return (
                <div key={i} className="msg-text">
                  {formatText(seg.content)}
                </div>
              )
            case 'pushback-text':
              return (
                <div key={i} className="msg-pushback">
                  <div className="msg-pushback-label">Frank's Take</div>
                  <div className="msg-text">
                    {formatText(seg.content)}
                  </div>
                </div>
              )
            case 'stamp':
              // Stripped — stamp now renders automatically at end of every response
              return null
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
        {/* Auto stamp — subtle sign-off at end of every completed response */}
        {!isStreaming && !isError && (
          <div className="msg-stamp">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 230 230" width="28" height="28">
              <circle cx="115" cy="115" r="106" stroke="#8B2E22" strokeWidth="5" fill="none"/>
              <circle cx="115" cy="115" r="99"  stroke="#8B2E22" strokeWidth="1.5" fill="none"/>
              <circle cx="115" cy="115" r="74"  stroke="#8B2E22" strokeWidth="1.5" fill="none"/>
              <defs>
                <path id="arc-top-auto" d="M 18,115 A 97,97 0 0,1 212,115"/>
              </defs>
              <text fontFamily="'Playfair Display',Georgia,serif" fontSize="34" fontWeight="700" fill="#8B2E22" letterSpacing="18">
                <textPath href="#arc-top-auto" startOffset="50%" textAnchor="middle">FRANK</textPath>
              </text>
              <text x="115" y="120" fontFamily="'IBM Plex Mono',monospace" fontSize="14" fill="#8B2E22" textAnchor="middle" letterSpacing="4">N.Y.</text>
              <circle cx="9"   cy="115" r="4" fill="#8B2E22"/>
              <circle cx="221" cy="115" r="4" fill="#8B2E22"/>
              <circle cx="115" cy="9"   r="4" fill="#8B2E22"/>
              <circle cx="115" cy="221" r="4" fill="#8B2E22"/>
            </svg>
          </div>
        )}
      </div>
    </div>
  )
}
