import { Typography, Switch, Select, Divider } from 'antd'
import { useShallow }        from 'zustand/react/shallow'
import { useSceneStore }     from '@store/sceneStore'
import { useSimulationStore } from '@store/simulationStore'
import { SimulationConfig }  from '@config/simulation'
import type { SpeedOption }  from '@config/simulation'
import type { CameraPreset } from '@store/sceneStore'

const { Title, Text } = Typography

const SPEED_OPTIONS = SimulationConfig.speedOptions.map((v) => ({
  label: `${v}×`,
  value: v,
}))

const CAMERA_OPTIONS: { label: string; value: CameraPreset }[] = [
  { label: 'Perspective', value: 'perspective' },
  { label: 'Top',         value: 'top' },
  { label: 'Front',       value: 'front' },
  { label: 'Side',        value: 'side' },
]

export function ConfigPanel() {
  const {
    showGrid, showCoordinateFrames, showTrajectory, showBoundingBoxes, cameraPreset,
    toggleGrid, toggleCoordinateFrames, toggleTrajectory, toggleBoundingBoxes, setCameraPreset,
  } = useSceneStore(
    useShallow((s) => ({
      showGrid:               s.showGrid,
      showCoordinateFrames:   s.showCoordinateFrames,
      showTrajectory:         s.showTrajectory,
      showBoundingBoxes:      s.showBoundingBoxes,
      cameraPreset:           s.cameraPreset,
      toggleGrid:             s.toggleGrid,
      toggleCoordinateFrames: s.toggleCoordinateFrames,
      toggleTrajectory:       s.toggleTrajectory,
      toggleBoundingBoxes:    s.toggleBoundingBoxes,
      setCameraPreset:        s.setCameraPreset,
    })),
  )

  const speed    = useSimulationStore((s) => s.speed)
  const setSpeed = useSimulationStore((s) => s.setSpeed)

  return (
    <div style={{ padding: '0 4px' }}>
      <Title level={5} style={{ color: '#fff', marginBottom: 12, fontSize: 13 }}>
        Scene Config
      </Title>

      <ToggleRow label="Grid"              checked={showGrid}              onChange={toggleGrid} />
      <ToggleRow label="Coord. frames"     checked={showCoordinateFrames}  onChange={toggleCoordinateFrames} />
      <ToggleRow label="Trajectory"        checked={showTrajectory}        onChange={toggleTrajectory} />
      <ToggleRow label="Bounding boxes"    checked={showBoundingBoxes}     onChange={toggleBoundingBoxes} />

      <Divider style={{ borderColor: '#333', margin: '12px 0' }} />

      <div style={{ marginBottom: 10 }}>
        <Text style={{ color: '#aaa', fontSize: 12, display: 'block', marginBottom: 6 }}>Camera</Text>
        <Select
          size="small"
          value={cameraPreset}
          options={CAMERA_OPTIONS}
          onChange={(v) => setCameraPreset(v as CameraPreset)}
          style={{ width: '100%' }}
        />
      </div>

      <div>
        <Text style={{ color: '#aaa', fontSize: 12, display: 'block', marginBottom: 6 }}>Sim Speed</Text>
        <Select
          size="small"
          value={speed}
          options={SPEED_OPTIONS}
          onChange={(v) => setSpeed(v as SpeedOption)}
          style={{ width: '100%' }}
        />
      </div>
    </div>
  )
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
      <Text style={{ color: '#ccc', fontSize: 12 }}>{label}</Text>
      <Switch size="small" checked={checked} onChange={onChange} />
    </div>
  )
}
