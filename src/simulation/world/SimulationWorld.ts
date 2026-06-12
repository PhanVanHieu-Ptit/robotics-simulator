import type { Command } from '../types/Command'
import type { Pose3D, RobotState } from '../types/RobotState'
import type { Robot } from '../robots/Robot'
import type { Obstacle } from './Obstacle'

export class SimulationWorld {
  readonly robots = new Map<string, Robot>()
  readonly obstacles = new Map<string, Obstacle>()

  private commandQueue: Command[] = []

  addRobot(robot: Robot): void {
    this.robots.set(robot.id, robot)
  }

  removeRobot(id: string): void {
    this.robots.delete(id)
  }

  addObstacle(obstacle: Obstacle): void {
    this.obstacles.set(obstacle.id, obstacle)
  }

  enqueueCommand(cmd: Command): void {
    this.commandQueue.push(cmd)
  }

  /** Drains and returns all queued commands. */
  flushCommands(): Command[] {
    const cmds = this.commandQueue
    this.commandQueue = []
    return cmds
  }

  getRobotSnapshots(): Record<string, RobotState> {
    const result: Record<string, RobotState> = {}
    for (const [id, robot] of this.robots) {
      result[id] = robot.state
    }
    return result
  }

  getTrajectories(): Record<string, readonly Pose3D[]> {
    const result: Record<string, readonly Pose3D[]> = {}
    for (const [id, robot] of this.robots) {
      result[id] = robot.trajectoryBuffer
    }
    return result
  }

  reset(): void {
    this.commandQueue = []
    for (const robot of this.robots.values()) {
      robot.reset()
    }
  }
}
