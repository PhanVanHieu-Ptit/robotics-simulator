import type { SimulationWorld } from '../world/SimulationWorld'

export interface System {
  tick(world: SimulationWorld, dt: number): void
}
