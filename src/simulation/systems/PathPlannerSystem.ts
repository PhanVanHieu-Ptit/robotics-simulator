import type { System } from './System'
import type { SimulationWorld } from '../world/SimulationWorld'

/**
 * Stub — path planning not yet implemented.
 *
 * Future plan:
 *  1. Define a Planner interface: plan(start, goal, obstacles) → Waypoint[].
 *  2. Implement RRTPlanner / PRMPlanner behind that interface (OCP).
 *  3. Offload heavy computation to workers/planner.worker.ts via Comlink.
 *  4. On each tick, advance along the planned waypoint list and issue JointCommands.
 */
export class PathPlannerSystem implements System {
  tick(_world: SimulationWorld, _dt: number): void {
    // TODO: implement waypoint-following from planner output
  }
}
