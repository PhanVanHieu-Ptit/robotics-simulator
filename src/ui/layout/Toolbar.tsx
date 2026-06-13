import { Button, Space, Tag, Tooltip } from 'antd'
import {
  PlayCircleOutlined, PauseCircleOutlined, StopOutlined,
  StepForwardOutlined, ReloadOutlined,
} from '@ant-design/icons'
import { useSimulation }      from '@hooks/useSimulation'
import { useSimulationStore } from '@store/simulationStore'
import { PerformanceMonitor } from '../panels/PerformanceMonitor'

// Re-renders only when isRunning/isPaused actually changes (button clicks).
// Extracted so the outer Toolbar shell never re-renders.
function SimulationControls() {
  const { isRunning, isPaused, start, pause, resume, stop, step } = useSimulation()

  return (
    <Space size={4}>
      {!isRunning ? (
        <Tooltip title="Start (Space)">
          <Button type="primary" icon={<PlayCircleOutlined />} size="small" onClick={start}>
            Run
          </Button>
        </Tooltip>
      ) : isPaused ? (
        <Tooltip title="Resume">
          <Button type="primary" icon={<PlayCircleOutlined />} size="small" onClick={resume}>
            Resume
          </Button>
        </Tooltip>
      ) : (
        <Tooltip title="Pause">
          <Button icon={<PauseCircleOutlined />} size="small" onClick={pause}>
            Pause
          </Button>
        </Tooltip>
      )}

      <Tooltip title="Step one frame">
        <Button
          icon={<StepForwardOutlined />}
          size="small"
          onClick={step}
          disabled={isRunning && !isPaused}
        />
      </Tooltip>

      <Tooltip title="Stop & reset">
        <Button
          danger
          icon={<StopOutlined />}
          size="small"
          onClick={stop}
          disabled={!isRunning}
        />
      </Tooltip>

      <Tooltip title="Reload page">
        <Button icon={<ReloadOutlined />} size="small" onClick={() => location.reload()} />
      </Tooltip>
    </Space>
  )
}

// Re-renders only when isRunning/isPaused actually changes.
function SimulationStatus() {
  const isRunning = useSimulationStore((s) => s.isRunning)
  const isPaused  = useSimulationStore((s) => s.isPaused)
  return (
    <Tag color={isRunning ? (isPaused ? 'orange' : 'green') : 'default'} style={{ fontSize: 10 }}>
      {isRunning ? (isPaused ? 'PAUSED' : 'RUNNING') : 'IDLE'}
    </Tag>
  )
}

// Toolbar itself has NO store subscriptions — it never re-renders after mount.
// All reactive pieces live in child components (SimulationControls, SimulationStatus).
export function Toolbar() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        height: 48,
        background: '#16161e',
        borderBottom: '1px solid #2a2a3a',
        flexShrink: 0,
      }}
    >
      <span style={{ color: '#4a9eff', fontWeight: 700, fontSize: 14, letterSpacing: 1 }}>
        ROBOTICS SIM
      </span>

      <SimulationControls />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <SimulationStatus />
        <PerformanceMonitor />
      </div>
    </div>
  )
}
