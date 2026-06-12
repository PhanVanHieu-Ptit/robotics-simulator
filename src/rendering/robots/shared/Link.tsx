import { useLinkGeometry } from '../../hooks/useRobotGeometry'

interface LinkProps {
  length: number
  color?: string
}

export function Link({ length, color = '#c8c8cc' }: LinkProps) {
  const geo = useLinkGeometry(length)
  return (
    // Cylinder is centered; rotate so it extends along +Y, then offset to sit above origin
    <mesh geometry={geo} position={[0, length / 2, 0]} castShadow>
      <meshStandardMaterial color={color} metalness={0.5} roughness={0.4} />
    </mesh>
  )
}
