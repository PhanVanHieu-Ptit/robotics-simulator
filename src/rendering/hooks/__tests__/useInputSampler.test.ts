import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mapInputToCommands, mapAnalogToCommands } from '@input/InputMapper'
import type { RawInput } from '@input/KeyboardController'
import type { AnalogInput } from '@input/GamepadController'

// These tests verify the input→command mapping logic that useInputSampler
// delegates to — without needing to mount an R3F canvas.

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('mapInputToCommands (keyboard → DRIVE)', () => {
  it('no keys pressed → empty array (no stop command emitted)', () => {
    const input: RawInput = { forward: false, backward: false, left: false, right: false }
    expect(mapInputToCommands(input)).toHaveLength(0)
  })

  it('forward key → positive linear, zero angular', () => {
    const input: RawInput = { forward: true, backward: false, left: false, right: false }
    const [cmd] = mapInputToCommands(input)
    expect(cmd?.type).toBe('DRIVE')
    expect((cmd as { type: 'DRIVE'; linear: number; angular: number }).linear).toBeGreaterThan(0)
    expect((cmd as { type: 'DRIVE'; linear: number; angular: number }).angular).toBe(0)
  })

  it('backward key → negative linear', () => {
    const input: RawInput = { forward: false, backward: true, left: false, right: false }
    const [cmd] = mapInputToCommands(input)
    expect((cmd as { type: 'DRIVE'; linear: number; angular: number }).linear).toBeLessThan(0)
  })

  it('left key → positive angular', () => {
    const input: RawInput = { forward: false, backward: false, left: true, right: false }
    const [cmd] = mapInputToCommands(input)
    expect((cmd as { type: 'DRIVE'; linear: number; angular: number }).angular).toBeGreaterThan(0)
  })

  it('right key → negative angular', () => {
    const input: RawInput = { forward: false, backward: false, left: false, right: true }
    const [cmd] = mapInputToCommands(input)
    expect((cmd as { type: 'DRIVE'; linear: number; angular: number }).angular).toBeLessThan(0)
  })

  it('forward + backward → zero linear (cancel out), no command emitted', () => {
    const input: RawInput = { forward: true, backward: true, left: false, right: false }
    expect(mapInputToCommands(input)).toHaveLength(0)
  })
})

describe('mapAnalogToCommands (gamepad → DRIVE)', () => {
  it('zero analog → empty array', () => {
    const input: AnalogInput = { linear: 0, angular: 0 }
    expect(mapAnalogToCommands(input)).toHaveLength(0)
  })

  it('half-stick forward → positive linear proportional to LINEAR_SPEED', () => {
    const input: AnalogInput = { linear: 0.5, angular: 0 }
    const [cmd] = mapAnalogToCommands(input)
    expect((cmd as { type: 'DRIVE'; linear: number; angular: number }).linear).toBeGreaterThan(0)
    expect((cmd as { type: 'DRIVE'; linear: number; angular: number }).angular).toBe(0)
  })

  it('full negative angular → left turn at max speed', () => {
    const input: AnalogInput = { linear: 0, angular: 1 }
    const [cmd] = mapAnalogToCommands(input)
    expect((cmd as { type: 'DRIVE'; linear: number; angular: number }).angular).toBeGreaterThan(0)
  })

  it('analog command type is DRIVE', () => {
    const input: AnalogInput = { linear: 0.8, angular: -0.3 }
    const [cmd] = mapAnalogToCommands(input)
    expect(cmd?.type).toBe('DRIVE')
  })
})
