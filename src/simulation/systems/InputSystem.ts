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

      // Drive commands go to all mobile robots; joint commands are targeted by robotId
      if (cmd.type === 'DRIVE') {
        for (const robot of world.robots.values()) {
          robot.applyCommand(cmd)
        }
      } else if ('robotId' in cmd) {
        const robot = world.robots.get(cmd.robotId)
        robot?.applyCommand(cmd)
      }
    }
  }
}
