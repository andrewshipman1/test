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
    <div className="landing-page p-grain">

      {/* Nav */}
      <nav className="landing-nav">
        <div className="landing-nav-brand">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <rect x="0.5" y="0.5" width="23" height="23" stroke="#252220" strokeWidth="1.25" fill="none"/>
            <rect x="3" y="3" width="18" height="18" stroke="#252220" strokeWidth="0.4" fill="none"/>
            <line x1="3" y1="16" x2="21" y2="16" stroke="#252220" strokeWidth="0.4"/>
            <circle cx="12" cy="10" r="1.75" fill="none" stroke="#A8824E" strokeWidth="1"/>
            <circle cx="12" cy="10" r="0.7" fill="#A8824E"/>
          </svg>
          <span className="landing-wordmark">PARCEL</span>
        </div>
        <div className="landing-nav-meta">
          <span>MANHATTAN</span>
        </div>
      </nav>

      {/* Hero */}
      <main className="landing-hero">
        <div className="landing-hero-inner">

          <div className="landing-bronze-rule" />

          <h1 className="landing-display">
            THE PARCEL<br />
            BEFORE THE<br />
            LISTING
          </h1>

          <p className="landing-editorial">
            Every week. For Manhattan.
          </p>

          <div className="landing-body">
            <p>
              Parcel surfaces acquisition-grade intelligence on every tax lot
              in Manhattan — scored, enriched, and delivered before the listing
              hits market. Rent stabilization exposure. Historic district
              constraints. Retail lease risk. Buildable FAR. All in one view.
            </p>
          </div>

          <div className="landing-divider" />

          <p className="landing-access-label">
            Parcel is invite-only. Enter your access code.
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
          <div className="landing-footer-value">Acquisition Intelligence</div>
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
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <rect x="0.5" y="0.5" width="23" height="23" stroke="#8A8278" strokeWidth="1.25" fill="none"/>
            <rect x="3" y="3" width="18" height="18" stroke="#8A8278" strokeWidth="0.4" fill="none"/>
            <circle cx="12" cy="10" r="1.75" fill="none" stroke="#A8824E" strokeWidth="1"/>
            <circle cx="12" cy="10" r="0.7" fill="#A8824E"/>
          </svg>
        </div>
      </footer>

    </div>
  )
}
