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
        {/* Stamp watermark — variant 01 from frank-assets.svg */}
        <div className="landing-stamp-watermark">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 230 230" width="340" height="340">
            <circle cx="115" cy="115" r="106" stroke="#8B2E22" strokeWidth="4" fill="none"/>
            <circle cx="115" cy="115" r="99"  stroke="#8B2E22" strokeWidth="1" fill="none"/>
            <circle cx="115" cy="115" r="74"  stroke="#8B2E22" strokeWidth="1" fill="none"/>
            <circle cx="115" cy="115" r="68"  stroke="#8B2E22" strokeWidth="0.5" fill="none"/>
            <defs>
              <path id="arc-top-lp" d="M 18,115 A 97,97 0 0,1 212,115"/>
              <path id="arc-bot-lp" d="M 36,138 A 87,87 0 0,0 194,138"/>
            </defs>
            <text fontFamily="'Playfair Display',Georgia,serif" fontSize="30" fontWeight="700" fill="#8B2E22" letterSpacing="18">
              <textPath href="#arc-top-lp" startOffset="50%" textAnchor="middle">FRANK</textPath>
            </text>
            <text fontFamily="'IBM Plex Mono',monospace" fontSize="9.5" fill="#8B2E22" letterSpacing="3">
              <textPath href="#arc-bot-lp" startOffset="50%" textAnchor="middle">LICENSED · DEAL INTELLIGENCE</textPath>
            </text>
            <line x1="72" y1="115" x2="158" y2="115" stroke="#8B2E22" strokeWidth="0.75"/>
            <text x="115" y="111" fontFamily="'IBM Plex Mono',monospace" fontSize="11" fill="#8B2E22" textAnchor="middle" letterSpacing="2">FRANK.AI</text>
            <text x="115" y="126" fontFamily="'IBM Plex Mono',monospace" fontSize="9" fill="#8B2E22" textAnchor="middle" letterSpacing="1.5">EST. 2025 · NEW YORK</text>
            <circle cx="9"   cy="115" r="3.5" fill="#8B2E22"/>
            <circle cx="221" cy="115" r="3.5" fill="#8B2E22"/>
            <circle cx="115" cy="9"   r="3.5" fill="#8B2E22"/>
            <circle cx="115" cy="221" r="3.5" fill="#8B2E22"/>
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
            <p>Manhattan. Every parcel. Frank's read.</p>
          </div>

          <div className="landing-divider" />

          <form className="landing-gate" onSubmit={handleSubmit}>
            <div className={`landing-input-group ${shaking ? 'shake' : ''}`}>
              <label className="landing-field-label">ACCESS CODE</label>
              <input
                type="password"
                className={`landing-input ${error ? 'landing-input-error' : ''}`}
                value={code}
                onChange={(e) => { setCode(e.target.value); setError(false) }}
                placeholder="Enter code"
                autoFocus
                autoComplete="off"
              />
              {error && (
                <span className="landing-error">Code not recognized.</span>
              )}
            </div>
            <button type="submit" className="landing-submit">
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
