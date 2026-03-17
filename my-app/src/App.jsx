import { useState, useMemo } from 'react'
import MapView from './components/MapView'
import Sidebar from './components/Sidebar'
import PropertyDrawer from './components/PropertyDrawer'
import Header from './components/Header'
import LandingPage from './components/LandingPage'
import { useSavedProperties } from './hooks/useSavedProperties'
import { useUnderwritingAssumptions } from './hooks/useUnderwritingAssumptions'
import { useMarketPsf } from './hooks/useMarketPsf'
import { useDealNotes } from './hooks/useDealNotes'
import { useMarketSignals } from './hooks/useMarketSignals'
import './App.css'

function ProductApp() {
  const [selectedProperty, setSelectedProperty] = useState(null)
  const [filters, setFilters] = useState({
    dealType: 'all',
    neighborhood: 'all',
    zoningType: 'all',
    zoningDistrict: 'all',
    minOpportunityScore: 0,
    minBuildableSF: 0,
    showLandmarks: true,
    cityOfYesOnly: false,
  })
  const [assemblageLots, setAssemblageLots] = useState([])
  const [zoningDistricts, setZoningDistricts] = useState([])
  const [searchTarget, setSearchTarget] = useState(null)
  const [allFeatures, setAllFeatures] = useState([])

  const { savedProperties, isSaved, toggleSave, removeSaved } = useSavedProperties()
  const { notes, setNote, getNote } = useDealNotes()
  const {
    assumptions, updateAssumption, resetAssumptions,
    getPropertyAssumptions, setPropertyOverride, clearPropertyOverride, hasOverride,
    updatePsfOverride, resetPsfOverride, resetAllPsf,
  } = useUnderwritingAssumptions()
  const { livePsf } = useMarketPsf()
  const { signals: marketSignals } = useMarketSignals()

  const bblToFeature = useMemo(() => {
    const map = {}
    allFeatures.forEach(f => {
      const bbl = String(Math.round(Number(f.properties?.bbl || 0))).padStart(10, '0')
      map[bbl] = f
    })
    return map
  }, [allFeatures])

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
          notes={notes}
          onNeighborhoodZoom={(lat, lng, zoom) => setSearchTarget({ lat, lng, zoom })}
          lotsByBbl={bblToFeature}
          onSelectProperty={(props) => setSelectedProperty(props)}
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
          marketSignals={marketSignals}
          allFeaturesCount={allFeatures.length}
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
            getNote={getNote}
            setNote={setNote}
            onOpenModelTab={() => setFilters(prev => ({ ...prev, _tab: 'proforma' }))}
            marketSignals={marketSignals}
            onFlyToLot={(lat, lng, label) => setSearchTarget({ lat, lng, label })}
          />
        )}
      </div>
    </div>
  )
}

export default function App() {
  const [authenticated, setAuthenticated] = useState(
    () => sessionStorage.getItem('parcel_auth') === '1'
  )

  if (!authenticated) {
    return <LandingPage onAuthenticated={() => setAuthenticated(true)} />
  }

  return <ProductApp />
}
