// FrankSeal — Reusable seal component at all scale breakpoints
// See brand-assets/frank-logo-update-brief.md for full spec

export function FrankSeal({ size = 32, theme = 'dark' }) {
  const ink   = theme === 'dark' ? '#F0E8DA' : '#1A1714'
  const red   = theme === 'dark' ? '#C8392D' : '#B83227'
  const sub   = theme === 'dark' ? '#8A8278' : '#4A4540'
  const muted = theme === 'dark' ? '#5C5650' : '#8A8278'

  // Full seal (110px+)
  if (size >= 110) return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <defs>
        <path id={`arc-top-${size}`} d="M 10,100 A 90,90 0 0,1 190,100" />
        <path id={`arc-bot-${size}`} d="M 28,126 A 78,78 0 0,0 172,126" />
      </defs>
      <circle cx="100" cy="100" r="94" stroke={ink} strokeWidth="5.5" />
      <circle cx="100" cy="100" r="86" stroke={ink} strokeWidth="0.75" />
      <circle cx="100" cy="100" r="66" stroke={red} strokeWidth="1.5" />
      <circle cx="100" cy="100" r="60" stroke={red} strokeWidth="0.4" />
      <circle cx="100" cy="6"   r="4" fill={red} />
      <circle cx="100" cy="194" r="4" fill={red} />
      <circle cx="6"   cy="100" r="4" fill={red} />
      <circle cx="194" cy="100" r="4" fill={red} />
      <text fontFamily="Georgia,serif" fontSize="25" fontWeight="700" fill={ink} letterSpacing="19">
        <textPath href={`#arc-top-${size}`} startOffset="50%" textAnchor="middle">FRANK</textPath>
      </text>
      <text fontFamily="monospace" fontSize="8" fill={sub} letterSpacing="3.5">
        <textPath href={`#arc-bot-${size}`} startOffset="50%" textAnchor="middle">LICENSED · DEAL INTELLIGENCE</textPath>
      </text>
      <text x="100" y="88" fontFamily="Georgia,serif" fontSize="44" fontWeight="700"
            fill={red} textAnchor="middle" dominantBaseline="central">F</text>
      <line x1="68" y1="108" x2="132" y2="108" stroke={ink} strokeWidth="0.75" />
      <text x="100" y="120" fontFamily="monospace" fontSize="7.5" fill={sub} textAnchor="middle" letterSpacing="2">FRANK.AI</text>
      <text x="100" y="131" fontFamily="monospace" fontSize="6.5" fill={muted} textAnchor="middle" letterSpacing="1">NEW YORK</text>
    </svg>
  )

  // Reduced (60px) — FRANK arc + F only
  if (size >= 60) return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <defs><path id={`arc-top-${size}`} d="M 10,100 A 90,90 0 0,1 190,100" /></defs>
      <circle cx="100" cy="100" r="94" stroke={ink} strokeWidth="6" />
      <circle cx="100" cy="100" r="84" stroke={ink} strokeWidth="1.5" />
      <circle cx="100" cy="100" r="63" stroke={red} strokeWidth="2.5" />
      <circle cx="100" cy="6"   r="5" fill={red} />
      <circle cx="100" cy="194" r="5" fill={red} />
      <circle cx="6"   cy="100" r="5" fill={red} />
      <circle cx="194" cy="100" r="5" fill={red} />
      <text fontFamily="Georgia,serif" fontSize="26" fontWeight="700" fill={ink} letterSpacing="18">
        <textPath href={`#arc-top-${size}`} startOffset="50%" textAnchor="middle">FRANK</textPath>
      </text>
      <text x="100" y="116" fontFamily="Georgia,serif" fontSize="56" fontWeight="700"
            fill={red} textAnchor="middle" dominantBaseline="central">F</text>
    </svg>
  )

  // Nav (30px+) — 3 rings + F
  if (size >= 30) return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <circle cx="100" cy="100" r="94" stroke={ink} strokeWidth="7" />
      <circle cx="100" cy="100" r="78" stroke={ink} strokeWidth="2.5" />
      <circle cx="100" cy="100" r="56" stroke={red} strokeWidth="3.5" />
      <text x="100" y="104" fontFamily="Georgia,serif" fontSize="66" fontWeight="700"
            fill={red} textAnchor="middle" dominantBaseline="central">F</text>
    </svg>
  )

  // Small (18px+) — 2 rings + solid dot
  if (size >= 18) return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <circle cx="100" cy="100" r="94" stroke={ink} strokeWidth="9" />
      <circle cx="100" cy="100" r="72" stroke={ink} strokeWidth="3" />
      <circle cx="100" cy="100" r="30" fill={red} />
    </svg>
  )

  // Favicon (16px)
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <circle cx="100" cy="100" r="94" stroke={ink} strokeWidth="11" />
      <circle cx="100" cy="100" r="68" stroke={ink} strokeWidth="4" />
      <circle cx="100" cy="100" r="28" fill={red} />
    </svg>
  )
}
