import { useState } from 'react'
import { FrankSeal } from './FrankSeal'
import { FrankMasthead } from './FrankMasthead'
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
          <FrankSeal size={28} theme="light" />
          <FrankMasthead size="sm" theme="light" />
        </div>
        <div className="landing-nav-meta">
          <span>Deal Intelligence</span>
        </div>
      </nav>

      {/* Hero */}
      <main className="landing-hero">
        {/* Stamp watermark */}
        <div className="landing-stamp-watermark">
          <FrankSeal size={340} theme="light" />
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

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-cell">
          <div className="landing-footer-label">PRODUCT</div>
          <div className="landing-footer-value">Deal Intelligence</div>
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
          <FrankSeal size={20} theme="light" />
        </div>
      </footer>

    </div>
  )
}
