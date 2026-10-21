import { useCallback, useState } from 'react'
import { ImportPanel } from './components/ImportPanel'
import { NetworkView } from './components/NetworkView'
import { loadDirectory, type Directory } from './lib/directoryStore'
import './App.css'

function App() {
  // The directory is derived from the stored ICS entries; ImportPanel reports
  // whenever it changed them, and the network follows along.
  const [directory, setDirectory] = useState<Directory>(loadDirectory)
  const handleEntriesChange = useCallback(() => {
    setDirectory(loadDirectory())
  }, [])

  return (
    <>
      <header className="app-header">
        <h1>netzwerkeln</h1>
        <p className="tagline">
          Construct your social network from your calendars.
        </p>
      </header>
      <main className="app-main">
        <ImportPanel onEntriesChange={handleEntriesChange} />
        <NetworkView directory={directory} />
      </main>
    </>
  )
}

export default App
