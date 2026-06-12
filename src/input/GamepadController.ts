import type { RawInput } from './KeyboardController'

/**
 * Stub — Gamepad API controller not yet implemented.
 *
 * Future: poll navigator.getGamepads() on each frame, map axis[0/1] to
 * linear/angular velocity, pass through InputMapper.
 */
export class GamepadController {
  get input(): Readonly<RawInput> {
    return { forward: false, backward: false, left: false, right: false }
  }

  mount(): void { /* TODO */ }
  unmount(): void { /* TODO */ }
}
