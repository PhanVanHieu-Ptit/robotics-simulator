import { Typography, Button, Space } from 'antd'
import { useRobotCommands } from '@hooks/useRobotCommands'

const { Title } = Typography

const DRIVE_COMMANDS = [
  { label: '↑', linear:  1.5, angular:  0 },
  { label: '↓', linear: -1.5, angular:  0 },
  { label: '←', linear:  0,   angular:  2 },
  { label: '→', linear:  0,   angular: -2 },
] as const

export function ControlPanel() {
  const { dispatch } = useRobotCommands()

  return (
    <div style={{ padding: '0 4px' }}>
      <Title level={5} style={{ color: '#fff', marginBottom: 12, fontSize: 13 }}>
        Mobile Base — Drive (WASD)
      </Title>

      <Space direction="vertical" style={{ width: '100%' }} size={8}>
        {DRIVE_COMMANDS.map(({ label, linear, angular }) => (
          <Button
            key={label}
            block
            onPointerDown={() => dispatch({ type: 'DRIVE', linear, angular })}
            onPointerUp={()   => dispatch({ type: 'DRIVE', linear: 0, angular: 0 })}
            style={{ fontFamily: 'monospace', fontSize: 16 }}
          >
            {label}
          </Button>
        ))}
      </Space>
    </div>
  )
}
