/**
 * Module-level Three.js node registry.
 *
 * Populated once per GLB load by registerNodes(). Read every frame by
 * applyAngles() inside useFrame (ManipulatorRenderer) and by
 * ForwardKinematicsSystem to access matrixWorld.
 *
 * Lives in rendering/ because it holds THREE.Object3D references — it must
 * never be imported by simulation/ code.
 */
import type * as THREE from 'three'

export type JointDescriptor = { readonly uuid: string; readonly name: string }

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
