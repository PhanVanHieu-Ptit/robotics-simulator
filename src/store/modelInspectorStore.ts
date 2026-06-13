import { create } from 'zustand'
import type { HierarchyNode, KinematicNode } from '@rendering/utils/traverseHierarchy'

interface ModelInspectorState {
  modelName: string | null
  nodes: HierarchyNode[]
  nodeMap: Map<string, HierarchyNode>
  jointCandidates: HierarchyNode[]
  kinematicTree: KinematicNode[]
}

interface ModelInspectorActions {
  setHierarchy: (
    data: Pick<ModelInspectorState, 'modelName' | 'nodes' | 'nodeMap' | 'jointCandidates' | 'kinematicTree'>,
  ) => void
  clear: () => void
}

const EMPTY: ModelInspectorState = {
  modelName: null,
  nodes: [],
  nodeMap: new Map(),
  jointCandidates: [],
  kinematicTree: [],
}

export const useModelInspectorStore = create<ModelInspectorState & ModelInspectorActions>((set) => ({
  ...EMPTY,
  setHierarchy: (data) => set(data),
  clear: () => set(EMPTY),
}))
