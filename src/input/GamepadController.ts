import type { RawInput } from './KeyboardController'

const DEADZONE = 0.15

/** Analog input from a gamepad's left stick, normalised to [-1, 1]. */
export interface AnalogInput {
  /** Forward/backward velocity scale — positive = forward. */
  linear: number
  /** Left/right turn scale — positive = left (counter-clockwise). */
  angular: number
}

const ZERO_ANALOG: AnalogInput = { linear: 0, angular: 0 }

function applyDeadzone(v: number): number {
  return Math.abs(v) > DEADZONE ? v : 0
}

/**
 * Polls the Web Gamepad API on every `get input()` / `get analogInput()` call.
 * Standard mapping (gamepad.mapping === "standard"):
 *   axes[0] — left stick horizontal → angular (negative = left turn)
 *   axes[1] — left stick vertical   → linear  (negative = forward)
 */
export class GamepadController {
  private _connected = false

  private readonly _handlers = {
    connected: (e: GamepadEvent) => {
      if (e.gamepad.mapping === 'standard' || e.gamepad.mapping === '') {
        this._connected = true
      }
    },
    disconnected: () => {
      this._connected = false
    },
  }

  /** Boolean RawInput — forward/backward at full speed with deadzone gating. */
  get input(): Readonly<RawInput> {
    const a = this.analogInput
    return {
      forward:  a.linear  > DEADZONE,
      backward: a.linear  < -DEADZONE,
      left:     a.angular > DEADZONE,
      right:    a.angular < -DEADZONE,
    }
  }

  /** Analog input from the left stick in the range [-1, 1]. */
  get analogInput(): AnalogInput {
    if (!this._connected) return ZERO_ANALOG
    const gamepads = navigator.getGamepads()
    const gp = gamepads.find((g) => g !== null) ?? null
    if (!gp) return ZERO_ANALOG

    // Standard layout: axis[1] negative = up/forward, axis[0] positive = right
    const linear  =  applyDeadzone(-(gp.axes[1] ?? 0))
    const angular =  applyDeadzone(-(gp.axes[0] ?? 0))
    return { linear, angular }
  }

  mount(): void {
    window.addEventListener('gamepadconnected',    this._handlers.connected)
    window.addEventListener('gamepaddisconnected', this._handlers.disconnected)
    // Detect gamepads already connected before this hook mounted (e.g. page reload).
    if (navigator.getGamepads().some((g) => g !== null)) this._connected = true
  }

  unmount(): void {
    window.removeEventListener('gamepadconnected',    this._handlers.connected)
    window.removeEventListener('gamepaddisconnected', this._handlers.disconnected)
    this._connected = false
  }
}
