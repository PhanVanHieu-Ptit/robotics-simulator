import { useRef, useMemo, useEffect } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { computeFK } from '@simulation/systems/ForwardKinematicsSystem'

const AXIS_LENGTH = 0.15

function makeAxisLine(dir: readonly [number, number, number], color: string): THREE.Line {
  const geom = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(dir[0], dir[1], dir[2]).multiplyScalar(AXIS_LENGTH),
  ])
  const mat = new THREE.LineBasicMaterial({ color, depthTest: false })
  const line = new THREE.Line(geom, mat)
  line.renderOrder = 999
  return line
}

/**
 * Renders a coordinate frame (X/Y/Z axes) at the end-effector position.
 *
 * Must be mounted AFTER ManipulatorRenderer in SceneRoot so its useFrame
 * runs second — joint rotations are already applied when FK is computed.
 *
 * The group position/quaternion is updated imperatively inside computeFK()
 * every frame, bypassing React entirely. No re-renders on pose change.
 *
 *   X = red   (#ff4060)
 *   Y = green (#80cc40)
 *   Z = blue  (#4080ff)
 */
export function EndEffectorFrame() {
  const groupRef = useRef<THREE.Group>(null)

  const lines = useMemo(() => [
    makeAxisLine([1, 0, 0], '#ff4060'),
    makeAxisLine([0, 1, 0], '#80cc40'),
    makeAxisLine([0, 0, 1], '#4080ff'),
  ], [])

  useEffect(() => () => {
    for (const line of lines) {
      line.geometry.dispose()
      ;(line.material as THREE.Material).dispose()
    }
  }, [lines])

  // ManipulatorRenderer.useFrame (mounted earlier) ran applyAngles() first.
  // Now we read the updated matrixWorld to compute the EE pose and sync the
  // visualization group.
  useFrame(() => {
    computeFK(groupRef.current)
  })

  return (
    <group ref={groupRef}>
      {lines.map((line, i) => <primitive key={i} object={line} />)}
    </group>
  )
}
