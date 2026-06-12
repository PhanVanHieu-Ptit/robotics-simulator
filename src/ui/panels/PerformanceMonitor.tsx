import { Typography } from 'antd'
import { useSimulationStore } from '@store/simulationStore'

const { Text } = Typography

export function PerformanceMonitor() {
  const simTime   = useSimulationStore((s) => s.simTime)
  const frameTime = useSimulationStore((s) => s.frameTime)

  const fps = frameTime > 0 ? (1000 / frameTime).toFixed(0) : '—'

  return (
    <div
      style={{
        display: 'flex',
        gap: 16,
        alignItems: 'center',
        padding: '0 8px',
      }}
    >
      <Metric label="SIM" value={`${simTime.toFixed(2)}s`} />
      <Metric label="FRAME" value={`${frameTime.toFixed(1)}ms`} />
      <Metric label="FPS" value={fps} color={Number(fps) < 30 ? '#ff4d4f' : '#52c41a'} />
    </div>
  )
}

function Metric({ label, value, color = '#aaa' }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'baseline' }}>
      <Text style={{ color: '#555', fontSize: 10, fontFamily: 'monospace' }}>{label}</Text>
      <Text style={{ color, fontSize: 12, fontFamily: 'monospace', fontWeight: 600 }}>{value}</Text>
    </div>
  )
}
