/**
 * ForwardKinematicsSystem.ts
 *
 * Computes the end-effector pose by reading Three.js world matrices
 * from the loaded GLB joint hierarchy.
 *
 * ═══════════════════════════════════════════════════════════════════════
 *  THEORY: Why Three.js hierarchy naturally performs Forward Kinematics
 * ═══════════════════════════════════════════════════════════════════════
 *
 *  LOCAL TRANSFORM  (node.matrix)
 *  ──────────────────────────────
 *  Every THREE.Object3D stores a 4×4 homogeneous matrix encoding its
 *  pose relative to its parent frame:
 *
 *    M_local = T(position) · R(quaternion) · S(scale)
 *
 *  When you write node.rotation.y = θ, Three.js marks the node dirty
 *  and rebuilds node.matrix. This injects the joint variable θ into
 *  the kinematic chain — exactly what DH notation calls "joint angle".
 *
 *  WORLD TRANSFORM  (node.matrixWorld)
 *  ─────────────────────────────────────
 *  matrixWorld accumulates every ancestor local matrix from the scene
 *  root down to this node:
 *
 *    M_world(n) = M_world(root) · M_local(1) · M_local(2) · … · M_local(n)
 *
 *  Three.js computes it one level at a time:
 *    node.matrixWorld = parent.matrixWorld × node.matrix
 *
 *  MATRIX PROPAGATION  (the FK product)
 *  ─────────────────────────────────────
 *  Each frame, Three.js walks the scene graph top-down composing:
 *
 *    root → link₀ → link₁ → … → linkₙ (end effector)
 *           joint₀   joint₁        jointₙ
 *
 *    EE.matrixWorld = T₀ · T₁ · T₂ · … · Tₙ
 *
 *  This is the standard FK chain — identical to the DH product formula.
 *
 *  WHY No DH Parameters Are Needed
 *  ─────────────────────────────────
 *  The GLB file encodes the kinematic geometry as rest-pose local
 *  transforms:
 *    • link offsets    → node.position  (translation in M_local)
 *    • joint twist/α   → node.rotation  (rotation rest pose)
 *
 *  applyAngles() sets rotation on each joint node → dirtying M_local.
 *  Calling eeNode.updateWorldMatrix(true, false) forces Three.js to
 *  walk root→EE and recompute the matrix product. Decomposing the
 *  resulting matrixWorld gives T_base→EE with no extra math.
 *  Three.js IS the FK solver; we just read the answer.
 *
 *  updateWorldMatrix(updateParents, updateChildren):
 *    true,  false = walk up to root first, then recompute down to
 *                   this node only (don't waste work on EE's children)
 * ═══════════════════════════════════════════════════════════════════════
 */

import * as THREE from 'three'
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { getNodeMap } from './ManipulatorSystem'
import type { HierarchyNode } from '@rendering/utils/traverseHierarchy'

// ─── End-Effector Node Registration ────────────────────────────────────────

let _eeNodeUuid: string | null = null

export function getEENodeUuid(): string | null {
  return _eeNodeUuid
}

/**
 * Identify and register the end-effector from the detected joint list.
 *
 * Strategy: the EE is the leaf joint deepest in the kinematic tree —
 * a joint whose direct children are all non-joint (mesh/geometry) nodes.
 * This naturally selects the last revolute joint at the tip of the arm.
 *
 * Call once per GLB load, after traverseHierarchy() returns candidates.
 */
export function initFK(jointCandidates: readonly HierarchyNode[]): void {
  _eeNodeUuid = null
  if (jointCandidates.length === 0) return

  const jointUuids = new Set(jointCandidates.map(j => j.uuid))

  // Leaf: a joint whose children are NOT in the joint set
  const leaves = jointCandidates.filter(j =>
    j.childUuids.every(uid => !jointUuids.has(uid))
  )

  // Use all joints as fallback if the tree has no detectable leaves
  const candidates = leaves.length > 0 ? leaves : [...jointCandidates]

  // Deepest = physical end of the arm
  candidates.sort((a, b) => b.depth - a.depth)
  _eeNodeUuid = candidates[0]!.uuid

  // Reset ready flag so the display panel shows "waiting" until first pose
  useFKStore.getState()._setReady(false)
}

// ─── FK Display Store ────────────────────────────────────────────────────────
//
// Throttled: pose fields are written at ~10 fps (every DISPLAY_STRIDE frames)
// so React re-renders don't saturate at 60 fps. The R3F visualization group
// is updated imperatively every frame in computeFK() — no store involved there.

export interface EEPose {
  px: number; py: number; pz: number              // position, metres
  qx: number; qy: number; qz: number; qw: number  // unit quaternion (XYZW)
  rx: number; ry: number; rz: number              // Euler XYZ order, degrees
}

interface FKState {
  pose: EEPose
  isReady: boolean
}

interface FKActions {
  _setPose: (pose: EEPose) => void
  _setReady: (ready: boolean) => void
}

const IDENTITY_POSE: EEPose = {
  px: 0, py: 0, pz: 0,
  qx: 0, qy: 0, qz: 0, qw: 1,
  rx: 0, ry: 0, rz: 0,
}

export const useFKStore = create<FKState & FKActions>()(
  subscribeWithSelector((set) => ({
    pose: IDENTITY_POSE,
    isReady: false,
    _setPose: (pose) => set({ pose }),
    _setReady: (isReady) => set({ isReady }),
  }))
)

// ─── Scratch objects — allocated once, reused every frame (zero GC) ────────

const _pos   = new THREE.Vector3()
const _quat  = new THREE.Quaternion()
const _scale = new THREE.Vector3()
const _euler = new THREE.Euler()
const RAD2DEG = 180 / Math.PI

// ─── Core FK Computation ────────────────────────────────────────────────────

let _frameCount = 0
const DISPLAY_STRIDE = 6 // write to Zustand every 6 frames ≈ 10 fps at 60 fps

/**
 * Compute the end-effector world pose by reading Three.js matrixWorld.
 *
 * Call this every frame AFTER applyAngles() has set joint rotations.
 * The two-step R3F pattern (ordered by component mount position in SceneRoot):
 *   1. ManipulatorRenderer.useFrame → applyAngles()    (mounted first)
 *   2. EndEffectorFrame.useFrame    → computeFK(group) (mounted second)
 *
 * Steps inside:
 *   1. Force-update the world matrix chain (root → EE node)
 *   2. Decompose matrixWorld into position + quaternion
 *   3. Imperatively sync the visualization group (every frame, no React)
 *   4. Throttled Zustand write for the sidebar display (~10 fps)
 *
 * @param eeGroup - THREE.Group for the EE frame visualization; its
 *                  position/quaternion are copied directly, bypassing React.
 */
export function computeFK(eeGroup?: THREE.Group | null): void {
  if (!_eeNodeUuid) return

  const nodeMap = getNodeMap()
  const eeNode = nodeMap.get(_eeNodeUuid)
  if (!eeNode) return

  // Step 1: force-recompute the world matrix chain
  //
  // After applyAngles() the joint nodes are dirty (matrixWorldNeedsUpdate).
  // updateWorldMatrix(true, false) walks from the scene root down to this
  // node, multiplying at each level:
  //   node.matrixWorld = parent.matrixWorld × node.matrix
  // This is the FK product — Three.js computes it internally.
  eeNode.updateWorldMatrix(true, false)

  // Step 2: decompose matrixWorld = T_base→EE
  //
  // _pos    = translation column = end-effector position in world space
  // _quat   = rotation sub-matrix as quaternion = EE orientation
  // _scale  = discarded (GLB models carry unit scale)
  eeNode.matrixWorld.decompose(_pos, _quat, _scale)

  // Step 3: imperatively move the visualization group — zero allocation,
  // zero React overhead, happens every frame at full frame rate.
  if (eeGroup) {
    eeGroup.position.copy(_pos)
    eeGroup.quaternion.copy(_quat)
  }

  // Step 4: throttle Zustand writes so React doesn't re-render at 60 fps
  if (++_frameCount % DISPLAY_STRIDE !== 0) return

  _euler.setFromQuaternion(_quat, 'XYZ')

  const { _setPose, _setReady, isReady } = useFKStore.getState()
  _setPose({
    px: _pos.x,  py: _pos.y,  pz: _pos.z,
    qx: _quat.x, qy: _quat.y, qz: _quat.z, qw: _quat.w,
    rx: _euler.x * RAD2DEG,
    ry: _euler.y * RAD2DEG,
    rz: _euler.z * RAD2DEG,
  })

  if (!isReady) _setReady(true)
}
