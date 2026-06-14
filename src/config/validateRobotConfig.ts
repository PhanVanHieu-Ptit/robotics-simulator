import type { FrankaArmConfig } from '@simulation/robots/FrankaArm'
import type { DifferentialDriveConfig } from '@simulation/robots/DifferentialDrive'

function assert(condition: boolean, msg: string): asserts condition {
  if (!condition) throw new Error(`Robot config validation: ${msg}`)
}

function assertFiniteNumber(val: unknown, path: string): asserts val is number {
  assert(typeof val === 'number' && isFinite(val), `${path} must be a finite number (got ${JSON.stringify(val)})`)
}

/** Validates a Franka Panda JSON config and returns it as FrankaArmConfig. Throws on any violation. */
export function validateFrankaConfig(raw: unknown): FrankaArmConfig {
  assert(raw !== null && typeof raw === 'object', 'Franka config must be an object')
  const cfg = raw as Record<string, unknown>

  assert(typeof cfg['id'] === 'string' && (cfg['id'] as string).length > 0, 'id must be a non-empty string')

  const dhParams = cfg['dhParams']
  assert(Array.isArray(dhParams) && dhParams.length > 0, 'dhParams must be a non-empty array')
  for (let i = 0; i < dhParams.length; i++) {
    const p = dhParams[i] as Record<string, unknown>
    for (const field of ['a', 'd', 'alpha', 'thetaOffset']) {
      assertFiniteNumber(p[field], `dhParams[${i}].${field}`)
    }
  }

  const jointLimits = cfg['jointLimits']
  assert(Array.isArray(jointLimits), 'jointLimits must be an array')
  assert(
    jointLimits.length === dhParams.length,
    `jointLimits length (${jointLimits.length}) must equal dhParams length (${dhParams.length})`,
  )
  for (let i = 0; i < jointLimits.length; i++) {
    const l = jointLimits[i] as Record<string, unknown>
    assertFiniteNumber(l['min'], `jointLimits[${i}].min`)
    assertFiniteNumber(l['max'], `jointLimits[${i}].max`)
    assert(
      (l['min'] as number) <= (l['max'] as number),
      `jointLimits[${i}].min (${l['min']}) must be ≤ max (${l['max']})`,
    )
  }

  const initialAngles = cfg['initialAngles']
  assert(Array.isArray(initialAngles), 'initialAngles must be an array')
  assert(
    initialAngles.length === dhParams.length,
    `initialAngles length (${initialAngles.length}) must equal dhParams length (${dhParams.length})`,
  )
  for (let i = 0; i < initialAngles.length; i++) {
    assertFiniteNumber(initialAngles[i], `initialAngles[${i}]`)
    const { min, max } = jointLimits[i] as { min: number; max: number }
    const angle = initialAngles[i] as number
    assert(
      angle >= min && angle <= max,
      `initialAngles[${i}] = ${angle} is outside joint limits [${min}, ${max}]`,
    )
  }

  return cfg as unknown as FrankaArmConfig
}

/** Validates a DiffDrive JSON config and returns it as DifferentialDriveConfig. Throws on any violation. */
export function validateDiffDriveConfig(raw: unknown): DifferentialDriveConfig {
  assert(raw !== null && typeof raw === 'object', 'DiffDrive config must be an object')
  const cfg = raw as Record<string, unknown>

  assert(typeof cfg['id'] === 'string' && (cfg['id'] as string).length > 0, 'id must be a non-empty string')

  for (const field of ['wheelBase', 'wheelRadius', 'maxLinearVel', 'maxAngularVel']) {
    assertFiniteNumber(cfg[field], field)
    assert((cfg[field] as number) > 0, `${field} must be positive (got ${cfg[field]})`)
  }

  return cfg as unknown as DifferentialDriveConfig
}
