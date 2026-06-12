import type { System } from './System'
import type { SimulationWorld } from '../world/SimulationWorld'

export class KinematicsSystem implements System {
  tick(world: SimulationWorld, dt: number): void {
    for (const robot of world.robots.values()) {
      robot.step(dt)
    }
  }
}
