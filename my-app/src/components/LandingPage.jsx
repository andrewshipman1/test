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
