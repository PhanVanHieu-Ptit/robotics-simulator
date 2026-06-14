import type { ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { Slider, Typography, Button, Empty, Divider } from 'antd'
import { applyAngles, useManipulatorStore } from '@simulation/systems/ManipulatorSystem'
import { useFKStore, type EEPose } from '@simulation/systems/ForwardKinematicsSystem'
import { getEngine } from '@hooks/useSimulation'
import { FRANKA_ID } from '@config/robotIds'

const { Title, Text } = Typography

// ─── End-Effector Pose Display ──────────────────────────────────────────────

const AXIS_COLORS = { X: '#ff6b6b', Y: '#6bcb77', Z: '#6baeff' } as const

function PoseRow({ axis, value, unit = '' }: { axis: 'X' | 'Y' | 'Z'; value: number; unit?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
      <Text style={{ color: AXIS_COLORS[axis], fontSize: 11, fontFamily: 'monospace', minWidth: 14 }}>
        {axis}
      </Text>
      <Text style={{ color: '#e0e0e0', fontSize: 11, fontFamily: 'monospace' }}>
        {value.toFixed(4)}{unit}
      </Text>
    </div>
  )
}

function QuatRow({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
      <Text style={{ color: '#888', fontSize: 11, fontFamily: 'monospace', minWidth: 14 }}>
        {label}
      </Text>
      <Text style={{ color: '#e0e0e0', fontSize: 11, fontFamily: 'monospace' }}>
        {value.toFixed(4)}
      </Text>
    </div>
  )
}

function EESection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <Text style={{ color: '#777', fontSize: 10, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        {title}
      </Text>
      <div style={{ marginTop: 4 }}>{children}</div>
    </div>
  )
}

function EndEffectorDisplay() {
  const isReady = useFKStore(s => s.isReady)
  const pose = useFKStore(s => s.pose) as EEPose

  if (!isReady) {
    return (
      <Text style={{ color: '#555', fontSize: 11 }}>Waiting for joints…</Text>
    )
  }

  return (
    <div>
      <EESection title="Position (m)">
        <PoseRow axis="X" value={pose.px} />
        <PoseRow axis="Y" value={pose.py} />
        <PoseRow axis="Z" value={pose.pz} />
      </EESection>

      <EESection title="Quaternion (XYZW)">
        <QuatRow label="X" value={pose.qx} />
        <QuatRow label="Y" value={pose.qy} />
        <QuatRow label="Z" value={pose.qz} />
        <QuatRow label="W" value={pose.qw} />
      </EESection>

      <EESection title="Euler XYZ (°)">
        <PoseRow axis="X" value={pose.rx} unit="°" />
        <PoseRow axis="Y" value={pose.ry} unit="°" />
        <PoseRow axis="Z" value={pose.rz} unit="°" />
      </EESection>
    </div>
  )
}

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
  const armJointIndexByUuid = useManipulatorStore((s) => s.armJointIndexByUuid)
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
        const dhIndex = armJointIndexByUuid.get(joint.uuid)
        const isArmJoint = dhIndex !== undefined

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
              onChange={(deg: number) => {
                const angle = (deg * Math.PI) / 180
                if (isArmJoint) {
                  // Route through simulation so IK and FK stay in sync.
                  getEngine()?.world.enqueueCommand({
                    type: 'SET_JOINT',
                    robotId: FRANKA_ID,
                    index: dhIndex,
                    angle,
                  })
                }
                // Always update ManipulatorStore directly for immediate visual
                // response. In play mode the bridge will write the same value
                // once the engine processes the command — no conflict.
                setAngle(joint.uuid, angle)
              }}
              tooltip={{ formatter: (v) => `${(v ?? 0).toFixed(1)}°` }}
            />
          </div>
        )
      })}

      <Divider style={{ borderColor: '#333', margin: '12px 0' }} />

      <Button block onClick={resetAngles} style={{ fontSize: 12 }}>
        Reset All
      </Button>

      <Divider style={{ borderColor: '#2a2a3a', margin: '14px 0 10px' }} />

      <Title level={5} style={{ color: '#fff', marginBottom: 10, fontSize: 13 }}>
        End Effector
      </Title>

      <EndEffectorDisplay />
    </div>
  )
}
