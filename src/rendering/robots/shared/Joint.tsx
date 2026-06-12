import { useJointGeometry } from '../../hooks/useRobotGeometry'

interface JointProps {
  color?: string
}

export function Joint({ color = '#4a9eff' }: JointProps) {
  const geo = useJointGeometry(0.05)
  return (
    <mesh geometry={geo} castShadow>
      <meshStandardMaterial color={color} metalness={0.7} roughness={0.3} />
    </mesh>
  )
}
