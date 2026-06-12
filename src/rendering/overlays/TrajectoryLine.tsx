import { useMemo } from 'react'
import * as THREE from 'three'
import { Line } from '@react-three/drei'
import { useRobotStore } from '@store/robotStore'
import { useSceneStore } from '@store/sceneStore'

interface TrajectoryLineProps {
  robotId: string
  color?: string
  lineWidth?: number
}

export function TrajectoryLine({ robotId, color = '#00ffaa', lineWidth = 1.5 }: TrajectoryLineProps) {
  const showTrajectory = useSceneStore((s) => s.showTrajectory)
  const history = useRobotStore((s) => s.trajectories[robotId])

  const points = useMemo<THREE.Vector3[]>(() => {
    if (!history || history.length < 2) return []
    return history.map(({ position: [x, y, z] }) => new THREE.Vector3(x, y, z))
  }, [history])

  if (!showTrajectory || points.length < 2) return null

  return <Line points={points} color={color} lineWidth={lineWidth} />
}
