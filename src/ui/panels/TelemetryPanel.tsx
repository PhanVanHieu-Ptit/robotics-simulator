import { useEffect, useRef, type RefObject } from 'react'
import { Typography } from 'antd'
import { useRobotStore } from '@store/robotStore'

const { Title } = Typography

const WHEEL_BASE = 0.5 // metres — matches differential_drive.json

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
const SUFFIX_STYLE: React.CSSProperties = { fontSize: 11, color: '#666', marginLeft: 3 }

// The value span is updated via DOM ref — no React re-render on every frame.
function Metric({
  label, suffix, valueRef,
}: {
  label: string
  suffix: string
  valueRef: RefObject<HTMLSpanElement>
}) {
  return (
    <div style={CARD_STYLE}>
      <div style={TITLE_STYLE}>{label}</div>
      <div>
        <span ref={valueRef} style={VALUE_STYLE}>0.000</span>
        <span style={SUFFIX_STYLE}>{suffix}</span>
      </div>
    </div>
  )
}

// Reads robot pose / velocity via Zustand vanilla subscribe and writes directly
// to DOM refs — never triggers a React re-render while the simulation is running.
export function TelemetryPanel() {
  const xRef     = useRef<HTMLSpanElement>(null)
  const yRef     = useRef<HTMLSpanElement>(null)
  const thetaRef = useRef<HTMLSpanElement>(null)
  const vRef     = useRef<HTMLSpanElement>(null)
  const omegaRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    return useRobotStore.subscribe((s) => {
      const { x, y, theta } = s.basePose
      if (xRef.current)     xRef.current.textContent     = x.toFixed(3)
      if (yRef.current)     yRef.current.textContent     = y.toFixed(3)
      if (thetaRef.current) thetaRef.current.textContent = ((theta * 180) / Math.PI).toFixed(2)

      const leftVel  = s.robotSnapshots['diff_drive']?.jointStates[0]?.velocity ?? 0
      const rightVel = s.robotSnapshots['diff_drive']?.jointStates[1]?.velocity ?? 0
      const v     = (leftVel + rightVel) / 2
      const omega = (rightVel - leftVel) / WHEEL_BASE
      if (vRef.current)     vRef.current.textContent     = v.toFixed(3)
      if (omegaRef.current) omegaRef.current.textContent = omega.toFixed(3)
    })
  }, [])

  return (
    <div style={{ padding: '4px 0' }}>
      <Title level={5} style={{ color: '#fff', marginBottom: 12, marginTop: 4 }}>
        Telemetry
      </Title>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        <Metric label="X" suffix="m" valueRef={xRef} />
        <Metric label="Y" suffix="m" valueRef={yRef} />
        <div style={CARD_STYLE}>
          <div style={TITLE_STYLE}>Z</div>
          <div>
            <span style={VALUE_STYLE}>0.000</span>
            <span style={SUFFIX_STYLE}>m</span>
          </div>
        </div>
      </div>
      <div style={{ marginTop: 8 }}>
        <Metric label="Heading" suffix="°"     valueRef={thetaRef} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
        <Metric label="Linear Vel."  suffix="m/s"   valueRef={vRef} />
        <Metric label="Angular Vel." suffix="rad/s" valueRef={omegaRef} />
      </div>
    </div>
  )
}
