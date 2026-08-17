# FRANK. — Logo Update Brief v2.0
## For Claude Code · Mark System Refresh
### Reference: frank-assets-v2.svg for all SVG source

---

## WHAT CHANGED — ONE SENTENCE

The wordmark changed from Playfair Display mixed-case "Frank." to a masthead system: Georgia Bold ALL-CAPS "FRANK" with a four-rule typographic frame. The seal geometry is unchanged. Together they form a single lockup.

---

## THE PROBLEM WITH THE OLD MARK

- Playfair Display mixed-case with a styled period = D2C / lifestyle brand (Away, Ritual, Hims)
- Wordmark and stamp were visually disconnected — two separate things
- Insufficient institutional weight for a product used in serious deal decisions
- Too smooth, too modern, no press or editorial gravity

---

## THE NEW MARK — COMPLETE SPEC

### Wordmark system

```
[RULE 1: 4px solid #1A1714]
[RULE 2: 1px solid #1A1714]
         (13px gap)
FRANK                        ← Georgia Bold, all-caps, tracking 0.09em
         (gap)
[RULE 3: 1px solid #8A8278]
[RULE 4: 2.5px solid #B83227]
         (8px gap)
Deal Intelligence · Manhattan  ← IBM Plex Mono / Courier New, 8px,
                                  tracking 0.22em, UPPERCASE, #8A8278
```

**Key rules:**
- Font: Georgia Bold (system font, no import needed)
- Always ALL-CAPS: "FRANK" not "Frank"
- Never add a period to the wordmark — the period is removed
- Red lives in: rule 4 (2.5px), seal F monogram, seal cardinal dots, send button
- The descriptor is always "Deal Intelligence · Manhattan" — no year, no tagline

### Seal (unchanged geometry, same as v1)

```
Ring 1 (outer):   stroke-width 5.5px  · #1A1714
Ring 2:           stroke-width 0.75px · #1A1714
Ring 3 (red):     stroke-width 1.5px  · #B83227
Ring 4 (inner):   stroke-width 0.4px  · #B83227
Cardinal dots:    r=4 · fill #B83227  · at 12/3/6/9 o'clock
Arc top:          "FRANK" · Georgia 700 · font-size 25 · letter-spacing 19
Arc bottom:       "LICENSED · DEAL INTELLIGENCE" · monospace · 8px · ls 3.5
F monogram:       Georgia 700 · font-size 44 · fill #B83227 · centered
Center rule:      0.75px · #1A1714 · x:68–132 y:108
Center text 1:    "FRANK.AI" · monospace · 7.5px · y:120
Center text 2:    "NEW YORK" · monospace · 6.5px · y:131
```

### Scale behavior (seal)

| Size | What to show |
|------|-------------|
| 110px+ | Full seal: all rings, both arcs, F, rule, FRANK.AI, NEW YORK |
| 60px | 3 rings, FRANK arc top only, F monogram |
| 32px | 3 rings, F monogram — NO arc text |
| 20px | 2 rings, solid red circle center (r=3) |
| 16px favicon | 2 rings (heavier stroke), solid red circle (r=2.2) |

---

## COMPONENT-BY-COMPONENT CHANGES

### 1. Marketing site — `<header>` / nav

**Remove:** `<span>Frank<span style="color:...">.</span></span>`

**Replace with this lockup:**
```jsx
<div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>

  {/* Seal — 28px, from frank-assets-v2.svg nav variant */}
  <svg width="28" height="28" viewBox="0 0 200 200" fill="none">
    <defs>
      <path id="nav-arc" d="M 10,100 A 90,90 0 0,1 190,100"/>
    </defs>
    <circle cx="100" cy="100" r="94" stroke="#1A1714" strokeWidth="6.5" fill="none"/>
    <circle cx="100" cy="100" r="83" stroke="#1A1714" strokeWidth="1.5" fill="none"/>
    <circle cx="100" cy="100" r="62" stroke="#B83227" strokeWidth="2.5" fill="none"/>
    <circle cx="100" cy="6"   r="5" fill="#B83227"/>
    <circle cx="100" cy="194" r="5" fill="#B83227"/>
    <circle cx="6"   cy="100" r="5" fill="#B83227"/>
    <circle cx="194" cy="100" r="5" fill="#B83227"/>
    <text fontFamily="Georgia,serif" fontSize="26" fontWeight="700" fill="#1A1714" letterSpacing="18">
      <textPath href="#nav-arc" startOffset="50%" textAnchor="middle">FRANK</textPath>
    </text>
    <text x="100" y="116" fontFamily="Georgia,serif" fontSize="56" fontWeight="700"
          fill="#B83227" textAnchor="middle" dominantBaseline="central">F</text>
  </svg>

  {/* Masthead mini */}
  <div>
    <div style={{ height: '2.5px', background: '#1A1714', marginBottom: '1.5px' }} />
    <div style={{ height: '0.5px', background: '#1A1714', marginBottom: '4px' }} />
    <div style={{
      fontFamily: 'Georgia, serif',
      fontSize: '15px',
      fontWeight: 700,
      color: '#1A1714',
      letterSpacing: '0.1em'
    }}>FRANK</div>
    <div style={{ height: '0.5px', background: '#8A8278', marginTop: '3.5px', marginBottom: '2.5px' }} />
    <div style={{ height: '1.5px', background: '#B83227' }} />
  </div>

</div>
```

---

### 2. Product UI — authenticated nav

Same lockup, reversed colors:

```jsx
{/* Seal — dark, 24px */}
<svg width="24" height="24" viewBox="0 0 200 200" fill="none">
  <circle cx="100" cy="100" r="94" stroke="#F0E8DA" strokeWidth="7" fill="none"/>
  <circle cx="100" cy="100" r="78" stroke="#F0E8DA" strokeWidth="2.5" fill="none"/>
  <circle cx="100" cy="100" r="56" stroke="#C8392D" strokeWidth="3.5" fill="none"/>
  <text x="100" y="104" fontFamily="Georgia,serif" fontSize="66" fontWeight="700"
        fill="#C8392D" textAnchor="middle" dominantBaseline="central">F</text>
</svg>

{/* Masthead mini — reversed */}
<div>
  <div style={{ height: '2px', background: '#F0E8DA', marginBottom: '1.5px' }} />
  <div style={{ height: '0.5px', background: '#F0E8DA', marginBottom: '4px' }} />
  <div style={{
    fontFamily: 'Georgia, serif',
    fontSize: '14px',
    fontWeight: 700,
    color: '#F0E8DA',
    letterSpacing: '0.1em'
  }}>FRANK</div>
  <div style={{ height: '0.5px', background: '#5C5650', marginTop: '3.5px', marginBottom: '2.5px' }} />
  <div style={{ height: '1.5px', background: '#C8392D' }} />
</div>
```

---

### 3. Hero / marketing headline — large lockup

```jsx
<div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>

  {/* Seal — 130px full version, copy from frank-assets-v2.svg asset 01 */}
  <FrankSeal size={130} theme="light" />

  {/* Masthead — large */}
  <div>
    <div style={{ height: '4px', background: '#1A1714', marginBottom: '3px' }} />
    <div style={{ height: '1px', background: '#1A1714', marginBottom: '13px' }} />
    <div style={{
      fontFamily: 'Georgia, serif',
      fontSize: '70px',
      fontWeight: 700,
      color: '#1A1714',
      lineHeight: 1,
      letterSpacing: '0.09em'
    }}>FRANK</div>
    <div style={{ height: '1px', background: '#8A8278', marginTop: '9px', marginBottom: '3.5px' }} />
    <div style={{ height: '2.5px', background: '#B83227', marginBottom: '8px' }} />
    <div style={{
      fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
      fontSize: '8px',
      letterSpacing: '0.22em',
      color: '#8A8278',
      textTransform: 'uppercase'
    }}>Deal Intelligence · Manhattan</div>
  </div>

</div>
```

---

### 4. Chat response attribution ("Frank" label)

**Remove:** `<span className="frank-response-label">Frank<span style="color:red">.</span></span>`

**Replace with:**
```jsx
<div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
  {/* Seal — 18px */}
  <svg width="18" height="18" viewBox="0 0 200 200" fill="none">
    <circle cx="100" cy="100" r="94" stroke="#F0E8DA" strokeWidth="9" fill="none"/>
    <circle cx="100" cy="100" r="72" stroke="#F0E8DA" strokeWidth="3" fill="none"/>
    <circle cx="100" cy="100" r="30" fill="#C8392D"/>
  </svg>
  <span style={{
    fontFamily: 'Georgia, serif',
    fontSize: '13px',
    fontWeight: 700,
    color: '#F0E8DA',
    letterSpacing: '0.1em'
  }}>FRANK</span>
  {/* Horizontal rule extending to right */}
  <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
</div>
```

---

### 5. Footer / "Stamped by Frank" row

**Remove:** Old "Frank." wordmark in stamp row

**Replace with:**
```jsx
<div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
  {/* Seal — 28px, red on red-wash background */}
  <svg width="28" height="28" viewBox="0 0 200 200" fill="none">
    <circle cx="100" cy="100" r="94" stroke="#B83227" strokeWidth="5.5" fill="none"/>
    <circle cx="100" cy="100" r="84" stroke="#B83227" strokeWidth="1" fill="none"/>
    <circle cx="100" cy="100" r="60" stroke="#B83227" strokeWidth="1" fill="none"/>
    <text x="100" y="104" fontFamily="Georgia,serif" fontSize="64" fontWeight="700"
          fill="#B83227" textAnchor="middle" dominantBaseline="central">F</text>
  </svg>
  <div>
    <div style={{
      fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
      fontSize: '9px',
      letterSpacing: '0.18em',
      textTransform: 'uppercase',
      color: '#B83227'
    }}>Stamped by Frank</div>
    <div style={{
      fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
      fontSize: '9px',
      color: '#8A8278',
      marginTop: '2px'
    }}>{timestamp}</div>
  </div>
</div>
```

---

### 6. Page title / browser tab

```html
<title>Frank — Deal Intelligence</title>
```
Not "Frank. — AI Deal Partner". Remove the period from the page title.

---

### 7. Favicon

Update `favicon.svg` / `favicon.ico` to the 16px seal variant:
```svg
<svg width="16" height="16" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="200" height="200" fill="#1A1714"/>
  <circle cx="100" cy="100" r="94" stroke="#F0E8DA" stroke-width="11" fill="none"/>
  <circle cx="100" cy="100" r="68" stroke="#F0E8DA" stroke-width="4" fill="none"/>
  <circle cx="100" cy="100" r="28" fill="#B83227"/>
</svg>
```

---

## REUSABLE SEAL COMPONENT

Extract the seal into a shared component so you only maintain one SVG:

```jsx
// components/FrankSeal.jsx
export function FrankSeal({ size = 32, theme = 'dark' }) {
  const ink    = theme === 'dark' ? '#F0E8DA' : '#1A1714'
  const red    = theme === 'dark' ? '#C8392D' : '#B83227'
  const sub    = theme === 'dark' ? '#8A8278' : '#4A4540'
  const muted  = theme === 'dark' ? '#5C5650' : '#8A8278'

  // Full seal (110px+)
  if (size >= 110) return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <defs>
        <path id={`arc-top-${size}`} d="M 10,100 A 90,90 0 0,1 190,100"/>
        <path id={`arc-bot-${size}`} d="M 28,126 A 78,78 0 0,0 172,126"/>
      </defs>
      <circle cx="100" cy="100" r="94" stroke={ink} strokeWidth="5.5"/>
      <circle cx="100" cy="100" r="86" stroke={ink} strokeWidth="0.75"/>
      <circle cx="100" cy="100" r="66" stroke={red} strokeWidth="1.5"/>
      <circle cx="100" cy="100" r="60" stroke={red} strokeWidth="0.4"/>
      <circle cx="100" cy="6"   r="4" fill={red}/>
      <circle cx="100" cy="194" r="4" fill={red}/>
      <circle cx="6"   cy="100" r="4" fill={red}/>
      <circle cx="194" cy="100" r="4" fill={red}/>
      <text fontFamily="Georgia,serif" fontSize="25" fontWeight="700" fill={ink} letterSpacing="19">
        <textPath href={`#arc-top-${size}`} startOffset="50%" textAnchor="middle">FRANK</textPath>
      </text>
      <text fontFamily="monospace" fontSize="8" fill={sub} letterSpacing="3.5">
        <textPath href={`#arc-bot-${size}`} startOffset="50%" textAnchor="middle">LICENSED · DEAL INTELLIGENCE</textPath>
      </text>
      <text x="100" y="88" fontFamily="Georgia,serif" fontSize="44" fontWeight="700"
            fill={red} textAnchor="middle" dominantBaseline="central">F</text>
      <line x1="68" y1="108" x2="132" y2="108" stroke={ink} strokeWidth="0.75"/>
      <text x="100" y="120" fontFamily="monospace" fontSize="7.5" fill={sub} textAnchor="middle" letterSpacing="2">FRANK.AI</text>
      <text x="100" y="131" fontFamily="monospace" fontSize="6.5" fill={muted} textAnchor="middle" letterSpacing="1">NEW YORK</text>
    </svg>
  )

  // Reduced (60px) — FRANK arc + F only
  if (size >= 60) return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <defs><path id={`arc-top-${size}`} d="M 10,100 A 90,90 0 0,1 190,100"/></defs>
      <circle cx="100" cy="100" r="94" stroke={ink} strokeWidth="6"/>
      <circle cx="100" cy="100" r="84" stroke={ink} strokeWidth="1.5"/>
      <circle cx="100" cy="100" r="63" stroke={red} strokeWidth="2.5"/>
      <circle cx="100" cy="6" r="5" fill={red}/>
      <circle cx="100" cy="194" r="5" fill={red}/>
      <circle cx="6" cy="100" r="5" fill={red}/>
      <circle cx="194" cy="100" r="5" fill={red}/>
      <text fontFamily="Georgia,serif" fontSize="26" fontWeight="700" fill={ink} letterSpacing="18">
        <textPath href={`#arc-top-${size}`} startOffset="50%" textAnchor="middle">FRANK</textPath>
      </text>
      <text x="100" y="116" fontFamily="Georgia,serif" fontSize="56" fontWeight="700"
            fill={red} textAnchor="middle" dominantBaseline="central">F</text>
    </svg>
  )

  // Nav (32px) — 3 rings + F
  if (size >= 30) return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <circle cx="100" cy="100" r="94" stroke={ink} strokeWidth="7"/>
      <circle cx="100" cy="100" r="78" stroke={ink} strokeWidth="2.5"/>
      <circle cx="100" cy="100" r="56" stroke={red} strokeWidth="3.5"/>
      <text x="100" y="104" fontFamily="Georgia,serif" fontSize="66" fontWeight="700"
            fill={red} textAnchor="middle" dominantBaseline="central">F</text>
    </svg>
  )

  // Small (20px) — 2 rings + solid dot
  if (size >= 18) return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <circle cx="100" cy="100" r="94" stroke={ink} strokeWidth="9"/>
      <circle cx="100" cy="100" r="72" stroke={ink} strokeWidth="3"/>
      <circle cx="100" cy="100" r="30" fill={red}/>
    </svg>
  )

  // Favicon (16px)
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <circle cx="100" cy="100" r="94" stroke={ink} strokeWidth="11"/>
      <circle cx="100" cy="100" r="68" stroke={ink} strokeWidth="4"/>
      <circle cx="100" cy="100" r="28" fill={red}/>
    </svg>
  )
}
```

---

## SEARCH AND REPLACE — EXACT STRINGS

Find these strings across the entire codebase and replace:

| Find | Replace |
|------|---------|
| `>Frank<` (in JSX/HTML) | `>FRANK<` |
| `Frank.` (in UI copy, not body text) | `FRANK` |
| `fontFamily: 'Playfair Display'` in logo context | `fontFamily: 'Georgia, serif'` |
| `font-family: 'Playfair Display'` in logo CSS | `font-family: Georgia, serif` |
| `Frank. —` in `<title>` tags | `Frank —` |
| `AI Deal Partner` in `<title>` tags | `Deal Intelligence` |

**Do NOT replace** "Frank" in:
- Body copy and descriptive text ("Frank analyzes...", "Ask Frank...")
- Frank's response attribution text where it reads naturally as a name
- The seal arc text "FRANK" (already correct)

---

## DO NOT TOUCH

- Seal SVG geometry (ring sizes, cardinal dot positions, arc paths)
- Color tokens — all unchanged
- The descriptor content: "Deal Intelligence · Manhattan"
- IBM Plex Mono / Courier New for data values and labels
- The stamp mechanic and "Stamped by Frank" feature name

---

*FRANK. · frank-assets-v2.svg · Logo Update Brief v2.0*
