import { describe, it, expect } from 'vitest'
import { mapInputToCommands } from '../InputMapper'
import type { RawInput } from '../KeyboardController'

const OFF: RawInput = { forward: false, backward: false, left: false, right: false }

const LINEAR_SPEED  = 1.5 // must match InputMapper.ts constant
const ANGULAR_SPEED = 2.0 // must match InputMapper.ts constant

describe('mapInputToCommands', () => {
  // ── no movement ──────────────────────────────────────────────────────────

  it('all false → empty array (no command)', () => {
    expect(mapInputToCommands(OFF)).toHaveLength(0)
  })

  // ── linear axis ───────────────────────────────────────────────────────────

  it('forward: produces DRIVE with linear = +LINEAR_SPEED, angular = 0', () => {
    const cmds = mapInputToCommands({ ...OFF, forward: true })
    expect(cmds).toHaveLength(1)
    expect(cmds[0]).toMatchObject({ type: 'DRIVE', linear: LINEAR_SPEED, angular: 0 })
  })

  it('backward: produces DRIVE with linear = -LINEAR_SPEED, angular = 0', () => {
    const cmds = mapInputToCommands({ ...OFF, backward: true })
    expect(cmds).toHaveLength(1)
    expect(cmds[0]).toMatchObject({ type: 'DRIVE', linear: -LINEAR_SPEED, angular: 0 })
  })

  it('forward + backward simultaneously: net linear = 0, but angular still emitted if nonzero', () => {
    // linear cancels to 0, angular is 0 → no command
    const cmds = mapInputToCommands({ ...OFF, forward: true, backward: true })
    expect(cmds).toHaveLength(0)
  })

  it('forward + backward + left: linear=0 but angular>0, produces command', () => {
    const cmds = mapInputToCommands({ forward: true, backward: true, left: true, right: false })
    expect(cmds).toHaveLength(1)
    expect(cmds[0]).toMatchObject({ type: 'DRIVE', linear: 0, angular: ANGULAR_SPEED })
  })

  // ── angular axis ──────────────────────────────────────────────────────────

  it('left: produces DRIVE with angular = +ANGULAR_SPEED, linear = 0', () => {
    const cmds = mapInputToCommands({ ...OFF, left: true })
    expect(cmds).toHaveLength(1)
    expect(cmds[0]).toMatchObject({ type: 'DRIVE', linear: 0, angular: ANGULAR_SPEED })
  })

  it('right: produces DRIVE with angular = -ANGULAR_SPEED, linear = 0', () => {
    const cmds = mapInputToCommands({ ...OFF, right: true })
    expect(cmds).toHaveLength(1)
    expect(cmds[0]).toMatchObject({ type: 'DRIVE', linear: 0, angular: -ANGULAR_SPEED })
  })

  it('left + right simultaneously: net angular = 0, no command', () => {
    const cmds = mapInputToCommands({ ...OFF, left: true, right: true })
    expect(cmds).toHaveLength(0)
  })

  // ── combined ──────────────────────────────────────────────────────────────

  it('forward + left: both linear and angular positive', () => {
    const cmds = mapInputToCommands({ ...OFF, forward: true, left: true })
    expect(cmds).toHaveLength(1)
    expect(cmds[0]).toMatchObject({ type: 'DRIVE', linear: LINEAR_SPEED, angular: ANGULAR_SPEED })
  })

  it('backward + right: linear negative, angular negative', () => {
    const cmds = mapInputToCommands({ ...OFF, backward: true, right: true })
    expect(cmds).toHaveLength(1)
    expect(cmds[0]).toMatchObject({ type: 'DRIVE', linear: -LINEAR_SPEED, angular: -ANGULAR_SPEED })
  })

  // ── output type ───────────────────────────────────────────────────────────

  it('returned command has type "DRIVE"', () => {
    const [cmd] = mapInputToCommands({ ...OFF, forward: true })
    expect(cmd!.type).toBe('DRIVE')
  })

  it('returns exactly one command per invocation (never more)', () => {
    const cmds = mapInputToCommands({ forward: true, backward: false, left: true, right: false })
    expect(cmds.length).toBeLessThanOrEqual(1)
  })
})
