import { useEffect, useRef, type RefObject } from 'react'
import { Typography } from 'antd'
import { useRendererStore } from '@store/rendererStore'

const { Title } = Typography

const CARD_STYLE: React.CSSProperties = {
  background: '#1a1a2e',
  border: '1px solid #2a2a3a',
  borderRadius: 4,
  padding: '8px 10px',
}
const TITLE_STYLE: React.CSSProperties = { fontSize: 11, color: '#888', marginBottom: 2 }
const VALUE_STYLE: React.CSSProperties = {
  fontSize: 16, color: '#e0e0e0', fontFamily: 'monospace', fontWeight: 600,
}

function Metric({
  label,
  valueRef,
}: {
  label: string
  valueRef: RefObject<HTMLSpanElement>
}) {
  return (
    <div style={CARD_STYLE}>
      <div style={TITLE_STYLE}>{label}</div>
      <span ref={valueRef} style={VALUE_STYLE}>0</span>
    </div>
  )
}

// Reads renderer stats from useRendererStore via vanilla subscribe and writes
// directly to DOM refs — never triggers a React re-render while the scene runs.
export function PerformancePanel() {
  const callsRef     = useRef<HTMLSpanElement>(null)
  const geomRef      = useRef<HTMLSpanElement>(null)
  const trisRef      = useRef<HTMLSpanElement>(null)
  const texturesRef  = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    return useRendererStore.subscribe((s) => {
      const { calls, geometries, triangles, textures } = s.stats
      if (callsRef.current)    callsRef.current.textContent    = String(calls)
      if (geomRef.current)     geomRef.current.textContent     = String(geometries)
      if (trisRef.current)     trisRef.current.textContent     = triangles.toLocaleString()
      if (texturesRef.current) texturesRef.current.textContent = String(textures)
    })
  }, [])

  return (
    <div style={{ padding: '4px 0' }}>
      <Title level={5} style={{ color: '#fff', marginBottom: 12, marginTop: 4 }}>
        Renderer
      </Title>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <Metric label="Draw Calls"  valueRef={callsRef} />
        <Metric label="Geometries"  valueRef={geomRef} />
        <Metric label="Triangles"   valueRef={trisRef} />
        <Metric label="Textures"    valueRef={texturesRef} />
      </div>
    </div>
  )
}
