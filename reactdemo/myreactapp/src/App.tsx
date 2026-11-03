import { useState } from 'react'
import StudentApp from './StudentApp.tsx'
import CredentialApp from './CredentialApp.tsx'
import './App.css'

function App() {
  const [view, setView] = useState<'credentials' | 'students'>('credentials')

  return (
    <>
      <nav className="service-nav" aria-label="Services">
        <button className={view === 'credentials' ? 'active' : ''} onClick={() => setView('credentials')}>
          Credential verification
        </button>
        <button className={view === 'students' ? 'active' : ''} onClick={() => setView('students')}>
          Student registry demo
        </button>
      </nav>
      {view === 'credentials' ? <CredentialApp /> : <StudentApp />}
    </>
  )
}

export default App
