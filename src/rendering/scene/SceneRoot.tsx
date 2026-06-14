import { useRef, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { Scene } from './Scene'
import { Environment } from './Environment'
import { RobotLoader } from '../robots/RobotLoader'
import { ROBOT_MODELS } from '../hooks/useRobotLoader'
import type { LoadedRobot } from '../hooks/useRobotLoader'
import { Trail } from '../overlays/Trail'
import { CoordinateFrames } from '../overlays/CoordinateFrame'
import { EndEffectorFrame } from '../overlays/EndEffectorFrame'
import { useSimulationFrame } from '../hooks/useSimulationFrame'
import { useRobotStore } from '@store/robotStore'
import { useRendererStore } from '@store/rendererStore'
import { useModelInspectorStore } from '@store/modelInspectorStore'
import { traverseHierarchy } from '../utils/traverseHierarchy'
import { registerNodes, useManipulatorStore } from '@simulation/systems/ManipulatorSystem'
import { initFK } from '@simulation/systems/ForwardKinematicsSystem'
import { ManipulatorRenderer } from '@ui/panels/ManipulatorControls'

function SimulationLoop() {
  useSimulationFrame()
  return null
}

// Reads gl.info each frame and pushes to rendererStore so PerformancePanel
// can display live GPU stats without living inside the Canvas context.
function RendererProbe() {
  useFrame(({ gl }) => {
    useRendererStore.getState().updateStats({
      calls:      gl.info.render.calls,
      geometries: gl.info.memory.geometries,
      triangles:  gl.info.render.triangles,
      textures:   gl.info.memory.textures,
    })
  })
  return null
}

// Moves the GLB robot model with the diff_drive simulation state via direct
// Three.js mutation — never triggers a React re-render.
function MovingRobot() {
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

    // Identify Franka arm joints ordered by DH index so the sim bridge and
    // slider dispatch can map DH joint index ↔ GLB node UUID.
    // The updated mesh uses Link1–Link7 for the 7 actuated joints; Link0 is
    // the fixed base and must be excluded.
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

export function SceneRoot() {
  return (
    <Scene>
      <SimulationLoop />
      <RendererProbe />
      <ManipulatorRenderer />
      <EndEffectorFrame />
      <Environment />
      <MovingRobot />
      <Trail robotId="franka_panda" />
      <CoordinateFrames />
    </Scene>
  )
}
