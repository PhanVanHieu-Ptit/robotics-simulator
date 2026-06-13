import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useRobotStore } from '@store/robotStore'
import { Joint } from './shared/Joint'
import { Link }  from './shared/Link'

// Visual link lengths in metres (approximate Franka Panda proportions)
const LINK_LENGTHS = [0.333, 0.316, 0.384, 0.0, 0.107, 0.088, 0.107]

export function FrankaArmMesh() {
  const groupRefs = useRef<(THREE.Group | null)[]>([])

  // Read dhTransforms imperatively each frame — zero React re-renders, zero Matrix4 allocations.
  // Mutates each group's existing matrix in-place instead of creating new THREE.Matrix4 objects.
  useFrame(() => {
    const { dhTransforms } = useRobotStore.getState()
    for (let i = 0; i < LINK_LENGTHS.length; i++) {
      const group = groupRefs.current[i]
      const mat = dhTransforms[i]
      if (!group || !mat) continue
      group.matrix.set(
        mat[0]!, mat[1]!, mat[2]!,  mat[3]!,
        mat[4]!, mat[5]!, mat[6]!,  mat[7]!,
        mat[8]!, mat[9]!, mat[10]!, mat[11]!,
        mat[12]!, mat[13]!, mat[14]!, mat[15]!,
      )
      group.matrixWorldNeedsUpdate = true
    }
  })

  return (
    <group name="franka_panda">
      {LINK_LENGTHS.map((len, i) => (
        <group
          key={i}
          ref={(el) => { groupRefs.current[i] = el }}
          matrixAutoUpdate={false}
        >
          <Joint color={i === LINK_LENGTHS.length - 1 ? '#ff8c42' : '#4a9eff'} />
          {len > 0 && <Link length={len} />}
        </group>
      ))}
    </group>
  )
}
