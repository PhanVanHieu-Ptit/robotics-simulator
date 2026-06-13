import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useRobotStore } from '@store/robotStore'
import { useSceneStore } from '@store/sceneStore'
import { SimulationConfig } from '@config/simulation'

interface TrailProps {
  robotId: string
  color?: string
  maxPoints?: number
}

export function Trail({
  robotId,
  color = '#00ffaa',
  maxPoints = SimulationConfig.maxTrajectoryLength,
}: TrailProps) {
  const showTrajectory = useSceneStore((s) => s.showTrajectory)

  // Pre-allocated position array — one Float32Array for the lifetime of this component.
  const posArr = useMemo(() => new Float32Array(maxPoints * 3), [maxPoints])

  const geomRef = useRef<THREE.BufferGeometry>(null!)

  // Change-detection refs — no state, no re-renders.
  const prevLen = useRef(0)
  const prevLX = useRef(0)
  const prevLY = useRef(0)
  const prevLZ = useRef(0)

  // Set up the BufferAttribute once and register the dispose cleanup.
  useEffect(() => {
    const attr = new THREE.BufferAttribute(posArr, 3)
    attr.setUsage(THREE.DynamicDrawUsage)
    geomRef.current.setAttribute('position', attr)
    geomRef.current.setDrawRange(0, 0)

    return () => {
      geomRef.current?.dispose()
    }
  }, [posArr])

  useFrame(() => {
    const traj = useRobotStore.getState().trajectories[robotId]
    if (!traj || traj.length < 2) return

    const len = traj.length
    const [lx, ly, lz] = traj[len - 1]!.position

    // Skip if neither the count nor the last position changed.
    if (len === prevLen.current && lx === prevLX.current && ly === prevLY.current && lz === prevLZ.current) return

    prevLen.current = len
    prevLX.current = lx
    prevLY.current = ly
    prevLZ.current = lz

    // Show the newest `maxPoints` entries.
    const n = Math.min(len, maxPoints)
    const offset = len - n

    for (let i = 0; i < n; i++) {
      const [x, y, z] = traj[offset + i]!.position
      posArr[i * 3] = x
      posArr[i * 3 + 1] = y
      posArr[i * 3 + 2] = z
    }

    const attr = geomRef.current.getAttribute('position') as THREE.BufferAttribute
    attr.needsUpdate = true
    geomRef.current.setDrawRange(0, n)
  })

  return (
    <line visible={showTrajectory}>
      <bufferGeometry ref={geomRef} />
      <lineBasicMaterial color={color} />
    </line>
  )
}
