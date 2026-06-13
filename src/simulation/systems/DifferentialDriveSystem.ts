export interface DifferentialDriveConfig {
  /** Maximum forward/backward speed (m/s). Commands are clamped to ±this value. */
  maxLinearVel: number
  /** Maximum turn rate (rad/s). Commands are clamped to ±this value. */
  maxAngularVel: number
  /**
   * Acceleration ramp rate for linear velocity (m/s²).
   * How quickly v climbs toward targetV each second.
   * Also the deceleration rate when the target drops (key released → target = 0).
   */
  linearAccel: number
  /**
   * Acceleration ramp rate for angular velocity (rad/s²).
   * Same dual-use: ramps up when key pressed, ramps down when released.
   */
  angularAccel: number
}

/** Snapshot of the robot's full kinematic state at one instant in time. */
export interface RobotMotionState {
  /** World-X position in metres. */
  x: number
  /** World-Y position in metres. */
  y: number
  /**
   * Heading angle in radians, measured counter-clockwise from the +X world axis.
   * Normalised into [−π, π] after every tick.
   */
  theta: number
  /** Current linear (forward) velocity in m/s. Positive = forward. */
  v: number
  /** Current angular velocity in rad/s. Positive = counter-clockwise (left turn). */
  omega: number
}

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: DifferentialDriveConfig = {
  maxLinearVel:  2.0,  // m/s    — comfortable indoor robot top speed
  maxAngularVel: 2.5,  // rad/s  — ~143 °/s
  linearAccel:   4.0,  // m/s²   — reaches max speed in 0.5 s
  angularAccel:  5.0,  // rad/s² — reaches max turn in 0.5 s
}

const ZERO_STATE: RobotMotionState = { x: 0, y: 0, theta: 0, v: 0, omega: 0 }

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Clamps `value` into [min, max]. */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/**
 * Wraps an angle into [−π, π].
 * Prevents theta from growing without bound during long simulation runs.
 */
function wrapAngle(a: number): number {
  while (a >  Math.PI) a -= 2 * Math.PI
  while (a < -Math.PI) a += 2 * Math.PI
  return a
}

// ─── System ──────────────────────────────────────────────────────────────────

/**
 * Self-contained differential drive physics.
 *
 * Implements the unicycle kinematic model:
 *
 *   x     += v · cos(θ) · dt
 *   y     += v · sin(θ) · dt
 *   θ     += ω · dt
 *
 * Both v and ω are smoothly ramped toward their targets rather than jumping
 * instantly, producing realistic acceleration and deceleration.
 *
 * This class has no React or store dependencies — wire it up via useRobotMotion.
 */
export class DifferentialDriveSystem {
  private readonly cfg: DifferentialDriveConfig

  private _state: RobotMotionState = { ...ZERO_STATE }

  /** Desired linear velocity set by the caller (keyboard / joystick). */
  private _targetV = 0
  /** Desired angular velocity set by the caller. */
  private _targetOmega = 0

  constructor(cfg?: Partial<DifferentialDriveConfig>) {
    this.cfg = { ...DEFAULT_CONFIG, ...cfg }
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Set the desired (target) velocities for the next tick.
   *
   * @param v     Target linear velocity (m/s). Will be clamped to ±maxLinearVel.
   * @param omega Target angular velocity (rad/s). Will be clamped to ±maxAngularVel.
   *
   * Call this every frame before tick() — typically from a keyboard handler.
   * When no key is pressed pass (0, 0) and the ramp will decelerate naturally.
   */
  setTarget(v: number, omega: number): void {
    this._targetV     = clamp(v,     -this.cfg.maxLinearVel,  this.cfg.maxLinearVel)
    this._targetOmega = clamp(omega, -this.cfg.maxAngularVel, this.cfg.maxAngularVel)
  }

  /**
   * Advance the simulation by one time step.
   *
   * Step 1 — Acceleration ramp for v:
   *
   *   v += clamp(targetV − v, −linearAccel·dt, +linearAccel·dt)
   *
   *   The difference (targetV − v) is the "error" between where we are and where
   *   we want to be. We clamp how much we can close that gap in one frame:
   *   at most linearAccel·dt m/s. This means:
   *     • Key pressed  → v climbs toward targetV at linearAccel m/s²  (acceleration)
   *     • Key released → targetV = 0, v falls back to 0 at same rate  (deceleration)
   *
   * Step 2 — Same ramp for omega.
   *
   * Step 3 — Max-velocity clamp (redundant safety guard after ramp).
   *
   * Step 4 — Unicycle integration:
   *
   *   x += v · cos(θ) · dt
   *     cos(θ) is the X-component of the robot's unit heading vector.
   *     Multiplying by v gives the X-component of velocity.
   *     Multiplying by dt converts velocity to positional displacement.
   *
   *   y += v · sin(θ) · dt
   *     sin(θ) is the Y-component of the unit heading vector — same logic.
   *
   *   θ += ω · dt
   *     ω (rad/s) × dt (s) = Δθ (rad). Positive ω turns left (CCW).
   *
   * Step 5 — Wrap theta into [−π, π] to prevent float drift.
   *
   * @param dt  Elapsed time since the last frame, in seconds.
   *            Provided by useFrame's `delta` parameter — automatically
   *            frame-rate independent (60 fps → dt ≈ 0.0167, 30 fps → dt ≈ 0.033).
   * @returns   The new state snapshot (same object returned by getState()).
   */
  tick(dt: number): Readonly<RobotMotionState> {
    const { linearAccel, angularAccel, maxLinearVel, maxAngularVel } = this.cfg
    let { x, y, theta, v, omega } = this._state

    // Step 1 — Ramp v toward targetV ────────────────────────────────────────
    // Maximum velocity change allowed in this frame:
    const dvMax = linearAccel * dt
    // Move v toward target by at most dvMax (handles both accel and decel):
    v += clamp(this._targetV - v, -dvMax, dvMax)

    // Step 2 — Ramp omega toward targetOmega ────────────────────────────────
    const domegaMax = angularAccel * dt
    omega += clamp(this._targetOmega - omega, -domegaMax, domegaMax)

    // Step 3 — Hard clamp (safety guard) ────────────────────────────────────
    v     = clamp(v,     -maxLinearVel,  maxLinearVel)
    omega = clamp(omega, -maxAngularVel, maxAngularVel)

    // Step 4 — Unicycle integration ─────────────────────────────────────────
    //
    // x += v · cos(θ) · dt
    //   cos(θ): how much of the robot's forward motion lands on the world X axis.
    //   At θ=0 the robot faces +X → cos(0)=1 → full displacement goes to x.
    //   At θ=π/2 the robot faces +Y → cos(π/2)=0 → no x displacement.
    x += v * Math.cos(theta) * dt

    // y += v · sin(θ) · dt
    //   sin(θ): how much forward motion lands on the world Y axis.
    //   At θ=π/2 the robot faces +Y → sin(π/2)=1 → full displacement goes to y.
    y += v * Math.sin(theta) * dt

    // θ += ω · dt
    //   Angular velocity integrated over dt gives the incremental heading change.
    //   Positive ω → increasing θ → left (CCW) turn.
    theta += omega * dt

    // Step 5 — Normalise theta ───────────────────────────────────────────────
    theta = wrapAngle(theta)

    this._state = { x, y, theta, v, omega }
    return this._state
  }

  /** Returns the current state without advancing the simulation. */
  getState(): Readonly<RobotMotionState> {
    return this._state
  }

  /** Resets position, heading, and all velocities back to zero. */
  reset(): void {
    this._targetV     = 0
    this._targetOmega = 0
    this._state       = { ...ZERO_STATE }
  }
}
