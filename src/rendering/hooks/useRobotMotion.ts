import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  DifferentialDriveSystem,
  type DifferentialDriveConfig,
  type RobotMotionState,
} from '@simulation/systems/DifferentialDriveSystem'
import { useRobotMotionStore } from '@store/robotMotionStore'

// ─── Options ─────────────────────────────────────────────────────────────────

export interface UseRobotMotionOptions {
  /**
   * Override any physics constants (maxLinearVel, linearAccel, etc.).
   * Merged with the system defaults — only specify what you want to change.
   */
  config?: Partial<DifferentialDriveConfig>
  /**
   * Target linear velocity while ArrowUp/ArrowDown is held (m/s).
   * Must not exceed config.maxLinearVel. Defaults to 1.5.
   */
  linearSpeed?: number
  /**
   * Target angular velocity while ArrowLeft/ArrowRight is held (rad/s).
   * Must not exceed config.maxAngularVel. Defaults to 2.0.
   */
  angularSpeed?: number
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_LINEAR_SPEED  = 1.5  // m/s   — matches InputMapper.LINEAR_SPEED
const DEFAULT_ANGULAR_SPEED = 2.0  // rad/s — matches InputMapper.ANGULAR_SPEED

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Wires Arrow-key input → DifferentialDriveSystem physics → useRobotMotionStore.
 *
 * Must be called inside an R3F <Canvas> component tree because it relies on
 * useFrame for delta-time. Mount it once at a high-level node (e.g. SceneRoot).
 *
 * ### Data flow each frame
 *
 *   keydown/keyup events
 *       ↓  (stored in plain refs — no React state, no re-renders)
 *   ArrowUp/Down/Left/Right boolean flags
 *       ↓
 *   targetV  = (up ? linearSpeed : 0) − (down ? linearSpeed : 0)
 *   targetOmega = (left ? angularSpeed : 0) − (right ? angularSpeed : 0)
 *       ↓
 *   system.setTarget(targetV, targetOmega)  ← desired velocities this frame
 *       ↓
 *   system.tick(delta)                      ← ramp + clamp + integrate
 *       ↓
 *   store.setMotionState(newState)          ← vanilla getState() call, no render trigger
 *
 * ### Why refs instead of React state for key flags?
 *   Storing key presses in useState would cause a re-render on every keydown/keyup.
 *   At 60 fps that's irrelevant, but a keydown during a render could stale-close
 *   over the frame loop. Refs are mutated synchronously and always read fresh inside
 *   useFrame — zero overhead, zero re-renders.
 *
 * ### Why vanilla store access inside useFrame?
 *   Calling useRobotMotionStore.getState() instead of the React hook version means
 *   the store update does NOT schedule an additional render. React 18 will batch the
 *   store's notifyListeners() with the frame's own commit, so subscribers still update
 *   — but we avoid double-rendering the frame.
 *
 * @returns A readonly snapshot of the current RobotMotionState.
 *          Useful for synchronous reads (e.g. placing a mesh directly in useFrame).
 *          For reactive UI reads, prefer the store: useRobotMotionStore((s) => s.x).
 */
export function useRobotMotion(options?: UseRobotMotionOptions): Readonly<RobotMotionState> {
  const linearSpeed  = options?.linearSpeed  ?? DEFAULT_LINEAR_SPEED
  const angularSpeed = options?.angularSpeed ?? DEFAULT_ANGULAR_SPEED

  // Stable physics system — recreated only if the hook unmounts/remounts.
  const systemRef = useRef<DifferentialDriveSystem | null>(null)
  if (systemRef.current === null) {
    systemRef.current = new DifferentialDriveSystem(options?.config)
  }

  // ── Key-state refs ─────────────────────────────────────────────────────────
  // Plain booleans in refs: mutated synchronously, read inside useFrame.
  // No React state → no re-renders from keyboard events.
  const upRef    = useRef(false)
  const downRef  = useRef(false)
  const leftRef  = useRef(false)
  const rightRef = useRef(false)

  // ── Keyboard listeners ─────────────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      switch (e.code) {
        case 'ArrowUp':    upRef.current    = true;  break
        case 'ArrowDown':  downRef.current  = true;  break
        case 'ArrowLeft':  leftRef.current  = true;  break
        case 'ArrowRight': rightRef.current = true;  break
      }
    }

    const onKeyUp = (e: KeyboardEvent): void => {
      switch (e.code) {
        case 'ArrowUp':    upRef.current    = false; break
        case 'ArrowDown':  downRef.current  = false; break
        case 'ArrowLeft':  leftRef.current  = false; break
        case 'ArrowRight': rightRef.current = false; break
      }
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup',   onKeyUp)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup',   onKeyUp)
      // Decelerate cleanly if the component unmounts while keys are held.
      systemRef.current?.reset()
    }
  }, [])

  // ── Physics loop (runs every R3F frame) ────────────────────────────────────
  useFrame((_state, delta) => {
    const system = systemRef.current
    if (system === null) return

    // Build target velocities from current key flags.
    //
    // targetV (linear):
    //   ArrowUp   → positive v (forward)
    //   ArrowDown → negative v (backward)
    //   Both or neither → 0 (decelerate)
    const targetV =
      (upRef.current    ? linearSpeed  : 0) -
      (downRef.current  ? linearSpeed  : 0)

    // targetOmega (angular):
    //   ArrowLeft  → positive ω (counter-clockwise, left turn)
    //   ArrowRight → negative ω (clockwise, right turn)
    const targetOmega =
      (leftRef.current  ? angularSpeed : 0) -
      (rightRef.current ? angularSpeed : 0)

    // Hand desired velocities to the system.
    // The system will ramp actual v/omega toward these targets in tick().
    system.setTarget(targetV, targetOmega)

    // Advance physics by delta seconds.
    //
    // delta is provided by R3F's useFrame and equals the wall-clock time elapsed
    // since the last rendered frame (seconds). This makes the simulation
    // frame-rate independent:
    //   • 60 fps → delta ≈ 0.0167 s  per tick
    //   • 30 fps → delta ≈ 0.0333 s  per tick
    // The unicycle equations (x += v·cos(θ)·dt, etc.) scale displacement by dt,
    // so a 30fps robot covers the same distance as a 60fps robot over the same
    // wall-clock interval.
    const newState = system.tick(delta)

    // Push to Zustand store via vanilla API (no extra render).
    useRobotMotionStore.getState().setMotionState(newState)
  })

  // Return a synchronous snapshot for callers that need it inside useFrame.
  return systemRef.current.getState()
}
