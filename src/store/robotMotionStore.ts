import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

// ─── State shape ─────────────────────────────────────────────────────────────

interface MotionState {
  /** World-X position in metres. */
  x: number
  /** World-Y position in metres. */
  y: number
  /**
   * Heading angle in radians, measured counter-clockwise from the +X world axis.
   * Kept in [−π, π] by DifferentialDriveSystem.
   */
  theta: number
  /** Current linear (forward) velocity in m/s. Positive = forward. */
  v: number
  /** Current angular velocity in rad/s. Positive = counter-clockwise. */
  omega: number
}

// ─── Actions ─────────────────────────────────────────────────────────────────

interface MotionActions {
  /**
   * Replace the entire motion state in one atomic update.
   * Called every frame by useRobotMotion via vanilla getState() to avoid
   * triggering React renders inside the R3F useFrame loop.
   */
  setMotionState(state: MotionState): void
  /** Zero all fields — call on simulation reset. */
  reset(): void
}

// ─── Store ───────────────────────────────────────────────────────────────────

const INITIAL_STATE: MotionState = { x: 0, y: 0, theta: 0, v: 0, omega: 0 }

/**
 * Motion state for the differential drive robot.
 *
 * Updated every animation frame by useRobotMotion.
 * Subscribe with fine-grained selectors to avoid unnecessary re-renders:
 *
 *   const x = useRobotMotionStore((s) => s.x)
 *   const { v, omega } = useRobotMotionStore((s) => ({ v: s.v, omega: s.omega }))
 *
 * subscribeWithSelector lets non-React consumers (e.g. logging systems) watch
 * a specific field without subscribing to the whole store:
 *
 *   useRobotMotionStore.subscribe((s) => s.theta, (theta) => console.log(theta))
 */
export const useRobotMotionStore = create<MotionState & MotionActions>()(
  subscribeWithSelector((set) => ({
    ...INITIAL_STATE,

    setMotionState: (state) => set(state),

    reset: () => set(INITIAL_STATE),
  })),
)
