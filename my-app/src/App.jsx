import { useState, useMemo, useCallback } from 'react'
import MapView from './components/MapView'
import Sidebar from './components/Sidebar'
import PropertyDrawer from './components/PropertyDrawer'
import Header from './components/Header'
import { useSavedProperties } from './hooks/useSavedProperties'
import { useUnderwritingAssumptions } from './hooks/useUnderwritingAssumptions'
import { useMarketPsf } from './hooks/useMarketPsf'
import { usePipelineData } from './hooks/usePipelineData'
import './App.css'

export default function App() {
  const [selectedProperty, setSelectedProperty] = useState(null)
  const [filters, setFilters] = useState({
    minAvailableFAR: 0,
    landUse: 'all',
    zoningDistrict: 'all',
    minOpportunityScore: 0,
    showLandmarks: true,
    showVacantOnly: false,
    cityOfYesOnly: false,
  })
  const [assemblageLots, setAssemblageLots] = useState([])
  const [zoningDistricts, setZoningDistricts] = useState([])
  const [searchTarget, setSearchTarget] = useState(null)
  const [allFeatures, setAllFeatures] = useState([])
  const [showPipeline, setShowPipeline] = useState(false)

  const { savedProperties, isSaved, toggleSave, removeSaved } = useSavedProperties()
  const {
    assumptions, updateAssumption, resetAssumptions,
    getPropertyAssumptions, setPropertyOverride, clearPropertyOverride, hasOverride,
    updatePsfOverride, resetPsfOverride, resetAllPsf,
  } = useUnderwritingAssumptions()
  const { livePsf } = useMarketPsf()
  const { permits, loading: pipelineLoading, summary: pipelineSummary } = usePipelineData()

  // Pipeline GeoJSON: built directly from lat/lng on each permit (no BBL join needed)
  const pipelineGeoJSON = useMemo(() => {
    const features = permits
      .filter(p => p.lat && p.lng)
      .map((p, i) => ({
        type: 'Feature',
        id: i,
        geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
        properties: {
          type:        p.type,
          address:     p.address,
          filingDate:  p.filingDate,
          status:      p.status,
          description: p.description,
          bbl:         p.bbl,
        },
      }))
    return { type: 'FeatureCollection', features }
  }, [permits])

  // Build BBL → PLUTO feature lookup (for permit fly-to from sidebar)
  const bblToFeature = useMemo(() => {
    const map = {}
    allFeatures.forEach(f => {
      const bbl = String(Math.round(Number(f.properties?.bbl || 0))).padStart(10, '0')
      map[bbl] = f
    })
    return map
  }, [allFeatures])

  // When clicking a saved lot in sidebar: fly to it and open drawer
  const handleSelectSaved = (property) => {
    setSelectedProperty(property)
    if (property.longitude && property.latitude) {
      setSearchTarget({
        lng: parseFloat(property.longitude),
        lat: parseFloat(property.latitude),
        label: property.address,
      })
    }
  }

  // When clicking a permit in the sidebar list: fly to it on the map
  const handleSelectPermit = useCallback((permit) => {
    if (permit.lat && permit.lng) {
      setSearchTarget({ lng: permit.lng, lat: permit.lat, label: permit.address || permit.bbl })
    }
  }, [])

  return (
    <div className="app-container">
      <Header onSearch={setSearchTarget} />
      <div className="main-layout">
        <Sidebar
          filters={filters}
          setFilters={setFilters}
          assemblageLots={assemblageLots}
          setAssemblageLots={setAssemblageLots}
          zoningDistricts={zoningDistricts}
          savedProperties={savedProperties}
          removeSaved={removeSaved}
          onSelectSaved={handleSelectSaved}
          assumptions={assumptions}
          updateAssumption={updateAssumption}
          resetAssumptions={resetAssumptions}
          updatePsfOverride={updatePsfOverride}
          resetPsfOverride={resetPsfOverride}
          resetAllPsf={resetAllPsf}
          livePsf={livePsf}
          allFeatures={allFeatures}
          permits={permits}
          pipelineLoading={pipelineLoading}
          pipelineSummary={pipelineSummary}
          onSelectPermit={handleSelectPermit}
        />
        <MapView
          filters={filters}
          selectedProperty={selectedProperty}
          setSelectedProperty={setSelectedProperty}
          assemblageLots={assemblageLots}
          setAssemblageLots={setAssemblageLots}
          onZoningDistrictsLoaded={setZoningDistricts}
          onFeaturesLoaded={setAllFeatures}
          searchTarget={searchTarget}
          pipelineData={pipelineGeoJSON}
          showPipeline={showPipeline}
          onTogglePipeline={setShowPipeline}
        />
        {selectedProperty && (
          <PropertyDrawer
            property={selectedProperty}
            onClose={() => setSelectedProperty(null)}
            assemblageLots={assemblageLots}
            setAssemblageLots={setAssemblageLots}
            isSaved={isSaved}
            toggleSave={toggleSave}
            globalAssumptions={assumptions}
            getPropertyAssumptions={getPropertyAssumptions}
            setPropertyOverride={setPropertyOverride}
            clearPropertyOverride={clearPropertyOverride}
            hasOverride={hasOverride}
            livePsf={livePsf}
            allFeatures={allFeatures}
          />
        )}
      </div>
    </div>
  )
}
