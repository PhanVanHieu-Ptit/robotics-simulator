import { useRobotStore } from '../robotStore'

/** Returns true if any joint is within 0.05 rad of its limit */
export function useJointLimitWarnings(
  limits: readonly { min: number; max: number }[],
): boolean[] {
  const jointAngles = useRobotStore((s) => s.jointAngles)
  return limits.map((lim, i) => {
    const angle = jointAngles[i] ?? 0
    return angle < lim.min + 0.05 || angle > lim.max - 0.05
  })
}

/** End-effector position as a display string */
export function useEEPositionLabel(): string {
  const pose = useRobotStore((s) => s.endEffectorPose)
  if (!pose) return '—'
  const [x, y, z] = pose.position
  return `(${x.toFixed(3)}, ${y.toFixed(3)}, ${z.toFixed(3)})`
}
