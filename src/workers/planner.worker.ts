/**
 * Path Planner Worker — offloads RRT / PRM computation from the main thread.
 *
 * Future: expose via Comlink so PathPlannerSystem can call plan() asynchronously.
 */

import type { Pose3D }   from '@simulation/types/RobotState'
import type { Obstacle } from '@simulation/world/Obstacle'

export interface Waypoint {
  readonly jointAngles: readonly number[]
  readonly eePose: Pose3D
}

export function plan(
  _startAngles: readonly number[],
  _goalAngles:  readonly number[],
  _obstacles:   readonly Obstacle[],
): Waypoint[] {
  // TODO: implement RRTPlanner or PRMPlanner
  throw new Error('Path planner worker not yet implemented')
}
