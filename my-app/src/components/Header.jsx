import { useState, useRef, useEffect } from 'react'
import { MapPin, Bell, Search, X, Loader } from 'lucide-react'
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
          <MapPin size={20} color="#f59e0b" />
          <span className="logo-text">ATLAS</span>
          <span className="logo-sub">NYC</span>
        </div>
        <div className="header-tagline">Manhattan Development Intelligence</div>
      </div>

      <div className="header-center" ref={wrapperRef}>
        <div className={`search-bar ${showDropdown && results.length > 0 ? 'search-bar--open' : ''}`}>
          {loading ? <Loader size={14} color="#f59e0b" className="spin" /> : <Search size={14} color="#666" />}
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
                <MapPin size={13} color="#f59e0b" />
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
            <div className="search-no-results">No Manhattan results found</div>
          </div>
        )}
      </div>

      <div className="header-right">
        <div className="market-pulse">
          <span className="pulse-dot" />
          <span className="pulse-text">Live Data</span>
        </div>
        <button className="icon-btn">
          <Bell size={18} />
        </button>
        <button className="upgrade-btn">Pro Access</button>
      </div>
    </header>
  )
}
