import { useState } from 'react'
import MapView from './components/MapView'
import Sidebar from './components/Sidebar'
import PropertyDrawer from './components/PropertyDrawer'
import Header from './components/Header'
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
          />
        )}
      </div>
    </div>
  )
}
