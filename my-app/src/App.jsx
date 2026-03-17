import { useState } from 'react'
import LandingPage from './components/LandingPage'
import ChatView from './components/ChatView'
import './App.css'

export default function App() {
  const [authenticated, setAuthenticated] = useState(
    () => sessionStorage.getItem('parcel_auth') === '1'
  )

  if (!authenticated) {
    return <LandingPage onAuthenticated={() => setAuthenticated(true)} />
  }

  return <ChatView />
}
