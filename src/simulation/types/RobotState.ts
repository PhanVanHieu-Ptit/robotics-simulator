export interface JointState {
  readonly angle: number    // radians
  readonly velocity: number // rad/s
  readonly torque: number   // Nm
}

export interface Pose2D {
  readonly x: number
  readonly y: number
  readonly theta: number // radians, yaw
}

export interface Pose3D {
  readonly position: readonly [number, number, number]       // xyz metres
  readonly quaternion: readonly [number, number, number, number] // xyzw
}

/** Row-major 4×4 homogeneous transform, 16 elements */
export type Mat4 = readonly [
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
]

export interface RobotState {
  readonly id: string
  readonly jointStates: readonly JointState[]
  readonly basePose: Pose2D
  readonly endEffectorPose: Pose3D
  readonly dhTransforms: readonly Mat4[] // cumulative FK transforms, one per joint
}
