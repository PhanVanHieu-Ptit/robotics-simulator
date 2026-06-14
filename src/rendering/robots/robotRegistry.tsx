import { useRef, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { RobotLoader } from './RobotLoader'
import { ROBOT_MODELS } from '../hooks/useRobotLoader'
import type { LoadedRobot } from '../hooks/useRobotLoader'
import { useRobotStore } from '@store/robotStore'
import { useModelInspectorStore } from '@store/modelInspectorStore'
import { traverseHierarchy } from '../utils/traverseHierarchy'
import { registerNodes } from '@rendering/utils/nodeRegistry'
import { useManipulatorStore } from '@simulation/systems/ManipulatorSystem'
import { initFK } from '@simulation/systems/ForwardKinematicsSystem'
import { FRANKA_ID } from '@config/robotIds'

// ─── Per-robot scene components ──────────────────────────────────────────────

function FrankaRobotScene() {
  const ref = useRef<Group>(null)

  const handleLoad = useCallback((robot: LoadedRobot) => {
    const result = traverseHierarchy(robot.scene)
    useModelInspectorStore.getState().setHierarchy({
      modelName: robot.config.name,
      ...result,
    })
    registerNodes(robot.scene, result.jointCandidates)
    useManipulatorStore.getState().setJoints(result.jointCandidates)
    initFK(result.jointCandidates)

    const armJoints = result.jointCandidates
      .filter((j) => {
        const m = j.name.match(/^Link(\d+)$/i)
        return m !== null && parseInt(m[1]!, 10) >= 1
      })
      .sort((a, b) => {
        const na = parseInt(a.name.match(/\d+/)?.[0] ?? '0', 10)
        const nb = parseInt(b.name.match(/\d+/)?.[0] ?? '0', 10)
        return na - nb
      })
    useManipulatorStore.getState().setArmJoints(armJoints)
  }, [])

  useFrame(() => {
    if (!ref.current) return
    const { x, y, theta } = useRobotStore.getState().basePose
    ref.current.position.set(x, 0, y)
    ref.current.rotation.y = -theta
  })

  return (
    <group ref={ref}>
      <RobotLoader config={ROBOT_MODELS.ridgeback_franka} onLoad={handleLoad} />
    </group>
  )
}

// ─── Registry ─────────────────────────────────────────────────────────────────

export interface RobotSceneEntry {
  /** Matches robotStore.robotSnapshots key — used as React key and Trail robotId. */
  readonly id: string
  /** R3F component that renders and animates this robot. */
  readonly Component: React.ComponentType
}

/**
 * Add a new robot here — no other file needs to change.
 * Each entry must supply a unique id and a self-contained scene component.
 */
export const ROBOT_SCENE_REGISTRY: RobotSceneEntry[] = [
  { id: FRANKA_ID, Component: FrankaRobotScene },
]
