import { useFrame } from '@react-three/fiber'
import { Slider, Typography, Button, Empty, Divider } from 'antd'
import { applyAngles, useManipulatorStore } from '@simulation/systems/ManipulatorSystem'

const { Title, Text } = Typography

// Null-rendering R3F component — must live inside <Canvas>.
// Bridges Zustand angle state → Three.js node mutations every frame.
export function ManipulatorRenderer() {
  useFrame(() => {
    applyAngles(useManipulatorStore.getState().angles)
  })
  return null
}

// Ant Design sidebar panel — lives outside <Canvas> in Sidebar.
export function ManipulatorControls() {
  const joints = useManipulatorStore((s) => s.joints)
  const angles = useManipulatorStore((s) => s.angles)
  const { setAngle, resetAngles } = useManipulatorStore.getState()

  if (joints.length === 0) {
    return (
      <Empty
        description="No arm joints detected"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        style={{ marginTop: 24 }}
      />
    )
  }

  return (
    <div style={{ padding: '0 4px' }}>
      <Title level={5} style={{ color: '#fff', marginBottom: 12, fontSize: 13 }}>
        Manipulator — Joints
      </Title>

      {joints.map((joint) => {
        const angleRad = angles[joint.uuid] ?? 0
        const angleDeg = (angleRad * 180) / Math.PI

        return (
          <div key={joint.uuid} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ color: '#aaa', fontSize: 12 }}>{joint.name}</Text>
              <Text style={{ color: '#fff', fontSize: 12, fontFamily: 'monospace' }}>
                {angleDeg.toFixed(1)}°
              </Text>
            </div>
            <Slider
              min={-180}
              max={180}
              step={0.5}
              value={angleDeg}
              onChange={(deg: number) => setAngle(joint.uuid, (deg * Math.PI) / 180)}
              tooltip={{ formatter: (v) => `${(v ?? 0).toFixed(1)}°` }}
            />
          </div>
        )
      })}

      <Divider style={{ borderColor: '#333', margin: '12px 0' }} />

      <Button block onClick={resetAngles} style={{ fontSize: 12 }}>
        Reset All
      </Button>
    </div>
  )
}
