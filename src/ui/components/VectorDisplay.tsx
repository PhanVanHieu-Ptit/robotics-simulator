import { Typography } from 'antd'

const { Text } = Typography

interface VectorDisplayProps {
  label: string
  values: readonly number[]
  precision?: number
  unit?: string
}

export function VectorDisplay({ label, values, precision = 3, unit = '' }: VectorDisplayProps) {
  return (
    <div style={{ marginBottom: 8 }}>
      <Text style={{ color: '#888', fontSize: 11, display: 'block', marginBottom: 2 }}>
        {label}
      </Text>
      <Text
        style={{ color: '#e0e0e0', fontSize: 12, fontFamily: 'monospace' }}
      >
        ({values.map((v) => `${v.toFixed(precision)}${unit}`).join(', ')})
      </Text>
    </div>
  )
}
