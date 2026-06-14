import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { useRobotStore } from '@store/robotStore'
import { DIFF_DRIVE_ID } from '@config/robotIds'

const CHASSIS_W = 0.5
const CHASSIS_H = 0.15
const CHASSIS_D = 0.4
const WHEEL_R   = 0.1
const WHEEL_T   = 0.06

// All position/rotation updates happen via useFrame + refs — zero React re-renders
// while the simulation is running.
export function DiffDriveRobot() {
  const groupRef      = useRef<Group>(null)
  const leftWheelRef  = useRef<Group>(null)
  const rightWheelRef = useRef<Group>(null)

  useFrame(() => {
    const store = useRobotStore.getState()
    const { x, y, theta } = store.basePose

    if (groupRef.current) {
      groupRef.current.position.set(x, WHEEL_R, y)
      groupRef.current.rotation.y = -theta
    }

    const snap = store.robotSnapshots[DIFF_DRIVE_ID]
    const leftAngle  = snap?.jointStates[0]?.angle ?? 0
    const rightAngle = snap?.jointStates[1]?.angle ?? 0

    if (leftWheelRef.current)  leftWheelRef.current.rotation.z  = leftAngle
    if (rightWheelRef.current) rightWheelRef.current.rotation.z = rightAngle
  })

  return (
    <group ref={groupRef}>
      {/* Chassis */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[CHASSIS_W, CHASSIS_H, CHASSIS_D]} />
        <meshStandardMaterial color="#2a7fff" metalness={0.3} roughness={0.6} />
      </mesh>

      {/* Left wheel */}
      <group ref={leftWheelRef} position={[-CHASSIS_W / 2 - WHEEL_T / 2, 0, 0]}>
        <mesh castShadow rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[WHEEL_R, WHEEL_R, WHEEL_T, 24]} />
          <meshStandardMaterial color="#222" roughness={0.9} />
        </mesh>
      </group>

      {/* Right wheel */}
      <group ref={rightWheelRef} position={[CHASSIS_W / 2 + WHEEL_T / 2, 0, 0]}>
        <mesh castShadow rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[WHEEL_R, WHEEL_R, WHEEL_T, 24]} />
          <meshStandardMaterial color="#222" roughness={0.9} />
        </mesh>
      </group>

      {/* Franka mount point indicator */}
      <mesh position={[0, CHASSIS_H / 2 + 0.02, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.04, 16]} />
        <meshStandardMaterial color="#ff8c42" />
      </mesh>
    </group>
  )
}
