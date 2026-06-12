import { useRef } from 'react'
import * as THREE from 'three'
import { useRobotStore } from '@store/robotStore'
import { Joint } from './shared/Joint'
import { Link }  from './shared/Link'

// Visual link lengths in metres (approximate Franka Panda proportions)
const LINK_LENGTHS = [0.333, 0.316, 0.384, 0.0, 0.107, 0.088, 0.107]

/** Converts a row-major Mat4 array to a THREE.Matrix4. */
function toThreeMatrix(mat4: readonly number[]): THREE.Matrix4 {
  return new THREE.Matrix4().set(
    mat4[0]!, mat4[1]!, mat4[2]!,  mat4[3]!,
    mat4[4]!, mat4[5]!, mat4[6]!,  mat4[7]!,
    mat4[8]!, mat4[9]!, mat4[10]!, mat4[11]!,
    mat4[12]!, mat4[13]!, mat4[14]!, mat4[15]!,
  )
}

export function FrankaArmMesh() {
  const dhTransforms = useRobotStore((s) => s.dhTransforms)
  const groupRefs = useRef<(THREE.Group | null)[]>([])

  // Apply cumulative FK transforms to each link group
  return (
    <group name="franka_panda">
      {LINK_LENGTHS.map((len, i) => {
        const mat = dhTransforms[i]
        return (
          <group
            key={i}
            ref={(el) => { groupRefs.current[i] = el }}
            matrix={mat ? toThreeMatrix(mat) : undefined}
            matrixAutoUpdate={false}
          >
            <Joint color={i === LINK_LENGTHS.length - 1 ? '#ff8c42' : '#4a9eff'} />
            {len > 0 && <Link length={len} />}
          </group>
        )
      })}
    </group>
  )
}
