import { useMemo } from 'react'
import * as THREE from 'three'
import { useRobotStore } from '@store/robotStore'
import { useSceneStore } from '@store/sceneStore'

const AXIS_LENGTH = 0.12

// Imperative THREE.Line instances to avoid the <line> JSX conflict with SVG's IntrinsicElements.
function makeAxisLine(dx: number, dy: number, dz: number, color: string): THREE.Line {
  const geom = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(dx, dy, dz),
  ])
  const mat = new THREE.LineBasicMaterial({ color })
  return new THREE.Line(geom, mat)
}

function AxisFrame() {
  const lines = useMemo(() => [
    makeAxisLine(AXIS_LENGTH, 0, 0, '#ff4060'),
    makeAxisLine(0, AXIS_LENGTH, 0, '#80cc40'),
    makeAxisLine(0, 0, AXIS_LENGTH, '#4080ff'),
  ], [])

  return (
    <>
      {lines.map((line, i) => (
        <primitive key={i} object={line} />
      ))}
    </>
  )
}

export function CoordinateFrames() {
  const show = useSceneStore((s) => s.showCoordinateFrames)
  const dhTransforms = useRobotStore((s) => s.dhTransforms)

  if (!show) return null

  return (
    <>
      {dhTransforms.map((mat, i) => {
        const m = new THREE.Matrix4().set(
          mat[0]!, mat[1]!, mat[2]!,  mat[3]!,
          mat[4]!, mat[5]!, mat[6]!,  mat[7]!,
          mat[8]!, mat[9]!, mat[10]!, mat[11]!,
          mat[12]!, mat[13]!, mat[14]!, mat[15]!,
        )
        const pos = new THREE.Vector3()
        const quat = new THREE.Quaternion()
        const scale = new THREE.Vector3()
        m.decompose(pos, quat, scale)

        return (
          <group key={i} position={pos} quaternion={quat}>
            <AxisFrame />
          </group>
        )
      })}
    </>
  )
}
