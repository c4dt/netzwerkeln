import { useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useIcsEntries } from '../lib/icsStore'

type Status = { kind: 'idle' | 'busy' } | { kind: 'error'; message: string }

interface ImportPanelProps {
  /**
   * Called whenever the stored entries changed and were persisted, so the
   * parent can refresh anything derived from them (e.g. the directory).
   */
  onEntriesChange?: () => void
}

export function ImportPanel({ onEntriesChange }: ImportPanelProps) {
  const { entries, add, clear } = useIcsEntries()
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  // Runs after the effect that persists the entries and rebuilds the
  // directory, so the parent always sees the freshly extracted data.
  useEffect(() => {
    onEntriesChange?.()
  }, [entries, onEntriesChange])

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])]
    event.target.value = '' // reset so the same file can be selected again
    for (const file of files) {
      // Files are imported sequentially: the local store is updated for each
      // file before the next one is read.
      try {
        add({ name: file.name, source: 'file', content: await file.text() })
      } catch {
        setStatus({ kind: 'error', message: `Could not read "${file.name}".` })
      }
    }
  }

  async function handleUrlSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const target = url.trim()
    if (target === '' || status.kind === 'busy') {
      return
    }
    setStatus({ kind: 'busy' })
    try {
      const response = await fetch(target)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      add({ name: target, source: 'url', content: await response.text() })
      setUrl('') // reset the form after each imported URL
      setStatus({ kind: 'idle' })
    } catch {
      setStatus({
        kind: 'error',
        message: `Could not fetch "${target}". The server may not allow cross-origin requests; download the file and upload it instead.`,
      })
    }
  }

  const busy = status.kind === 'busy'

  return (
    <section className="import-panel" aria-labelledby="import-title">
      <h2 id="import-title">Import calendars</h2>
      <p>
        Add ICS calendars to build your network. They are processed one at a
        time and stored locally in your browser.
      </p>

      <input
        type="file"
        multiple
        accept=".ics,text/calendar"
        onChange={handleFileChange}
        aria-label="Upload ICS files"
        disabled={busy}
      />

      <form className="url-form" onSubmit={handleUrlSubmit}>
        <input
          type="url"
          value={url}
          placeholder="https://example.com/calendar.ics"
          onChange={(event) => setUrl(event.target.value)}
          aria-label="Public ICS URL"
          disabled={busy}
        />
        <button type="submit" disabled={busy || url.trim() === ''}>
          Add URL
        </button>
      </form>

      {status.kind === 'error' ? <p role="alert">{status.message}</p> : null}

      <h3>Imported calendars</h3>
      {entries.length === 0 ? (
        <p>Nothing imported yet.</p>
      ) : (
        <ul className="entry-list">
          {entries.map((entry) => (
            <li key={entry.id}>
              <span className="entry-name">{entry.name}</span>{' '}
              <span className="entry-source">({entry.source})</span>
            </li>
          ))}
        </ul>
      )}

      <p className="storage-note">
        <strong>Your data never leaves this browser.</strong> Calendars are kept
        in this browser's local storage for further processing. To clear them,
        use the button below or remove this site's data in your browser
        settings.
      </p>
      <button type="button" onClick={clear} disabled={entries.length === 0}>
        Clear stored calendars
      </button>
    </section>
  )
}
