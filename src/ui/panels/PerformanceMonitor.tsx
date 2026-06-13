import { useEffect, useRef, type RefObject } from 'react'
import { metricsStore } from '@store/metricsStore'

const LABEL_STYLE: React.CSSProperties = {
  color: '#555', fontSize: 10, fontFamily: 'monospace',
}
const VALUE_STYLE: React.CSSProperties = {
  fontSize: 12, fontFamily: 'monospace', fontWeight: 600, color: '#aaa',
}

function Metric({ label, valueRef }: { label: string; valueRef: RefObject<HTMLSpanElement | null> }) {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'baseline' }}>
      <span style={LABEL_STYLE}>{label}</span>
      <span ref={valueRef} style={VALUE_STYLE}>—</span>
    </div>
  )
}

// Writes metric values directly to DOM refs via Zustand vanilla subscribe —
// never triggers a React re-render while the simulation is running.
export function PerformanceMonitor() {
  const simRef   = useRef<HTMLSpanElement>(null)
  const frameRef = useRef<HTMLSpanElement>(null)
  const fpsRef   = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    return metricsStore.subscribe((simTime, frameTime) => {
      if (simRef.current)   simRef.current.textContent   = `${simTime.toFixed(2)}s`
      if (frameRef.current) frameRef.current.textContent = `${frameTime.toFixed(1)}ms`
      const fps = frameTime > 0 ? (1000 / frameTime).toFixed(0) : '—'
      if (fpsRef.current) {
        fpsRef.current.textContent = fps
        fpsRef.current.style.color = Number(fps) < 30 ? '#ff4d4f' : '#52c41a'
      }
    })
  }, [])

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '0 8px' }}>
      <Metric label="SIM"   valueRef={simRef} />
      <Metric label="FRAME" valueRef={frameRef} />
      <Metric label="FPS"   valueRef={fpsRef} />
    </div>
  )
}
