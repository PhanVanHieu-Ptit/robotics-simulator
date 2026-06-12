import { Slider, Typography } from 'antd'

const { Text } = Typography

interface JointSliderProps {
  index: number
  angle: number           // current radians
  min: number             // radians
  max: number             // radians
  hasWarning?: boolean
  onChange: (index: number, angle: number) => void
}

export function JointSlider({ index, angle, min, max, hasWarning, onChange }: JointSliderProps) {
  const toDeg = (r: number) => ((r * 180) / Math.PI).toFixed(1)

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ color: hasWarning ? '#faad14' : '#aaa', fontSize: 12 }}>
          J{index + 1}
        </Text>
        <Text style={{ color: '#fff', fontSize: 12, fontFamily: 'monospace' }}>
          {toDeg(angle)}°
        </Text>
      </div>
      <Slider
        min={min}
        max={max}
        step={0.01}
        value={angle}
        onChange={(v) => onChange(index, v)}
        tooltip={{ formatter: (v) => `${toDeg(v ?? 0)}°` }}
        styles={{
          track:  { background: hasWarning ? '#faad14' : '#1890ff' },
          handle: { borderColor: hasWarning ? '#faad14' : '#1890ff' },
        }}
      />
    </div>
  )
}
