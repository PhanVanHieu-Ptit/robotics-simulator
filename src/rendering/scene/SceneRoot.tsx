import { Scene } from './Scene'
import { Environment } from './Environment'
import { RobotLoader } from '../robots/RobotLoader'
import { ROBOT_MODELS } from '../hooks/useRobotLoader'
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
      <RobotLoader config={ROBOT_MODELS.ridgeback_franka} />
      <TrajectoryLine robotId="franka_panda" />
      <CoordinateFrames />
    </Scene>
  )
}
