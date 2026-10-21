import { useCallback, useEffect, useState } from 'react'
import { clearDirectory, rebuildDirectory } from './directoryStore'

/** Raw contents of one imported ICS calendar, kept for further processing. */
export interface IcsEntry {
  id: string
  /** File name for uploads, URL for remote calendars. */
  name: string
  source: 'file' | 'url'
  /** Raw ICS file contents. */
  content: string
  importedAt: string
}

/** Input needed to import one ICS calendar. */
export interface IcsInput {
  name: string
  source: IcsEntry['source']
  content: string
}

const STORAGE_KEY = 'netzwerkeln:ics-entries'

function generateId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `entry-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function isIcsEntry(value: unknown): value is IcsEntry {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const entry = value as Record<string, unknown>
  return (
    typeof entry.id === 'string' &&
    typeof entry.name === 'string' &&
    (entry.source === 'file' || entry.source === 'url') &&
    typeof entry.content === 'string' &&
    typeof entry.importedAt === 'string'
  )
}

/** Read all stored ICS entries; returns an empty list when nothing (valid) is stored. */
export function loadEntries(): IcsEntry[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw === null) {
      return []
    }
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isIcsEntry) : []
  } catch {
    return []
  }
}

/**
 * Overwrite the stored ICS entries. The extracted persons/events directory is
 * rebuilt from the given entries, so it always matches the stored raw data.
 */
export function saveEntries(entries: IcsEntry[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  rebuildDirectory(entries)
}

/** Remove the stored ICS entries entirely, along with the extracted directory. */
export function clearEntries(): void {
  window.localStorage.removeItem(STORAGE_KEY)
  clearDirectory()
}

export function createEntry(input: IcsInput): IcsEntry {
  return {
    id: generateId(),
    importedAt: new Date().toISOString(),
    ...input,
  }
}

/**
 * Access the ICS entries stored in the browser. The list lives in React
 * state and is persisted to local storage on every change.
 */
export function useIcsEntries() {
  const [entries, setEntries] = useState<IcsEntry[]>(loadEntries)

  useEffect(() => {
    saveEntries(entries)
  }, [entries])

  const add = useCallback((input: IcsInput) => {
    const entry = createEntry(input)
    setEntries((previous) => [...previous, entry])
  }, [])

  const clear = useCallback(() => {
    setEntries([])
  }, [])

  return { entries, add, clear }
}
