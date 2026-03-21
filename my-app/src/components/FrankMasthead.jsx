// FrankMasthead — Four-rule typographic wordmark system
// See brand-assets/frank-logo-update-brief.md for full spec

export function FrankMasthead({ size = 'sm', theme = 'dark', showDescriptor = false }) {
  const ink   = theme === 'dark' ? '#F0E8DA' : '#1A1714'
  const rule3 = theme === 'dark' ? '#5C5650' : '#8A8278'
  const red   = theme === 'dark' ? '#C8392D' : '#B83227'
  const desc  = theme === 'dark' ? '#5C5650' : '#8A8278'

  const config = {
    sm: { fontSize: 14, letterSpacing: '0.1em', rule1: 2, rule2: 0.5, gap1: 4, rule3h: 0.5, rule4: 1.5, gap2: 3.5, width: 72 },
    md: { fontSize: 32, letterSpacing: '0.09em', rule1: 3, rule2: 0.75, gap1: 8, rule3h: 0.75, rule4: 2, gap2: 5, width: 160 },
    lg: { fontSize: 58, letterSpacing: '0.09em', rule1: 4, rule2: 1, gap1: 13, rule3h: 1, rule4: 2.5, gap2: 8, width: 250 },
  }[size]

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Rule 1 — heavy */}
      <div style={{ height: config.rule1, background: ink, marginBottom: size === 'sm' ? 1.5 : 3 }} />
      {/* Rule 2 — thin */}
      <div style={{ height: config.rule2, background: ink, marginBottom: config.gap1 }} />
      {/* FRANK */}
      <div style={{
        fontFamily: 'Georgia, serif',
        fontSize: config.fontSize,
        fontWeight: 700,
        color: ink,
        letterSpacing: config.letterSpacing,
        lineHeight: 1,
      }}>FRANK</div>
      {/* Rule 3 — muted */}
      <div style={{ height: config.rule3h, background: rule3, marginTop: size === 'sm' ? 3.5 : config.gap2, marginBottom: size === 'sm' ? 2.5 : 3.5 }} />
      {/* Rule 4 — red */}
      <div style={{ height: config.rule4, background: red }} />
      {/* Descriptor (optional) */}
      {showDescriptor && (
        <div style={{
          fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
          fontSize: size === 'lg' ? 8 : 7,
          letterSpacing: size === 'lg' ? '0.22em' : '0.18em',
          color: desc,
          textTransform: 'uppercase',
          marginTop: size === 'lg' ? 8 : 5,
        }}>Deal Intelligence · Manhattan</div>
      )}
    </div>
  )
}
