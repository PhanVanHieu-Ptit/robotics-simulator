import { useMemo } from 'react'
import * as THREE from 'three'

/** Memoized cylinder geometry for a rigid link. */
export function useLinkGeometry(length: number, radius = 0.03): THREE.CylinderGeometry {
  return useMemo(
    () => new THREE.CylinderGeometry(radius, radius, length, 16),
    [length, radius],
  )
}

/** Memoized sphere geometry for a joint sphere. */
export function useJointGeometry(radius = 0.05): THREE.SphereGeometry {
  return useMemo(() => new THREE.SphereGeometry(radius, 16, 16), [radius])
}
