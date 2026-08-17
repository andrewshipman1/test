# FRANK. — Claude Code Reskin Brief
## AI Deal Partner · frank.ai · New York
### Version 1.0 · Confidential

---

## READ THIS FIRST

You are reskinning an application to match the Frank brand.
Before writing a single line of code, read this entire brief.

**Your three reference files:**
- `frank-design-system.css` — all tokens, utilities, components
- `frank-assets.svg` — all stamp and wordmark variants
- `frank-brand-guidelines.html` — full visual brand reference (open in browser)

**Font stack — add to `<head>` before the CSS:**
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,700&family=Barlow:wght@300;400;500&family=IBM+Plex+Mono:wght@300;400&display=swap" rel="stylesheet">
```

---

## WHAT FRANK IS

Frank is an AI deal partner for Manhattan real estate developers.
It searches and analyzes deals, pushes back, asks hard questions.
It is not a dashboard. It is not a database. It is a relationship.

**The brand in one line:**
> *"The deal partner who's already run the numbers before you ask."*

**The soul reference:** Roman and Williams. The Ace Hotel lobby.
Everything earned, not new. Warm darks not cold ones. A brand
that feels like it was founded in 1987 and just got an AI.

---

## THE TWO SURFACES — most important design decision

### 1. Marketing surface
- Background: `--frank-paper-lt` (#FAF3E8)
- Add `.f-grain` class for texture
- Playfair Display for all headlines and pull-quotes
- Warm, layered, editorial — like a private members club brochure

### 2. Product UI surface  
- Background: `--frank-tobacco` (#1A1410)
- No grain. Ever. The product is a working document not a brochure.
- Barlow 300 for all UI copy
- IBM Plex Mono for all numeric data
- The grain marks the threshold between brochure and tool

---

## COLOR SYSTEM

```
Tobacco     #1A1410   Primary dark — all product surfaces
Espresso    #2C2218   Card/panel surfaces on dark
Leather     #4A3828   Body text on light surfaces
Walnut      #6B5240   Secondary muted on dark
Dust        #9C8878   Labels, metadata, tertiary text
Press       #C8B8A8   Dividers on light surfaces
Linen       #EDE0CC   Text on dark / light surface
Paper       #F5EAD8   Secondary light surface
Paper Lt    #FAF3E8   Marketing background
Oxblood     #8B2E22   THE STAMP · Period · Pushback only
Oxblood Lt  #A83828   Oxblood on dark backgrounds
Amber       #C4832A   High-value data signals only
Amber Lt    #D9962E   Amber on dark backgrounds
Verdigris   #4A7C6F   Confirmed/saved state only
```

**Oxblood rule:** Oxblood (#8B2E22) appears ONLY on:
1. The wordmark period: `Frank.`
2. The stamp mark
3. Frank's pushback moments in chat (left border on `.f-surface-pushback`)
4. The Send button in chat input
5. Critical flags in deal analysis
Never used decoratively. Never as a background color for whole sections.

**Amber rule:** Amber appears ONLY on high-value data — the highest
acquisition scores, deal values worth flagging. Not decorative.

**Verdigris rule:** ONLY for confirmed/saved states. This is aged
brass, not success green. It reads as permanence, not celebration.

---

## TYPOGRAPHY — three typefaces, three registers

| Typeface | Weight | Use |
|---|---|---|
| Playfair Display | 700 | Wordmark, marketing headlines |
| Playfair Display | 400 italic | Frank's voice, pull-quotes, key statements |
| Barlow | 300 | All product UI copy, body text, navigation |
| Barlow | 400–500 | Address lines, emphasis, button text |
| IBM Plex Mono | 300 | ALL numeric values. Prices, scores, FAR, dates |
| IBM Plex Mono | 400 | Labels, metadata, stamps, reference numbers |

**Rules:**
- Playfair Display never appears in the product UI. Marketing only.
- All numeric values are IBM Plex Mono — no exceptions.
- Labels are always: font-data, 10px, letter-spacing 0.20em, uppercase.
- Never use Inter, system-ui, or any other sans in place of Barlow.

---

## THE STAMP — core product mechanic

The stamp is the brand's most important element. Read carefully.

**The stamp represents:** Frank certifying a completed analysis.
When Frank stamps a deal, it is saying: *I reviewed this. I have
a view. My judgment is on the line.*

**The stamp appears ONLY on completed deal analyses.** Not on:
- Individual chat messages
- Navigation
- Marketing pages
- Empty states
- Error messages
- Any decorative context

**How to implement the stamp row:**
```html
<div class="f-stamp-row">
  <div class="f-stamp-identity">
    <!-- Copy stamp SVG from frank-assets.svg — variant 06 (40px) -->
    <svg>...</svg>
    <div class="f-stamp-text-group">
      <div class="f-stamp-byline">Stamped by Frank.</div>
      <div class="f-stamp-timestamp">17 MAR 2025 · 09:42 EST</div>
    </div>
  </div>
  <div class="f-stamp-ref">frank.ai · 215-w-98th · v1</div>
</div>
```

**Stamp watermark on memo background:**
Use variant 08 from frank-assets.svg. Set opacity to 0.07.
Position absolute, top-right of the memo container.

---

## THE WORDMARK

```
Frank.
```

The period is load-bearing. It is always oxblood (`#8B2E22` / `#A83828` on dark).
The name `Frank` is always tobacco (light bg) or linen (dark bg).

**Implementation:**
```html
<!-- Light background -->
<span style="font-family:'Playfair Display',serif; font-weight:700; 
  color:#1A1410; letter-spacing:-0.01em;">Frank<span style="color:#8B2E22">.</span></span>

<!-- Dark background -->
<span style="font-family:'Playfair Display',serif; font-weight:700; 
  color:#EDE0CC; letter-spacing:-0.01em;">Frank<span style="color:#A83828">.</span></span>
```

**Scale rule:** Below 14px rendered size, drop the period color distinction.
Render the full wordmark in a single color at small sizes.

---

## CHAT INTERFACE — component patterns

### Standard Frank response
```html
<div class="f-message-frank">
  <div class="f-message-frank-header">
    <div class="f-message-frank-name">Frank<span class="f-period">.</span></div>
    <div class="f-message-frank-rule"></div>
  </div>
  <div class="f-message-frank-body">
    <p class="f-message-frank-text">
      Twenty-two years at the same basis. Current FAR is 2.1 against 
      an R8A allowance of 8.0 — that's 5.9 floors of unused capacity.
    </p>
    <!-- Optional: inline data grid -->
    <div class="f-inline-data-grid" style="grid-template-columns:1fr 1fr 1fr;">
      <div class="f-inline-data-cell">
        <div class="f-inline-data-label">Ask</div>
        <div class="f-inline-data-value">$47M</div>
      </div>
      <div class="f-inline-data-cell">
        <div class="f-inline-data-label">FAR unused</div>
        <div class="f-inline-data-value signal">5.9</div>
      </div>
      <div class="f-inline-data-cell">
        <div class="f-inline-data-label">Held</div>
        <div class="f-inline-data-value">22 yrs</div>
      </div>
    </div>
    <p class="f-message-frank-text" style="margin-top:12px;">
      What's your exit — condo or rental?
    </p>
  </div>
</div>
```

### Frank pushback (oxblood treatment)
```html
<div class="f-message-frank">
  <div class="f-message-frank-header">
    <div class="f-message-frank-name">Frank<span class="f-period">.</span></div>
    <div class="f-message-frank-rule"></div>
  </div>
  <div class="f-message-frank-pushback">
    <p class="f-message-frank-text">
      I'd stop you there. The last three condo sellouts above 96th 
      came in at $1,840, $1,910, and $1,780. The $2,200 assumption 
      needs a reason — right now it's just optimism.
    </p>
  </div>
</div>
```

### User message
```html
<div class="f-message-user">
  <div class="f-message-user-bubble">
    What do you think about 215 W 98th? Asking $47M.
  </div>
</div>
```

### Chat input
```html
<div class="f-chat-input-row">
  <input class="f-chat-input" placeholder="Ask Frank anything about this deal..." type="text">
  <button class="f-chat-send">Send</button>
</div>
```

---

## DEAL MEMO — stamped analysis output

```html
<div class="f-memo">
  <!-- Watermark stamp — ghost behind content -->
  <div class="f-stamp-watermark">
    <!-- stamp SVG variant 08, opacity 0.07 -->
  </div>
  
  <div class="f-memo-header">
    <div>
      <div class="f-memo-title">
        215 W 98th Street<span class="f-period">.</span>
      </div>
      <div class="f-memo-subtitle">
        Upper West Side · R8A · ACRIS verified 14 MAR 2025
      </div>
    </div>
  </div>

  <div class="f-memo-data-row" style="grid-template-columns:repeat(4,1fr);">
    <div class="f-memo-cell">
      <div class="f-memo-cell-label">Ask</div>
      <div class="f-memo-cell-value">$47.2M</div>
    </div>
    <div class="f-memo-cell">
      <div class="f-memo-cell-label">FAR unused</div>
      <div class="f-memo-cell-value">5.9</div>
    </div>
    <div class="f-memo-cell">
      <div class="f-memo-cell-label">$/buildable SF</div>
      <div class="f-memo-cell-value">$485</div>
    </div>
    <div class="f-memo-cell">
      <div class="f-memo-cell-label">Held</div>
      <div class="f-memo-cell-value">22 yrs</div>
    </div>
  </div>

  <div class="f-memo-body">
    <p class="f-memo-pull-quote">
      "The zoning gap is real — 5.9 floors of unused FAR on a midblock 
      UWS lot held since 2003 is a genuine opportunity."
    </p>
    <p class="f-memo-flag">
      The $2,200/SF condo assumption needs justification. Last three 
      comparable sellouts north of 96th averaged $1,843. Model the 
      downside before going to LOI.
    </p>
  </div>

  <!-- THE STAMP — only here, only on completed analyses -->
  <div class="f-stamp-row">
    <div class="f-stamp-identity">
      <!-- stamp SVG 40px variant -->
      <div class="f-stamp-text-group">
        <div class="f-stamp-byline">Stamped by Frank.</div>
        <div class="f-stamp-timestamp">17 MAR 2025 · 09:42 EST</div>
      </div>
    </div>
    <div class="f-stamp-ref">frank.ai · 215-w-98th · v1</div>
  </div>
</div>
```

---

## NAVIGATION

```html
<nav class="f-nav">
  <div class="f-nav-brand">
    <!-- Wordmark only — no stamp in nav -->
    <span style="font-family:'Playfair Display',serif; font-weight:700; 
      font-size:18px; color:#EDE0CC; letter-spacing:-0.01em;">
      Frank<span style="color:#A83828;">.</span>
    </span>
  </div>
  <div class="f-nav-section">
    <span class="f-nav-label">Manhattan · Deal Sourcing</span>
  </div>
  <div class="f-nav-meta">
    <span class="f-nav-label">3 active deals</span>
    <div class="f-status-dot active"></div>
  </div>
</nav>
```

---

## SIDEBAR — conversation history

```html
<aside class="f-sidebar">
  <!-- Active thread -->
  <div class="f-thread-item active">
    <div class="f-thread-address">215 W 98th St</div>
    <div class="f-thread-meta">UWS · R8A · $47M ask</div>
    <div class="f-thread-stamped">● Stamped</div>
  </div>
  <!-- Standard thread -->
  <div class="f-thread-item">
    <div class="f-thread-address">432 E 14th St</div>
    <div class="f-thread-meta">East Village · C6-1</div>
  </div>
</aside>
```

---

## VOICE — what Frank writes

Frank's responses should sound like The Real Deal editorial voice,
elevated to premium. Smart and direct. Not clever. Not warm.
Not cautious. Never padded.

**Frank says:**
- "Walk me through your exit."
- "What's your basis?"
- "That's not what the data shows."
- "I'd stop you there."
- "Six years, no deal. Why?"
- "The zoning gap is real. The comp set is the problem."

**Frank never says:**
- "Great question!"
- "It's worth considering..."
- "I'd be happy to help"
- "Several factors suggest"
- "Exciting opportunity"
- "Based on the available data..."

**UI copy rules:**
- Labels: UPPERCASE · IBM Plex Mono · 10px · tracking 0.20em
- Navigation: Barlow 300 · sentence case or UPPERCASE abbreviations
- Addresses: Barlow 500 · tracking 0.06em · can be uppercase
- Frank's chat text: Barlow 300 · 14px · line-height 1.75 · lowercase
- Data values: IBM Plex Mono 300 · always

---

## ABSOLUTE RULES — never violate

| Wrong | Right |
|---|---|
| `border-radius` on anything | 0 radius everywhere (except `.f-status-dot`) |
| `box-shadow` anywhere | Borders and surface contrast only |
| Blue, purple, green, teal | Tobacco, oxblood, amber, verdigris only |
| `font-family: Inter, system-ui` | Barlow or IBM Plex Mono only |
| Animation on data values | Static values — data is a document not a show |
| Emoji in UI | Never |
| `.f-grain` on product UI | Grain is marketing only |
| Playfair in product UI | Marketing and pull-quotes only |
| Oxblood decoratively | Stamp + pushback + period only |
| Amber decoratively | High-value data signals only |
| Rounded pill badges | Square badges — 0 border-radius |
| "Stamped by Frank" in nav/marketing | Stamp is product-only, analysis-only |

---

## SIGNOFF CHECKLIST

Before marking any component done:

- [ ] Font is Barlow or IBM Plex Mono (Playfair = marketing only)
- [ ] Background is Tobacco (#1A1410) for product, Paper Lt (#FAF3E8) for marketing
- [ ] No border-radius anywhere except `.f-status-dot`
- [ ] No box-shadow anywhere
- [ ] Oxblood only on: stamp, period, pushback border, Send button
- [ ] All numeric values are IBM Plex Mono 300
- [ ] Labels are uppercase, 10px, tracking 0.20em, IBM Plex Mono
- [ ] Grain absent from product UI
- [ ] Playfair absent from product UI
- [ ] Stamp appears only on completed analyses — nowhere else
- [ ] Frank's voice is terse, direct, interrogative — no filler
- [ ] Wordmark period is always oxblood (`#8B2E22` light / `#A83828` dark)

---

## FILE USAGE

```
frank-design-system.css     → Import at app root. All tokens + components.
frank-assets.svg            → Copy SVG code for stamp variants into components.
frank-brand-guidelines.html → Open in browser as visual reference while building.
frank-claude-code-brief.md  → This file. Read before every session.
```

**How to start each Claude Code session:**
```
Read frank-claude-code-brief.md before doing anything.
Reference frank-brand-guidelines.html for visual decisions.
Import frank-design-system.css at app root.
Copy stamp SVG from frank-assets.svg — never redraw it.
Task: [describe your specific component or view here]
```

---

*Frank. · frank.ai · New York · Version 1.0*
