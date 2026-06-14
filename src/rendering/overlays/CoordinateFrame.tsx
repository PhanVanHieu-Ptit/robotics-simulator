import { useMemo } from 'react'
import * as THREE from 'three'
import { useRobotStore } from '@store/robotStore'
import { useSceneStore } from '@store/sceneStore'
import { computeFK } from '@simulation/kinematics/ForwardKinematics'
import { validateFrankaConfig } from '@config/validateRobotConfig'
import frankaRaw from '@config/robots/franka_panda.json'
import type { Mat4 } from '@simulation/types/RobotState'

const frankaConfig = validateFrankaConfig(frankaRaw)

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

function mat4ToThree(mat: Mat4): { pos: THREE.Vector3; quat: THREE.Quaternion } {
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
  return { pos, quat }
}

export function CoordinateFrames() {
  const show = useSceneStore((s) => s.showCoordinateFrames)
  const jointAngles = useRobotStore((s) => s.jointAngles)

  const dhTransforms = useMemo(
    () => (jointAngles.length > 0 ? computeFK(frankaConfig.dhParams, jointAngles) : []),
    [jointAngles],
  )

  if (!show) return null

  return (
    <>
      {dhTransforms.map((mat, i) => {
        const { pos, quat } = mat4ToThree(mat)
        return (
          <group key={i} position={pos} quaternion={quat}>
            <AxisFrame />
          </group>
        )
      })}
    </>
  )
}
