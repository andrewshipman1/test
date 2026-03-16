import { useState, useRef, useEffect } from 'react'
import { Search, X, Loader } from 'lucide-react'
import './Header.css'

export default function Header({ onSearch }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const debounceRef = useRef(null)
  const wrapperRef = useRef(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleChange = (e) => {
    const val = e.target.value
    setQuery(val)
    if (!val.trim()) {
      setResults([])
      setShowDropdown(false)
      return
    }

    // Debounce API call
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(
          `https://geosearch.planninglabs.nyc/v2/search?text=${encodeURIComponent(val)}&size=6`
        )
        const json = await res.json()
        // Accept any NYC result — label usually contains borough info
        const features = (json.features || []).filter(f => {
          const label = (f.properties?.label || '').toLowerCase()
          return label.includes('new york') || label.includes('manhattan') || label.includes('ny')
        })
        setResults(features)
        setShowDropdown(true)
      } catch (err) {
        console.error('Geocode error:', err)
      } finally {
        setLoading(false)
      }
    }, 300)
  }

  const handleSelect = (feature) => {
    const [lng, lat] = feature.geometry.coordinates
    const label = feature.properties.label
    setQuery(label)
    setShowDropdown(false)
    setResults([])
    if (onSearch) onSearch({ lng, lat, label })
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && results.length > 0) {
      handleSelect(results[0])
    }
    if (e.key === 'Escape') {
      setShowDropdown(false)
    }
  }

  const clearSearch = () => {
    setQuery('')
    setResults([])
    setShowDropdown(false)
  }

  return (
    <header className="header">
      <div className="header-left">
        <div className="logo">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <rect x="0.5" y="0.5" width="23" height="23" stroke="#EDE5D8" strokeWidth="1.25" fill="none"/>
            <rect x="3" y="3" width="18" height="18" stroke="#EDE5D8" strokeWidth="0.4" fill="none"/>
            <line x1="3" y1="16" x2="21" y2="16" stroke="#EDE5D8" strokeWidth="0.4"/>
            <circle cx="12" cy="10" r="1.75" fill="none" stroke="#C4A06A" strokeWidth="1"/>
            <circle cx="12" cy="10" r="0.7" fill="#C4A06A"/>
          </svg>
          <span className="logo-text">PARCEL</span>
        </div>
        <div className="header-tagline">Acquisition Intelligence</div>
      </div>

      <div className="header-center" ref={wrapperRef}>
        <div className={`search-bar ${showDropdown && results.length > 0 ? 'search-bar--open' : ''}`}>
          {loading ? <Loader size={14} color="#C4A06A" className="spin" /> : <Search size={14} color="#666" />}
          <input
            type="text"
            placeholder="Search address, BBL, or neighborhood..."
            value={query}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => results.length > 0 && setShowDropdown(true)}
          />
          {query && (
            <button className="search-clear" onClick={clearSearch}>
              <X size={12} />
            </button>
          )}
        </div>

        {showDropdown && results.length > 0 && (
          <div className="search-dropdown">
            {results.map((feature, i) => (
              <button
                key={i}
                className="search-result-item"
                onClick={() => handleSelect(feature)}
              >
                <span style={{width:5,height:5,borderRadius:'50%',background:'#C4A06A',flexShrink:0}} />
                <div className="search-result-text">
                  <span className="search-result-label">{feature.properties.name}</span>
                  <span className="search-result-sub">{feature.properties.borough}, NYC</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {showDropdown && results.length === 0 && query && !loading && (
          <div className="search-dropdown">
            <div className="search-no-results">No results</div>
          </div>
        )}
      </div>

      <div className="header-right">
        <div className="market-pulse">
          <span className="pulse-dot" />
          <span className="pulse-text">Live Data</span>
        </div>
      </div>
    </header>
  )
}
