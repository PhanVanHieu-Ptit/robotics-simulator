import type { System } from './System'
import type { SimulationWorld } from '../world/SimulationWorld'

export class InputSystem implements System {
  tick(world: SimulationWorld, _dt: number): void {
    const commands = world.flushCommands()

    for (const cmd of commands) {
      if (cmd.type === 'RESET') {
        for (const robot of world.robots.values()) {
          robot.reset()
        }
        continue
      }

      // Drive commands: targeted when robotId is set, otherwise broadcast to all robots
      if (cmd.type === 'DRIVE') {
        if (cmd.robotId !== undefined) {
          world.robots.get(cmd.robotId)?.applyCommand(cmd)
        } else {
          for (const robot of world.robots.values()) {
            robot.applyCommand(cmd)
          }
        }
      } else if ('robotId' in cmd) {
        const robot = world.robots.get(cmd.robotId)
        robot?.applyCommand(cmd)
      }
    }
  }
}
