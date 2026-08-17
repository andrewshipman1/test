# PARCEL — Claude Code Reskin Brief
## Acquisition Intelligence · Manhattan
### Version 1.0 · Confidential

---

## YOUR TASK

You are reskinning an existing web application to match the Parcel brand design system.
Your primary reference files are:

- `parcel-design-system.css` — all tokens, utility classes, and component primitives
- `parcel-assets.svg` — all SVG brand assets (mark, wordmark, favicon, swatches)
- `parcel-brand-guidelines.html` — full visual brand reference

**Import the CSS first before touching any component.**

---

## WHO THIS IS FOR

Parcel is a B2B SaaS tool used by Manhattan real estate developers to identify buildings worth acquiring. The buyer is a principal or senior acquisitions person at a development firm — wealthy, status-conscious, and deeply familiar with real estate terminology.

**Competitor context:**
- CoStar, Reonomy: databases — they answer what you ask
- Parcel: tells you what to ask for. The score is the product.

---

## THE BRAND IN ONE SENTENCE

> *The parcel before the listing. Every week. For Manhattan.*

---

## DESIGN PHILOSOPHY

**Two surfaces. Two rules.**

1. **Marketing surface** (`parcel-ivory-lt` background): grain texture (`.p-grain`), serif pull-quotes allowed, all-caps condensed display type. This is the brochure.

2. **Product UI surface** (`parcel-concrete` background): no grain, no serif, pure data. This is the working document.

**The grain marks the threshold between brochure and tool.** Never apply `.p-grain` inside the authenticated product.

**Architectural drawing energy.** The product reads like a drawing set: ordered, hierarchical, every element in its place. The core structural motif is the **title block** — a bordered grid with labeled cells, like the attribution block at the bottom right of any architectural drawing. Use `p-title-block` on the app footer, the parcel detail panel header, and any summary/attribution row.

**No rounded corners.** Ever. The border-radius is 0 throughout the product. The brand is precision instruments, not SaaS cards.

**No shadows.** Depth is expressed through borders and surface contrast, not drop-shadows.

---

## COLOR SYSTEM

```
Concrete    #252220   Primary dark — all product surfaces
Formwork    #3A3632   Card/panel surfaces on dark
Smoke       #5C5650   Body text, descriptions
Ash         #8A8278   Labels, metadata, tertiary text
Draft       #D4CCC1   Inactive values, dividers
Ivory       #EDE5D8   Light surface, text on dark
Ivory Lt    #F4EEE5   Marketing background (lightest)
Bronze      #A8824E   SIGNAL ACCENT — scores ≥85, flags
Bronze Lt   #C4A06A   Bronze on dark backgrounds  
Patina      #8E9E8A   Confirmed/saved state only
```

**Bronze rule:** Bronze appears only on:
1. Acquisition scores ≥ 85
2. Ownership-change signal flags
3. The active parcel crosshair in map view
4. The bronze rule line divider in marketing

Everywhere else is Concrete, Ivory, and Draft. If you're reaching for Bronze anywhere else, stop.

**Patina rule:** Patina is used only for confirmed/saved states. Not success-green — something older and more permanent than a checkmark.

---

## TYPOGRAPHY

Load these fonts in `<head>`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@200;300;400&family=IBM+Plex+Mono:wght@300;400&family=Playfair+Display:ital,wght@0,400;1,400&display=swap" rel="stylesheet">
```

**Three typefaces. Three registers. Never mixed arbitrarily.**

| Typeface | Weight | Use |
|---|---|---|
| Barlow Condensed | 200 Light | Display headlines — marketing only. All-caps, wide tracking (0.14em). |
| Barlow Condensed | 300 Light | All product UI copy, body text, navigation, labels. |
| Barlow Condensed | 400 Regular | Address lines, emphasis, uppercase button text. |
| IBM Plex Mono | 300 Light | ALL numeric data values. Scores, FAR, dates, zoning codes. Product only. |
| Playfair Display | 400 Italic | Marketing pull-quotes, weekly digest, invitation letters ONLY. Never in product UI. |

**Scale:**
- Metadata labels: 10px, tracking 0.20em, UPPERCASE — always monospace or Barlow Condensed
- Body: 15px, tracking 0, Barlow Condensed 300
- Addresses: 14px, tracking 0.08em, UPPERCASE, Barlow Condensed 400
- Display: 48–64px, tracking 0.14em, UPPERCASE, Barlow Condensed 200

---

## BRAND MARK — IMPLEMENTATION

The SVG mark is in `parcel-assets.svg`. There are named variants — copy the appropriate one:

**Product nav (dark background):** Use variant 10 — `parcel-nav-dark` — 18×18px inline SVG before the wordmark.

**Favicon:** Use variant 07 or 08 — two concentric squares + solid bronze dot. 16×16px.

**Report/export watermark:** Use variant 09 — the full title block stamp.

**Implementation pattern for nav:**
```html
<nav class="p-nav">
  <div class="p-nav-brand">
    <!-- Copy mark SVG from parcel-assets.svg variant 10 -->
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <rect x="0.5" y="0.5" width="23" height="23" stroke="#EDE5D8" stroke-width="1.25" fill="none"/>
      <rect x="3" y="3" width="18" height="18" stroke="#EDE5D8" stroke-width="0.4" fill="none"/>
      <line x1="3" y1="16" x2="21" y2="16" stroke="#EDE5D8" stroke-width="0.4"/>
      <circle cx="12" cy="10" r="1.75" fill="none" stroke="#C4A06A" stroke-width="1"/>
      <circle cx="12" cy="10" r="0.7" fill="#C4A06A"/>
    </svg>
    <span style="font-family: 'Barlow Condensed', sans-serif; font-size: 13px; font-weight: 300; letter-spacing: 0.22em; color: #EDE5D8; text-transform: uppercase;">PARCEL</span>
  </div>
  <div class="p-nav-section">
    <!-- current section label -->
  </div>
  <div class="p-nav-meta">
    <!-- status indicators -->
  </div>
</nav>
```

---

## CORE UI COMPONENTS

### Parcel list row (primary data view)
```html
<!-- Standard row -->
<div class="p-row" style="grid-template-columns: 2fr 1fr 1fr 80px;">
  <div>
    <div class="p-address">432 E 14th St</div>
    <div class="p-meta">C6-1 · East Village · Ownership change</div>
  </div>
  <div class="p-data-sm" style="color: var(--parcel-draft); display: flex; align-items: center;">3.40</div>
  <div class="p-data-sm" style="color: var(--parcel-draft); display: flex; align-items: center;">1998</div>
  <div class="p-score">
    <div class="p-score-value">87</div>
    <div class="p-score-label">Score</div>
  </div>
</div>

<!-- Signal row — score ≥ 85 -->
<div class="p-row p-row-signal" style="grid-template-columns: 2fr 1fr 1fr 80px;">
  <div>
    <div class="p-address">215 W 98th St</div>
    <div class="p-meta">R8A · UWS · FAR 6.02 unused · Est. 2019</div>
  </div>
  <div class="p-data-sm" style="color: var(--parcel-draft); display: flex; align-items: center;">6.02</div>
  <div class="p-data-sm" style="color: var(--parcel-draft); display: flex; align-items: center;">2003</div>
  <div class="p-score">
    <div class="p-score-value p-data-signal">94</div>
    <div class="p-score-label">Score</div>
  </div>
</div>
```

### Signal badge
```html
<span class="p-signal-badge">Ownership change</span>
<span class="p-signal-badge">HPD complaint cluster</span>
<span class="p-signal-badge">Estate in probate</span>
```

### Stat cells (dashboard header)
```html
<div class="p-stats-row" style="grid-template-columns: repeat(4, 1fr);">
  <div class="p-stat-cell">
    <div class="p-stat-label">Active parcels</div>
    <div class="p-stat-value p-stat-value-signal">147</div>
  </div>
  <div class="p-stat-cell">
    <div class="p-stat-label">Score ≥ 85</div>
    <div class="p-stat-value">12</div>
  </div>
  <div class="p-stat-cell">
    <div class="p-stat-label">New this week</div>
    <div class="p-stat-value">8</div>
  </div>
  <div class="p-stat-cell">
    <div class="p-stat-label">Updated</div>
    <div class="p-stat-value" style="font-size: 13px; line-height: 1.5;">MON 17 MAR<br>06:00 EST</div>
  </div>
</div>
```

### Marketing CTA (the "Apply" compound button)
```html
<div class="p-cta-block">
  <div class="p-cta-block-label">Access request</div>
  <button class="p-cta-block-action">Apply</button>
</div>
```

### Title block footer (end of product view / reports)
```html
<div class="p-title-block-footer" style="grid-template-columns: 1fr 1fr 1fr 60px;">
  <div class="p-title-block-footer-cell">
    <div class="p-label">Project</div>
    <div style="font-family: var(--parcel-font-data); font-size: 11px; color: var(--parcel-ivory);">Manhattan Acq. Watch</div>
  </div>
  <div class="p-title-block-footer-cell">
    <div class="p-label">Source</div>
    <div style="font-family: var(--parcel-font-data); font-size: 11px; color: var(--parcel-ivory);">ACRIS · DOB · HPD</div>
  </div>
  <div class="p-title-block-footer-cell">
    <div class="p-label">Drawn by</div>
    <div style="font-family: var(--parcel-font-data); font-size: 11px; color: var(--parcel-ivory);">Parcel · NYC</div>
  </div>
  <div class="p-title-block-footer-cell" style="display: flex; align-items: center; justify-content: flex-end; border-right: none;">
    <!-- Insert mark SVG here at 20px -->
  </div>
</div>
```

---

## VOICE — WHAT TO WRITE

The UI copy must sound like a senior partner at a legendary architecture firm describing a site. No enthusiasm. No selling. Confidence through facts.

**Correct:**
- "147 parcels qualify. 12 worth acting on."
- "Score: 94 · R8A · FAR 6.02 unused"
- "New signal: ownership change estimated 2019."
- "Parcel is invite-only. Apply."

**Wrong:**
- "Discover amazing opportunities!"
- "Unlock powerful insights"
- "Get started today"
- "Your dashboard"

**UI text patterns:**
- Table headers: ALL CAPS · monospace or Barlow Condensed · 10px
- Navigation: ALL CAPS · Barlow Condensed · tracking 0.18em
- Addresses: ALL CAPS · Barlow Condensed 400 · tracking 0.08em
- Scores: numerals only · IBM Plex Mono · no unit suffix needed
- Zoning strings: ALL CAPS · IBM Plex Mono · "R8A · UWS · FAR 6.02"
- Dates: ALL CAPS · IBM Plex Mono · "17 MAR 2025" or "2003"

---

## LAYOUT RULES

1. **No rounded corners.** `border-radius: 0` everywhere. This is non-negotiable.
2. **No box shadows.** Depth through borders and surface contrast only.
3. **Borders are 1px.** The title block outer border can be 1.25px max.
4. **Grain only on marketing.** Never on the authenticated product UI.
5. **Bronze only on signal.** Never as a decorative color.
6. **All type is condensed.** Barlow Condensed is the workhorse. Full-width sans-serif is wrong.
7. **Modals/overlays:** Same border rules. No rounded corners. Use concrete background, ivory border.
8. **Empty states:** Keep them terse. "No parcels match your criteria." Not "We couldn't find anything — try adjusting your filters!"

---

## COMMON MISTAKES TO AVOID

| Wrong | Right |
|---|---|
| `border-radius: 8px` on any element | `border-radius: 0` |
| Drop shadows on cards | `border: 1px solid rgba(255,255,255,0.06)` |
| Blue for links/actions | `color: var(--parcel-ivory)` with underline or hover state |
| Green for success/confirmed | `color: var(--parcel-patina)` |
| Purple/gradient anything | Not in this brand |
| `font-family: Inter, system-ui` | `font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif` |
| Rounded pill badges | Square badges — `border-radius: 0` |
| Full-width sans-serif body | Barlow Condensed only |
| Emoji in UI | Never |
| Animation on data — fades, count-ups | Static values only — data is a document, not a show |

---

## FILE USAGE GUIDE

```
parcel-design-system.css    → Import at app root. All tokens + classes.
parcel-assets.svg           → Copy SVG code for mark variants into components.
parcel-brand-guidelines.html → Open in browser as visual reference while building.
parcel-claude-code-brief.md → This file. Your primary instruction set.
```

---

## SIGNOFF CHECK

Before marking any component done, confirm:

- [ ] Font is Barlow Condensed (or IBM Plex Mono for data values)
- [ ] Background is Concrete (#252220) or Ivory Lt (#F4EEE5) — nothing else
- [ ] No rounded corners
- [ ] No shadows
- [ ] Bronze appears only on scores ≥85 or signal flags
- [ ] Numbers are IBM Plex Mono
- [ ] Labels are ALL CAPS, 10px, tracking 0.20em
- [ ] Grain is absent from product UI
- [ ] Title block motif present in footer/attribution area
- [ ] Voice is terse and factual — no marketing language in UI copy

---

*PARCEL · NYC · Version 1.0*
