import { useCallback } from 'react'
import { Typography, Divider } from 'antd'
import { JointSlider }    from '../components/JointSlider'
import { VectorDisplay }  from '../components/VectorDisplay'
import { useRobotStore }  from '@store/robotStore'
import { useRobotCommands } from '@hooks/useRobotCommands'
import { useJointLimitWarnings } from '@store/selectors/robotSelectors'
import frankaConfig from '@config/robots/franka_panda.json'

const { Title } = Typography

export function JointPanel() {
  const jointAngles    = useRobotStore((s) => s.jointAngles)
  const endEffector    = useRobotStore((s) => s.endEffectorPose)
  const warnings       = useJointLimitWarnings(frankaConfig.jointLimits)
  const { dispatch }   = useRobotCommands()

  const handleJointChange = useCallback(
    (index: number, angle: number) => {
      dispatch({ type: 'SET_JOINT', robotId: frankaConfig.id, index, angle })
    },
    [dispatch],
  )

  return (
    <div style={{ padding: '0 4px' }}>
      <Title level={5} style={{ color: '#fff', marginBottom: 12, fontSize: 13 }}>
        Franka Panda — Joints
      </Title>

      {frankaConfig.jointLimits.map((lim, i) => (
        <JointSlider
          key={i}
          index={i}
          angle={jointAngles[i] ?? 0}
          min={lim.min}
          max={lim.max}
          hasWarning={warnings[i]}
          onChange={handleJointChange}
        />
      ))}

      <Divider style={{ borderColor: '#333', margin: '12px 0' }} />

      {endEffector && (
        <VectorDisplay
          label="End-effector position (m)"
          values={[...endEffector.position]}
        />
      )}
    </div>
  )
}
