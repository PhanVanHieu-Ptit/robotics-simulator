import * as THREE from 'three'
import { useRobotStore } from '@store/robotStore'
import { useSceneStore } from '@store/sceneStore'

const X_COLOR = new THREE.Color('#ff4060')
const Y_COLOR = new THREE.Color('#80cc40')
const Z_COLOR = new THREE.Color('#4080ff')
const AXIS_LENGTH = 0.12

interface AxisProps {
  direction: THREE.Vector3
  color: THREE.Color
}

function Axis({ direction, color }: AxisProps) {
  const points = [new THREE.Vector3(0, 0, 0), direction.clone().multiplyScalar(AXIS_LENGTH)]
  return (
    <line>
      <bufferGeometry
        setFromPoints={points}
        // React Three Fiber handles this via direct prop
      />
      <lineBasicMaterial color={color} />
    </line>
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
            <Axis direction={new THREE.Vector3(1, 0, 0)} color={X_COLOR} />
            <Axis direction={new THREE.Vector3(0, 1, 0)} color={Y_COLOR} />
            <Axis direction={new THREE.Vector3(0, 0, 1)} color={Z_COLOR} />
          </group>
        )
      })}
    </>
  )
}
