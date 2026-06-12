import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import { CameraController } from './CameraController'
import { Environment }      from './Environment'
import { FrankaArmMesh }    from '../robots/FrankaArm'
import { DiffDriveRobot }   from '../robots/DifferentialDriveRobot'
import { TrajectoryLine }   from '../overlays/TrajectoryLine'
import { CoordinateFrames } from '../overlays/CoordinateFrame'
import { useSimulationFrame } from '../hooks/useSimulationFrame'

function SimulationLoop() {
  useSimulationFrame()
  return null
}

export function SceneRoot() {
  return (
    <Canvas
      shadows
      camera={{ position: [3, 3, 3], fov: 50 }}
      gl={{ antialias: true }}
      style={{ background: '#0f0f14' }}
    >
      <Suspense fallback={null}>
        <SimulationLoop />
        <CameraController />
        <Environment />
        <DiffDriveRobot />
        <FrankaArmMesh />
        <TrajectoryLine robotId="franka_panda" />
        <CoordinateFrames />
      </Suspense>
    </Canvas>
  )
}
