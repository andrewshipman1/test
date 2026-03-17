import { useState } from 'react'
import './LandingPage.css'

const ACCESS_CODE = 'EBITDA'

export default function LandingPage({ onAuthenticated }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState(false)
  const [shaking, setShaking] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (code.trim() === ACCESS_CODE) {
      sessionStorage.setItem('parcel_auth', '1')
      onAuthenticated()
    } else {
      setError(true)
      setShaking(true)
      setTimeout(() => setShaking(false), 500)
    }
  }

  return (
    <div className="landing-page f-grain">

      {/* Nav */}
      <nav className="landing-nav">
        <div className="landing-nav-brand">
          <span className="frank-wordmark">Frank<span className="frank-period">.</span></span>
        </div>
        <div className="landing-nav-meta">
          <span>AI DEAL PARTNER</span>
        </div>
      </nav>

      {/* Hero */}
      <main className="landing-hero">
        {/* Stamp watermark — ghost background element */}
        <div className="landing-stamp-watermark">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 110 80" width="220" height="160">
            <circle cx="55" cy="40" r="52" stroke="#8B2E22" strokeWidth="5" fill="none"/>
            <circle cx="55" cy="40" r="44" stroke="#8B2E22" strokeWidth="1.5" fill="none"/>
            <circle cx="55" cy="40" r="30" stroke="#8B2E22" strokeWidth="1.5" fill="none"/>
            <defs>
              <path id="arc-wg-lp" d="M 5,40 A 50,50 0 0,1 105,40"/>
              <path id="arc-wgb-lp" d="M 14,54 A 44,44 0 0,0 96,54"/>
            </defs>
            <text fontFamily="'Playfair Display',Georgia,serif" fontSize="22" fontWeight="700" fill="#8B2E22" letterSpacing="14">
              <textPath href="#arc-wg-lp" startOffset="50%" textAnchor="middle">FRANK</textPath>
            </text>
            <text fontFamily="'IBM Plex Mono',monospace" fontSize="7" fill="#8B2E22" letterSpacing="2">
              <textPath href="#arc-wgb-lp" startOffset="50%" textAnchor="middle">LICENSED · DEAL INTEL</textPath>
            </text>
            <line x1="32" y1="40" x2="78" y2="40" stroke="#8B2E22" strokeWidth="1"/>
            <text x="55" y="37" fontFamily="'IBM Plex Mono',monospace" fontSize="8" fill="#8B2E22" textAnchor="middle" letterSpacing="1.5">FRANK.AI</text>
            <text x="55" y="47" fontFamily="'IBM Plex Mono',monospace" fontSize="6" fill="#8B2E22" textAnchor="middle">NEW YORK</text>
          </svg>
        </div>
        <div className="landing-hero-inner">

          <div className="landing-bronze-rule" />

          <h1 className="landing-display">
            YOUR NEXT DEAL<br />
            ALREADY HAS<br />
            AN OPINION.
          </h1>

          <p className="landing-editorial">
            The deal partner who's already run the numbers before you ask.
          </p>

          <div className="landing-body">
            <p>
              Frank is an AI deal partner for Manhattan real estate.
              It searches and analyzes every tax lot in the borough —
              zoning, FAR, rent stabilization, violations, comps,
              ownership — and pushes back when the numbers don't work.
              Invite-only.
            </p>
          </div>

          <div className="landing-divider" />

          <p className="landing-access-label">
            Frank is invite-only. Enter your access code.
          </p>

          <form className="landing-gate" onSubmit={handleSubmit}>
            <div className={`landing-input-group ${shaking ? 'shake' : ''}`}>
              <label className="landing-field-label">ACCESS CODE</label>
              <input
                type="password"
                className={`landing-input ${error ? 'landing-input-error' : ''}`}
                value={code}
                onChange={(e) => { setCode(e.target.value); setError(false) }}
                placeholder="ENTER CODE"
                autoFocus
                autoComplete="off"
              />
              {error && (
                <span className="landing-error">Code not recognized.</span>
              )}
            </div>
            <button type="submit" className="landing-submit">
              <span className="landing-submit-label">Access</span>
              <span className="landing-submit-action">Enter</span>
            </button>
          </form>

        </div>
      </main>

      {/* Footer — title block */}
      <footer className="landing-footer">
        <div className="landing-footer-cell">
          <div className="landing-footer-label">PRODUCT</div>
          <div className="landing-footer-value">AI Deal Partner</div>
        </div>
        <div className="landing-footer-cell">
          <div className="landing-footer-label">COVERAGE</div>
          <div className="landing-footer-value">Manhattan · 42,000+ Lots</div>
        </div>
        <div className="landing-footer-cell">
          <div className="landing-footer-label">SOURCES</div>
          <div className="landing-footer-value">PLUTO · ACRIS · HPD · DOB · LPC</div>
        </div>
        <div className="landing-footer-cell landing-footer-mark">
          <span className="frank-wordmark frank-wordmark-footer">Frank<span className="frank-period">.</span></span>
        </div>
      </footer>

    </div>
  )
}
