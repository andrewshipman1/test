import { useState } from 'react'
import MapView from './components/MapView'
import Sidebar from './components/Sidebar'
import PropertyDrawer from './components/PropertyDrawer'
import Header from './components/Header'
import { useSavedProperties } from './hooks/useSavedProperties'
import { useUnderwritingAssumptions } from './hooks/useUnderwritingAssumptions'
import { useMarketPsf } from './hooks/useMarketPsf'
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

  const { savedProperties, isSaved, toggleSave, removeSaved } = useSavedProperties()
  const {
    assumptions, updateAssumption, resetAssumptions,
    getPropertyAssumptions, setPropertyOverride, clearPropertyOverride, hasOverride,
    updatePsfOverride, resetPsfOverride, resetAllPsf,
  } = useUnderwritingAssumptions()
  const { livePsf } = useMarketPsf()

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
        />
        <MapView
          filters={filters}
          selectedProperty={selectedProperty}
          setSelectedProperty={setSelectedProperty}
          assemblageLots={assemblageLots}
          setAssemblageLots={setAssemblageLots}
          onZoningDistrictsLoaded={setZoningDistricts}
          searchTarget={searchTarget}
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
          />
        )}
      </div>
    </div>
  )
}
