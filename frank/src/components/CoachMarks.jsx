import { useState, useEffect } from 'react'
import './CoachMarks.css'

const STEPS = [
  {
    title: 'Welcome to Parcel',
    body: 'Every dot on the map is a Manhattan tax lot scored for acquisition potential. Bronze = signal (85+), grey = fully built out.',
    target: null,
  },
  {
    title: 'Filter to your strategy',
    body: 'Pick a deal type (Vacant, Parking, Teardown) and a neighborhood to narrow down to sites that match your criteria.',
    target: '.sidebar-tabs button:first-child',
  },
  {
    title: 'Click any dot to analyze',
    body: 'Open a full breakdown: zoning, unused FAR, condo pro forma, ownership history, and comparable sales.',
    target: '.map-container',
  },
  {
    title: 'Track your pipeline',
    body: 'Save properties, add private deal notes, and use the Assemble tab to model multi-lot acquisitions.',
    target: '.sidebar-tabs button:nth-child(3)',
  },
]

export default function CoachMarks() {
  const [step, setStep]       = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem('parcel_onboarded')) {
      // Small delay so the map finishes loading before the card appears
      const t = setTimeout(() => setVisible(true), 1800)
      return () => clearTimeout(t)
    }
  }, [])

  useEffect(() => {
    document.querySelectorAll('.coach-highlight').forEach(el =>
      el.classList.remove('coach-highlight')
    )
    if (!visible) return
    const target = STEPS[step]?.target
    if (target) {
      const el = document.querySelector(target)
      if (el) el.classList.add('coach-highlight')
    }
    return () => {
      document.querySelectorAll('.coach-highlight').forEach(el =>
        el.classList.remove('coach-highlight')
      )
    }
  }, [step, visible])

  const dismiss = () => {
    setVisible(false)
    document.querySelectorAll('.coach-highlight').forEach(el =>
      el.classList.remove('coach-highlight')
    )
  }

  const complete = () => {
    localStorage.setItem('parcel_onboarded', '1')
    dismiss()
  }

  if (!visible) return null

  const isLast = step === STEPS.length - 1

  return (
    <div className="coach-card">
      <div className="coach-top-row">
        <div className="coach-step-dots">
          {STEPS.map((_, i) => (
            <span key={i} className={`coach-dot ${i === step ? 'active' : ''}`} />
          ))}
        </div>
        <button className="coach-skip" onClick={dismiss}>Skip</button>
      </div>
      <div className="coach-title">{STEPS[step].title}</div>
      <div className="coach-body">{STEPS[step].body}</div>
      <div className="coach-actions">
        {step > 0 && (
          <button className="coach-btn-secondary" onClick={() => setStep(s => s - 1)}>
            ← Back
          </button>
        )}
        <button
          className="coach-btn-primary"
          onClick={isLast ? complete : () => setStep(s => s + 1)}
        >
          {isLast ? 'Get started →' : 'Next →'}
        </button>
      </div>
    </div>
  )
}
