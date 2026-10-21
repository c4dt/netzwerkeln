import { useEffect, useMemo, useRef } from 'react'
import cytoscape from 'cytoscape'
import type { Directory } from '../lib/directoryStore'
import { buildNetwork } from '../lib/network'

interface NetworkViewProps {
  /** Persons and events extracted from the imported calendars. */
  directory: Directory
}

/** Colors follow the app theme; they work on both the light and dark background. */
const NETWORK_STYLE: cytoscape.StylesheetJson = [
  {
    selector: 'node',
    style: {
      'background-color': '#aa3bff',
      'border-width': 1,
      'border-color': '#08060d',
      label: 'data(label)',
      'font-size': 12,
      color: '#6b6375',
      'text-valign': 'bottom',
      'text-margin-y': 6,
    },
  },
  {
    selector: 'edge',
    style: {
      width: 1.5,
      'line-color': '#9ca3af',
      'curve-style': 'bezier',
    },
  },
]

/**
 * Display the social network: one node per person, an edge between all
 * persons that attended at least one meeting together. While the data is
 * this simple, zooming in and out is the only interaction; when nothing is
 * imported, it explains how to get started instead.
 */
export function NetworkView({ directory }: NetworkViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const graph = useMemo(() => buildNetwork(directory), [directory])

  useEffect(() => {
    const container = containerRef.current
    if (container === null) {
      return
    }
    const instance = cytoscape({
      container,
      elements: [
        ...graph.nodes.map((node) => ({
          data: { id: node.id, label: node.label },
        })),
        ...graph.edges.map((edge) => ({
          data: { source: edge.source, target: edge.target },
        })),
      ],
      layout: { name: 'cose', animate: false, padding: 30 },
      style: NETWORK_STYLE,
      // Zooming in and out is the only interaction for now: no panning,
      // dragging, selecting, or box selection.
      zoomingEnabled: true,
      userZoomingEnabled: true,
      panningEnabled: false,
      boxSelectionEnabled: false,
      autoungrabify: true,
      autounselectify: true,
      minZoom: 0.2,
      maxZoom: 4,
      wheelSensitivity: 0.2,
    })
    return () => {
      instance.destroy()
    }
  }, [graph])

  if (directory.persons.length === 0) {
    return (
      <section className="network-view" aria-labelledby="network-title">
        <h2 id="network-title">Your network</h2>
        <p>
          Nothing to show yet. Import an ICS calendar above — upload a file or
          add a public URL — and your network will appear here.
        </p>
      </section>
    )
  }

  return (
    <section className="network-view" aria-labelledby="network-title">
      <h2 id="network-title">Your network</h2>
      <div
        ref={containerRef}
        className="network-canvas"
        role="img"
        aria-label="Social network graph"
      />
    </section>
  )
}
