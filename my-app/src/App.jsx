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

  // Build BBL → PLUTO feature lookup for joining pipeline permits with coordinates
  const bblToFeature = useMemo(() => {
    const map = {}
    allFeatures.forEach(f => {
      const bbl = String(Math.round(Number(f.properties?.bbl || 0))).padStart(10, '0')
      map[bbl] = f
    })
    return map
  }, [allFeatures])

  // Enrich permits with PLUTO address for sidebar display
  const enrichedPermits = useMemo(() => {
    return permits.map(p => ({
      ...p,
      address: bblToFeature[p.bbl]?.properties?.address || p.bbl,
    }))
  }, [permits, bblToFeature])

  // Pipeline GeoJSON: join permits with PLUTO coordinates + address
  const pipelineGeoJSON = useMemo(() => {
    if (!permits.length || !Object.keys(bblToFeature).length) {
      return { type: 'FeatureCollection', features: [] }
    }
    const features = []
    permits.forEach((p, i) => {
      const pluto = bblToFeature[p.bbl]
      if (!pluto?.geometry?.coordinates) return
      features.push({
        type: 'Feature',
        id: i,
        geometry: { type: 'Point', coordinates: pluto.geometry.coordinates },
        properties: {
          type: p.type,
          address: pluto.properties?.address || p.bbl,
          filingDate: p.filingDate,
          cost: p.cost || '',
          status: p.status,
          description: p.description,
          bbl: p.bbl,
        },
      })
    })
    return { type: 'FeatureCollection', features }
  }, [permits, bblToFeature])

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
    const pluto = bblToFeature[permit.bbl]
    if (pluto?.geometry?.coordinates) {
      const [lng, lat] = pluto.geometry.coordinates
      setSearchTarget({ lng, lat, label: permit.address || permit.bbl })
    }
  }, [bblToFeature])

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
          permits={enrichedPermits}
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
