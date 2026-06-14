import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GamepadController } from '../GamepadController'
import { mapAnalogToCommands } from '../InputMapper'
import diffDriveConfig from '@config/robots/differential_drive.json'

const LINEAR_SPEED  = diffDriveConfig.maxLinearVel
const ANGULAR_SPEED = diffDriveConfig.maxAngularVel

/** Build a minimal Gamepad stub matching the standard mapping layout. */
function makeGamepad(axes: number[] = [0, 0, 0, 0]): Gamepad {
  return {
    axes,
    buttons: [],
    connected: true,
    id: 'Test Gamepad',
    index: 0,
    mapping: 'standard',
    timestamp: 0,
    hapticActuators: [],
    vibrationActuator: null,
  } as unknown as Gamepad
}

/** jsdom doesn't ship getGamepads — define it once so vi.spyOn can target it. */
function stubGetGamepads(returnValue: (Gamepad | null)[]) {
  Object.defineProperty(navigator, 'getGamepads', {
    configurable: true,
    writable: true,
    value: vi.fn().mockReturnValue(returnValue),
  })
}

// ─── GamepadController ────────────────────────────────────────────────────────

describe('GamepadController', () => {
  let controller: GamepadController

  beforeEach(() => {
    controller = new GamepadController()
    // Default: no gamepad connected.
    stubGetGamepads([null, null, null, null])
  })

  it('analogInput returns zero when no gamepad is connected', () => {
    const a = controller.analogInput
    expect(a.linear).toBe(0)
    expect(a.angular).toBe(0)
  })

  it('input returns all-false when no gamepad is connected', () => {
    const i = controller.input
    expect(i.forward).toBe(false)
    expect(i.backward).toBe(false)
    expect(i.left).toBe(false)
    expect(i.right).toBe(false)
  })

  it('analogInput returns zero after mount when no gamepad present', () => {
    controller.mount()
    const a = controller.analogInput
    expect(a.linear).toBe(0)
    expect(a.angular).toBe(0)
    controller.unmount()
  })

  describe('with a connected gamepad', () => {
    beforeEach(() => {
      controller.mount()
      // Simulate gamepadconnected event to set _connected = true.
      window.dispatchEvent(Object.assign(new Event('gamepadconnected'), {
        gamepad: makeGamepad(),
      }) as unknown as GamepadEvent)
    })

    it('forward stick (axis[1] = -1) maps to linear = 1 after deadzone', () => {
      stubGetGamepads([makeGamepad([0, -1]), null, null, null])
      const a = controller.analogInput
      expect(a.linear).toBeCloseTo(1, 10)
      expect(a.angular).toBeCloseTo(0, 10)
    })

    it('backward stick (axis[1] = +1) maps to linear = -1', () => {
      stubGetGamepads([makeGamepad([0, 1]), null, null, null])
      expect(controller.analogInput.linear).toBeCloseTo(-1, 10)
    })

    it('left stick (axis[0] = -1) maps to angular = +1', () => {
      stubGetGamepads([makeGamepad([-1, 0]), null, null, null])
      expect(controller.analogInput.angular).toBeCloseTo(1, 10)
    })

    it('right stick (axis[0] = +1) maps to angular = -1', () => {
      stubGetGamepads([makeGamepad([1, 0]), null, null, null])
      expect(controller.analogInput.angular).toBeCloseTo(-1, 10)
    })

    it('axes within deadzone (0.1) map to zero', () => {
      stubGetGamepads([makeGamepad([0.1, 0.1]), null, null, null])
      const a = controller.analogInput
      expect(a.linear).toBe(0)
      expect(a.angular).toBe(0)
    })

    it('full stick forward triggers input.forward = true', () => {
      stubGetGamepads([makeGamepad([0, -1]), null, null, null])
      expect(controller.input.forward).toBe(true)
      expect(controller.input.backward).toBe(false)
    })
  })
})

// ─── mapAnalogToCommands ──────────────────────────────────────────────────────

describe('mapAnalogToCommands', () => {
  it('zero input returns empty array', () => {
    expect(mapAnalogToCommands({ linear: 0, angular: 0 })).toHaveLength(0)
  })

  it('full forward (linear=1) scales to LINEAR_SPEED', () => {
    const [cmd] = mapAnalogToCommands({ linear: 1, angular: 0 })
    expect(cmd).toMatchObject({ type: 'DRIVE', linear: LINEAR_SPEED, angular: 0 })
  })

  it('full backward (linear=-1) scales to -LINEAR_SPEED', () => {
    const [cmd] = mapAnalogToCommands({ linear: -1, angular: 0 })
    expect(cmd).toMatchObject({ type: 'DRIVE', linear: -LINEAR_SPEED, angular: 0 })
  })

  it('half left (angular=0.5) scales to 0.5 * ANGULAR_SPEED', () => {
    const [cmd] = mapAnalogToCommands({ linear: 0, angular: 0.5 })
    expect(cmd).toMatchObject({ type: 'DRIVE', linear: 0, angular: 0.5 * ANGULAR_SPEED })
  })

  it('produces exactly one command', () => {
    expect(mapAnalogToCommands({ linear: 0.7, angular: -0.3 })).toHaveLength(1)
  })
})
