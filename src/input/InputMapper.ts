import type { RawInput } from './KeyboardController'
import type { AnalogInput } from './GamepadController'
import type { Command } from '@simulation/types'
import diffDriveConfig from '@config/robots/differential_drive.json'

export type { AnalogInput }

const LINEAR_SPEED  = diffDriveConfig.maxLinearVel
const ANGULAR_SPEED = diffDriveConfig.maxAngularVel

export function mapInputToCommands(input: Readonly<RawInput>): Command[] {
  const linear =
    (input.forward  ? LINEAR_SPEED  : 0) -
    (input.backward ? LINEAR_SPEED  : 0)

  const angular =
    (input.left  ? ANGULAR_SPEED : 0) -
    (input.right ? ANGULAR_SPEED : 0)

  if (linear === 0 && angular === 0) return []

  return [{ type: 'DRIVE', linear, angular }]
}

/**
 * Map analog gamepad input (axes in [-1, 1]) to a DRIVE command scaled by
 * the robot's configured max velocities.
 */
export function mapAnalogToCommands(input: AnalogInput): Command[] {
  const linear  = input.linear  * LINEAR_SPEED
  const angular = input.angular * ANGULAR_SPEED

  if (linear === 0 && angular === 0) return []

  return [{ type: 'DRIVE', linear, angular }]
}
