import type { WorldSnapshot } from '../types/WorldSnapshot'
import type { System } from '../systems/System'
import type { SimulationClock } from './SimulationClock'
import type { SimulationWorld } from '../world/SimulationWorld'

export class SimulationEngine {
  constructor(
    public readonly world: SimulationWorld,
    public readonly clock: SimulationClock,
    private readonly systems: readonly System[],
    private readonly onSnapshot: (snapshot: WorldSnapshot) => void,
  ) {}

  /**
   * Advance simulation by one step.
   * @param rawDelta  Wall-clock delta in seconds (from R3F useFrame).
   *                  When undefined, uses clock.fixedDt (for manual stepping).
   */
  tick(rawDelta?: number): void {
    const wallStart = performance.now()
    const dt = rawDelta !== undefined ? this.clock.advance(rawDelta) : this.clock.fixedDt

    for (const system of this.systems) {
      system.tick(this.world, dt)
    }

    const frameTime = performance.now() - wallStart

    this.onSnapshot({
      simTime: this.clock.simTime,
      frameTime,
      robots: this.world.getRobotSnapshots(),
      trajectories: this.world.getTrajectories(),
    })
  }

  step(): void {
    this.tick(undefined)
  }

  reset(): void {
    this.world.reset()
    this.clock.reset()
  }
}
