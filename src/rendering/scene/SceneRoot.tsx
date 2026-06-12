import { Scene } from './Scene'
import { Environment } from './Environment'
import { FrankaArmMesh } from '../robots/FrankaArm'
import { DiffDriveRobot } from '../robots/DifferentialDriveRobot'
import { TrajectoryLine } from '../overlays/TrajectoryLine'
import { CoordinateFrames } from '../overlays/CoordinateFrame'
import { useSimulationFrame } from '../hooks/useSimulationFrame'

function SimulationLoop() {
  useSimulationFrame()
  return null
}

export function SceneRoot() {
  return (
    <Scene>
      <SimulationLoop />
      <Environment />
      <DiffDriveRobot />
      <FrankaArmMesh />
      <TrajectoryLine robotId="franka_panda" />
      <CoordinateFrames />
    </Scene>
  )
}
