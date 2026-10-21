import type { Directory } from './directoryStore'
import type { Person } from './icsParse'

/** One person as a node of the social network. */
export interface NetworkNode {
  id: string
  /** Display name derived from the person's data; the identifier as fallback. */
  label: string
}

/** An undirected tie between two persons who attended an event together. */
export interface NetworkEdge {
  source: string
  target: string
}

/** The social network: one node per person, edges between co-attendees. */
export interface NetworkGraph {
  nodes: NetworkNode[]
  edges: NetworkEdge[]
}

/** Derive a display name from the stored person data; never invent one. */
export function personLabel(person: Person): string {
  const label = `${person.givenName} ${person.familyName}`.trim()
  return label === '' ? person.identifier : label
}

/**
 * Build the social network from the extracted directory: one node per person,
 * and an edge between every two persons that attended at least one event
 * together. Attendees that are not in the directory are ignored, and persons
 * without any shared event remain isolated nodes.
 */
export function buildNetwork(directory: Directory): NetworkGraph {
  const nodes: NetworkNode[] = []
  const personIds = new Set<string>()
  for (const person of directory.persons) {
    if (personIds.has(person.identifier)) {
      continue
    }
    personIds.add(person.identifier)
    nodes.push({ id: person.identifier, label: personLabel(person) })
  }

  const edgeKeys = new Set<string>()
  const edges: NetworkEdge[] = []
  for (const event of directory.events) {
    const attendees = [...new Set(event.attendees)]
      .filter((identifier) => personIds.has(identifier))
      .sort()
    for (let first = 0; first < attendees.length; first += 1) {
      for (let second = first + 1; second < attendees.length; second += 1) {
        const key = `${attendees[first]}\n${attendees[second]}`
        if (edgeKeys.has(key)) {
          continue
        }
        edgeKeys.add(key)
        edges.push({ source: attendees[first], target: attendees[second] })
      }
    }
  }

  return { nodes, edges }
}
