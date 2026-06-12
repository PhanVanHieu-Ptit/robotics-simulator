export type BoundingVolumeType = 'sphere' | 'aabb' | 'obb'

export interface Obstacle {
  readonly id: string
  readonly position: readonly [number, number, number]
  readonly bvType: BoundingVolumeType
  readonly radius?: number                             // for sphere
  readonly halfExtents?: readonly [number, number, number] // for aabb/obb
}
