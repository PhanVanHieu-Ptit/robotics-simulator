import type { RawInput } from './KeyboardController'
import type { Command } from '@simulation/types'
import diffDriveConfig from '@config/robots/differential_drive.json'

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
