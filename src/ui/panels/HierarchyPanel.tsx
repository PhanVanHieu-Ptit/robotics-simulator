import { useMemo } from 'react'
import { Tree, Tag, Typography, Tabs, Empty, Badge } from 'antd'
import type { DataNode } from 'antd/es/tree'
import { useModelInspectorStore } from '@store/modelInspectorStore'
import type { HierarchyNode } from '@rendering/utils/traverseHierarchy'

const { Text } = Typography

const NODE_COLOR: Record<string, string> = {
  Bone:         '#f5a623',
  Group:        '#4a9eff',
  Mesh:         '#7ed321',
  SkinnedMesh:  '#bd10e0',
  Object3D:     '#9b9b9b',
}

// ── Tree tab ────────────────────────────────────────────────────────────────

function NodeTitle({ node }: { node: HierarchyNode }) {
  const color = NODE_COLOR[node.type] ?? '#9b9b9b'
  return (
    <span style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}>
      <Tag color={color} style={{ margin: 0, fontSize: 10, lineHeight: '16px', padding: '0 4px' }}>
        {node.type}
      </Tag>
      <Text style={{ color: node.isJointCandidate ? '#f5a623' : '#ccc', fontSize: 12 }}>
        {node.name}
      </Text>
      {node.isJointCandidate && <Badge dot color="#f5a623" />}
    </span>
  )
}

function buildTree(
  uuids: string[],
  nodeMap: Map<string, HierarchyNode>,
): DataNode[] {
  return uuids.map((uuid) => {
    const node = nodeMap.get(uuid)
    if (!node) return { key: uuid, title: uuid, isLeaf: true }
    return {
      key: uuid,
      title: <NodeTitle node={node} />,
      children: node.childUuids.length > 0 ? buildTree(node.childUuids, nodeMap) : undefined,
      isLeaf: node.childUuids.length === 0,
    }
  })
}

function HierarchyTree() {
  const nodes   = useModelInspectorStore((s) => s.nodes)
  const nodeMap = useModelInspectorStore((s) => s.nodeMap)

  const rootUuids = useMemo(
    () => nodes.filter((n) => n.parentUuid === null).map((n) => n.uuid),
    [nodes],
  )
  const treeData = useMemo(() => buildTree(rootUuids, nodeMap), [rootUuids, nodeMap])

  if (nodes.length === 0)
    return <Empty description="No model loaded" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ marginTop: 24 }} />

  return (
    <Tree
      treeData={treeData}
      defaultExpandDepth={2}
      showLine={{ showLeafIcon: false }}
      style={{ background: 'transparent', fontSize: 12 }}
    />
  )
}

// ── Joint map tab ────────────────────────────────────────────────────────────

function JointMap() {
  const joints       = useModelInspectorStore((s) => s.jointCandidates)
  const kinematicTree = useModelInspectorStore((s) => s.kinematicTree)

  if (joints.length === 0)
    return <Empty description="No joints detected" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ marginTop: 24 }} />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {joints.map((j, i) => {
        const kNode = kinematicTree.find((k) => k.uuid === j.uuid)
        const color = NODE_COLOR[j.type] ?? '#9b9b9b'
        return (
          <div
            key={j.uuid}
            style={{
              background: '#1a1a2e',
              border: '1px solid #2a2a4a',
              borderRadius: 4,
              padding: '6px 8px',
            }}
          >
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 3 }}>
              <Tag color={color} style={{ margin: 0, fontSize: 10, lineHeight: '16px', padding: '0 4px' }}>
                {j.type}
              </Tag>
              <Text style={{ color: '#f5a623', fontSize: 12, fontWeight: 600 }}>
                {i + 1}. {j.name}
              </Text>
            </div>
            <div style={{ color: '#777', fontSize: 10, fontFamily: 'monospace' }}>
              pos [{j.position.map((v) => v.toFixed(3)).join(', ')}]
            </div>
            {kNode && kNode.childUuids.length > 0 && (
              <div style={{ color: '#555', fontSize: 10, marginTop: 2 }}>
                {kNode.childUuids.length} child joint{kNode.childUuids.length > 1 ? 's' : ''}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Debug tab ────────────────────────────────────────────────────────────────

function DebugInfo() {
  const nodes    = useModelInspectorStore((s) => s.nodes)
  const joints   = useModelInspectorStore((s) => s.jointCandidates)
  const modelName = useModelInspectorStore((s) => s.modelName)

  if (nodes.length === 0)
    return <Empty description="No model loaded" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ marginTop: 24 }} />

  const maxDepth = nodes.reduce((m, n) => Math.max(m, n.depth), 0)
  const typeCounts = nodes.reduce<Record<string, number>>((acc, n) => {
    acc[n.type] = (acc[n.type] ?? 0) + 1
    return acc
  }, {})

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontFamily: 'monospace', fontSize: 11 }}>
      <div style={{ background: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: 4, padding: '8px 10px' }}>
        <div style={{ color: '#fff', fontWeight: 600, marginBottom: 6, fontSize: 12 }}>{modelName}</div>
        <div style={{ color: '#888' }}>
          Total nodes: <span style={{ color: '#4a9eff' }}>{nodes.length}</span>
        </div>
        <div style={{ color: '#888' }}>
          Max depth: <span style={{ color: '#4a9eff' }}>{maxDepth}</span>
        </div>
        <div style={{ color: '#888' }}>
          Joint candidates: <span style={{ color: '#f5a623' }}>{joints.length}</span>
        </div>
      </div>

      <div style={{ background: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: 4, padding: '8px 10px' }}>
        <div style={{ color: '#fff', fontWeight: 600, marginBottom: 6, fontSize: 12 }}>Node types</div>
        {Object.entries(typeCounts).map(([type, count]) => (
          <div key={type} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 3 }}>
            <Tag
              color={NODE_COLOR[type] ?? '#9b9b9b'}
              style={{ margin: 0, fontSize: 10, lineHeight: '16px', padding: '0 4px', minWidth: 80 }}
            >
              {type}
            </Tag>
            <span style={{ color: '#ccc' }}>{count}</span>
          </div>
        ))}
      </div>

      <div style={{ background: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: 4, padding: '8px 10px' }}>
        <div style={{ color: '#fff', fontWeight: 600, marginBottom: 6, fontSize: 12 }}>Kinematic chain</div>
        {joints.slice(0, 20).map((j, i) => (
          <div key={j.uuid} style={{ color: '#777', marginBottom: 2 }}>
            <span style={{ color: '#666' }}>{i + 1}.</span>{' '}
            <span style={{ color: '#f5a623' }}>{j.name}</span>{' '}
            <span style={{ color: '#555' }}>d={j.depth}</span>
          </div>
        ))}
        {joints.length > 20 && (
          <div style={{ color: '#555' }}>…and {joints.length - 20} more</div>
        )}
      </div>
    </div>
  )
}

// ── Public panel ─────────────────────────────────────────────────────────────

const PANEL_TABS = [
  { key: 'tree',   label: 'Tree',   children: <HierarchyTree /> },
  { key: 'joints', label: 'Joints', children: <JointMap /> },
  { key: 'debug',  label: 'Debug',  children: <DebugInfo /> },
]

export function HierarchyPanel() {
  return (
    <div style={{ padding: '0 4px' }}>
      <Tabs size="small" items={PANEL_TABS} style={{ color: '#ccc' }} />
    </div>
  )
}
