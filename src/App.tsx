import { ImportPanel } from './components/ImportPanel'
import './App.css'

function App() {
  return (
    <>
      <header className="app-header">
        <h1>netzwerkeln</h1>
        <p className="tagline">
          Construct your social network from your calendars.
        </p>
      </header>
      <main className="app-main">
        <ImportPanel />
      </main>
    </>
  )
}

export default App
