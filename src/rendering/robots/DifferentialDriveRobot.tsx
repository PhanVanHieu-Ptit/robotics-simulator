import { useRobotStore } from '@store/robotStore'

const CHASSIS_W = 0.5
const CHASSIS_H = 0.15
const CHASSIS_D = 0.4
const WHEEL_R   = 0.1
const WHEEL_T   = 0.06

export function DiffDriveRobot() {
  const { x, y, theta } = useRobotStore((s) => s.basePose)
  const leftAngle  = useRobotStore((s) => s.robotSnapshots['diff_drive']?.jointStates[0]?.angle ?? 0)
  const rightAngle = useRobotStore((s) => s.robotSnapshots['diff_drive']?.jointStates[1]?.angle ?? 0)

  return (
    <group position={[x, WHEEL_R, y]} rotation={[0, -theta, 0]}>
      {/* Chassis */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[CHASSIS_W, CHASSIS_H, CHASSIS_D]} />
        <meshStandardMaterial color="#2a7fff" metalness={0.3} roughness={0.6} />
      </mesh>

      {/* Left wheel */}
      <group position={[-CHASSIS_W / 2 - WHEEL_T / 2, 0, 0]} rotation={[0, 0, leftAngle]}>
        <mesh castShadow rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[WHEEL_R, WHEEL_R, WHEEL_T, 24]} />
          <meshStandardMaterial color="#222" roughness={0.9} />
        </mesh>
      </group>

      {/* Right wheel */}
      <group position={[CHASSIS_W / 2 + WHEEL_T / 2, 0, 0]} rotation={[0, 0, rightAngle]}>
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
