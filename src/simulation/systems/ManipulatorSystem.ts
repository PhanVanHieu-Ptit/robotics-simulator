import type * as THREE from 'three'
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { HierarchyNode } from '@rendering/utils/traverseHierarchy'

export type JointDescriptor = Pick<HierarchyNode, 'uuid' | 'name'>

// Module-level registry — D1 singleton pattern, never in React state.
// Populated once by registerNodes() during GLB onLoad.
// Read every frame by applyAngles() inside useFrame.
const nodeMap = new Map<string, THREE.Object3D>()

/** Expose the node registry for ForwardKinematicsSystem to read matrixWorld. */
export function getNodeMap(): ReadonlyMap<string, THREE.Object3D> {
  return nodeMap
}

export function registerNodes(scene: THREE.Object3D, joints: JointDescriptor[]): void {
  nodeMap.clear()
  const uuidSet = new Set(joints.map((j) => j.uuid))
  scene.traverse((obj) => {
    if (uuidSet.has(obj.uuid)) nodeMap.set(obj.uuid, obj)
  })
}

export function applyAngles(angles: Record<string, number>): void {
  for (const [uuid, angle] of Object.entries(angles)) {
    nodeMap.get(uuid)?.rotation.set(0, angle, 0)
  }
}

interface ManipulatorState {
  joints: JointDescriptor[]
  angles: Record<string, number>
}

interface ManipulatorActions {
  setJoints: (joints: JointDescriptor[]) => void
  setAngle: (uuid: string, angle: number) => void
  resetAngles: () => void
}

export const useManipulatorStore = create<ManipulatorState & ManipulatorActions>()(
  subscribeWithSelector((set) => ({
    joints: [],
    angles: {},

    setJoints: (joints) =>
      set({
        joints,
        angles: Object.fromEntries(joints.map((j) => [j.uuid, 0])),
      }),

    setAngle: (uuid, angle) =>
      set((s) => ({ angles: { ...s.angles, [uuid]: angle } })),

    resetAngles: () =>
      set((s) => ({
        angles: Object.fromEntries(s.joints.map((j) => [j.uuid, 0])),
      })),
  })),
)
