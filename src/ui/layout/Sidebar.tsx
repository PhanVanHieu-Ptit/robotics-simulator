import { Tabs } from 'antd'
import { JointPanel }           from '../panels/JointPanel'
import { ControlPanel }         from '../panels/ControlPanel'
import { ConfigPanel }          from '../panels/ConfigPanel'
import { TelemetryPanel }       from '../panels/TelemetryPanel'
import { PerformancePanel }     from '../panels/PerformancePanel'
import { HierarchyPanel }       from '../panels/HierarchyPanel'
import { ManipulatorControls }  from '../panels/ManipulatorControls'

const TAB_ITEMS = [
  { key: 'arm',         label: 'Arm',       children: <ManipulatorControls /> },
  { key: 'joints',      label: 'Joints',    children: <JointPanel /> },
  { key: 'drive',       label: 'Drive',     children: <ControlPanel /> },
  { key: 'hierarchy',   label: 'Hierarchy', children: <HierarchyPanel /> },
  { key: 'config',      label: 'Config',    children: <ConfigPanel /> },
  { key: 'telemetry',   label: 'Telemetry', children: <TelemetryPanel /> },
  { key: 'performance', label: 'Perf',      children: <PerformancePanel /> },
]

export function Sidebar() {
  return (
    <aside
      style={{
        width: 280,
        flexShrink: 0,
        background: '#12121a',
        borderRight: '1px solid #2a2a3a',
        overflowY: 'auto',
        padding: '8px 12px 16px',
      }}
    >
      <Tabs
        size="small"
        items={TAB_ITEMS}
        defaultActiveKey="arm"
        style={{ color: '#ccc' }}
      />
    </aside>
  )
}
