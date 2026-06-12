import type { System } from './System'
import type { SimulationWorld } from '../world/SimulationWorld'
import { SimulationConfig } from '@config/simulation'

export class TrajectorySystem implements System {
  tick(world: SimulationWorld, _dt: number): void {
    for (const robot of world.robots.values()) {
      const { position } = robot.state.endEffectorPose

      // Skip if position hasn't changed meaningfully (dead-band 0.001 m)
      const last = robot.trajectoryBuffer[robot.trajectoryBuffer.length - 1]
      if (last) {
        const dx = position[0] - last.position[0]
        const dy = position[1] - last.position[1]
        const dz = position[2] - last.position[2]
        if (dx * dx + dy * dy + dz * dz < 1e-6) continue
      }

      robot.trajectoryBuffer.push(robot.state.endEffectorPose)

      if (robot.trajectoryBuffer.length > SimulationConfig.maxTrajectoryLength) {
        robot.trajectoryBuffer.splice(0, robot.trajectoryBuffer.length - SimulationConfig.maxTrajectoryLength)
      }
    }
  }
}
