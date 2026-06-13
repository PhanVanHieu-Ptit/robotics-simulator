import type * as THREE from 'three'

export interface HierarchyNode {
  uuid: string
  name: string
  type: string
  depth: number
  parentUuid: string | null
  childUuids: string[]
  isJointCandidate: boolean
  position: [number, number, number]
  rotation: [number, number, number]
}

export interface KinematicNode {
  uuid: string
  name: string
  childUuids: string[]
}

export interface HierarchyResult {
  nodes: HierarchyNode[]
  nodeMap: Map<string, HierarchyNode>
  jointCandidates: HierarchyNode[]
  kinematicTree: KinematicNode[]
}

const JOINT_NAME_RE = /joint|bone|axis|pivot|revolute|link\d/i

function detectJoint(obj: THREE.Object3D): boolean {
  if (obj.type === 'Bone') return true
  if (JOINT_NAME_RE.test(obj.name)) return true
  // Named group with children — likely a transform pivot
  if (obj.type === 'Group' && obj.children.length > 0 && obj.name.length > 0) return true
  return false
}

function visit(
  obj: THREE.Object3D,
  depth: number,
  parentUuid: string | null,
  nodes: HierarchyNode[],
  nodeMap: Map<string, HierarchyNode>,
): void {
  const node: HierarchyNode = {
    uuid: obj.uuid,
    name: obj.name.length > 0 ? obj.name : `(${obj.type})`,
    type: obj.type,
    depth,
    parentUuid,
    childUuids: obj.children.map((c) => c.uuid),
    isJointCandidate: detectJoint(obj),
    position: [obj.position.x, obj.position.y, obj.position.z],
    rotation: [obj.rotation.x, obj.rotation.y, obj.rotation.z],
  }
  nodes.push(node)
  nodeMap.set(obj.uuid, node)
  for (const child of obj.children) {
    visit(child, depth + 1, obj.uuid, nodes, nodeMap)
  }
}

export function traverseHierarchy(root: THREE.Object3D): HierarchyResult {
  const nodes: HierarchyNode[] = []
  const nodeMap = new Map<string, HierarchyNode>()

  visit(root, 0, null, nodes, nodeMap)

  const jointCandidates = nodes.filter((n) => n.isJointCandidate)

  const jointUuids = new Set(jointCandidates.map((n) => n.uuid))
  const kinematicTree: KinematicNode[] = jointCandidates.map((n) => ({
    uuid: n.uuid,
    name: n.name,
    childUuids: n.childUuids.filter((uid) => jointUuids.has(uid)),
  }))

  return { nodes, nodeMap, jointCandidates, kinematicTree }
}
