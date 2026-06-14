import { describe, it, expect } from 'vitest'
import { validateFrankaConfig, validateDiffDriveConfig } from '../validateRobotConfig'
import frankaRaw from '../robots/franka_panda.json'
import diffDriveRaw from '../robots/differential_drive.json'

// ── Franka config validation ──────────────────────────────────────────────────

describe('validateFrankaConfig', () => {
  it('accepts the bundled franka_panda.json without error', () => {
    expect(() => validateFrankaConfig(frankaRaw)).not.toThrow()
  })

  it('returns an object with the expected id', () => {
    const cfg = validateFrankaConfig(frankaRaw)
    expect(cfg.id).toBe('franka_panda')
  })

  it('returns dhParams with correct length', () => {
    const cfg = validateFrankaConfig(frankaRaw)
    expect(cfg.dhParams).toHaveLength(7)
  })

  it('returns jointLimits with same length as dhParams', () => {
    const cfg = validateFrankaConfig(frankaRaw)
    expect(cfg.jointLimits).toHaveLength(cfg.dhParams.length)
  })

  it('returns initialAngles within joint limits', () => {
    const cfg = validateFrankaConfig(frankaRaw)
    cfg.initialAngles.forEach((angle, i) => {
      const { min, max } = cfg.jointLimits[i]!
      expect(angle).toBeGreaterThanOrEqual(min)
      expect(angle).toBeLessThanOrEqual(max)
    })
  })

  it('throws when id is missing', () => {
    const bad = { ...frankaRaw, id: undefined }
    expect(() => validateFrankaConfig(bad)).toThrow(/id must be a non-empty string/)
  })

  it('throws when id is empty string', () => {
    expect(() => validateFrankaConfig({ ...frankaRaw, id: '' })).toThrow(/id must be a non-empty string/)
  })

  it('throws when dhParams is not an array', () => {
    expect(() => validateFrankaConfig({ ...frankaRaw, dhParams: null })).toThrow(/dhParams/)
  })

  it('throws when dhParams is empty', () => {
    expect(() => validateFrankaConfig({ ...frankaRaw, dhParams: [] })).toThrow(/dhParams/)
  })

  it('throws when a dhParam field is non-numeric', () => {
    const badDh = frankaRaw.dhParams.map((p, i) => i === 0 ? { ...p, a: 'bad' } : p)
    expect(() => validateFrankaConfig({ ...frankaRaw, dhParams: badDh })).toThrow(/dhParams\[0\]\.a/)
  })

  it('throws when a dhParam field is Infinity', () => {
    const badDh = frankaRaw.dhParams.map((p, i) => i === 0 ? { ...p, d: Infinity } : p)
    expect(() => validateFrankaConfig({ ...frankaRaw, dhParams: badDh })).toThrow(/dhParams\[0\]\.d/)
  })

  it('throws when jointLimits length mismatches dhParams', () => {
    expect(() =>
      validateFrankaConfig({ ...frankaRaw, jointLimits: frankaRaw.jointLimits.slice(0, 3) }),
    ).toThrow(/jointLimits length/)
  })

  it('throws when a jointLimit has min > max', () => {
    const badLimits = frankaRaw.jointLimits.map((l, i) =>
      i === 2 ? { min: 1.0, max: -1.0 } : l,
    )
    expect(() => validateFrankaConfig({ ...frankaRaw, jointLimits: badLimits })).toThrow(
      /jointLimits\[2\]\.min/,
    )
  })

  it('throws when initialAngles length mismatches dhParams', () => {
    expect(() =>
      validateFrankaConfig({ ...frankaRaw, initialAngles: [0, 0, 0] }),
    ).toThrow(/initialAngles length/)
  })

  it('throws when an initialAngle is outside joint limits', () => {
    const badAngles = [...frankaRaw.initialAngles]
    badAngles[0] = 100
    expect(() => validateFrankaConfig({ ...frankaRaw, initialAngles: badAngles })).toThrow(
      /initialAngles\[0\]/,
    )
  })

  it('throws when raw is null', () => {
    expect(() => validateFrankaConfig(null)).toThrow(/must be an object/)
  })

  it('throws when raw is a string', () => {
    expect(() => validateFrankaConfig('bad')).toThrow(/must be an object/)
  })
})

// ── DiffDrive config validation ───────────────────────────────────────────────

describe('validateDiffDriveConfig', () => {
  it('accepts the bundled differential_drive.json without error', () => {
    expect(() => validateDiffDriveConfig(diffDriveRaw)).not.toThrow()
  })

  it('returns an object with the expected id', () => {
    const cfg = validateDiffDriveConfig(diffDriveRaw)
    expect(cfg.id).toBe('diff_drive')
  })

  it('returns positive wheelBase', () => {
    expect(validateDiffDriveConfig(diffDriveRaw).wheelBase).toBeGreaterThan(0)
  })

  it('returns positive wheelRadius', () => {
    expect(validateDiffDriveConfig(diffDriveRaw).wheelRadius).toBeGreaterThan(0)
  })

  it('throws when id is missing', () => {
    expect(() => validateDiffDriveConfig({ ...diffDriveRaw, id: undefined })).toThrow(/id/)
  })

  it('throws when wheelBase is zero', () => {
    expect(() => validateDiffDriveConfig({ ...diffDriveRaw, wheelBase: 0 })).toThrow(/wheelBase/)
  })

  it('throws when wheelRadius is negative', () => {
    expect(() => validateDiffDriveConfig({ ...diffDriveRaw, wheelRadius: -0.1 })).toThrow(/wheelRadius/)
  })

  it('throws when maxLinearVel is non-numeric', () => {
    expect(() => validateDiffDriveConfig({ ...diffDriveRaw, maxLinearVel: 'fast' })).toThrow(/maxLinearVel/)
  })

  it('throws when maxAngularVel is NaN', () => {
    expect(() => validateDiffDriveConfig({ ...diffDriveRaw, maxAngularVel: NaN })).toThrow(/maxAngularVel/)
  })

  it('throws when raw is null', () => {
    expect(() => validateDiffDriveConfig(null)).toThrow(/must be an object/)
  })
})
