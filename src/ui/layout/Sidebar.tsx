import { Tabs } from 'antd'
import { JointPanel }   from '../panels/JointPanel'
import { ControlPanel } from '../panels/ControlPanel'
import { ConfigPanel }  from '../panels/ConfigPanel'

const TAB_ITEMS = [
  { key: 'joints',   label: 'Joints',   children: <JointPanel /> },
  { key: 'drive',    label: 'Drive',    children: <ControlPanel /> },
  { key: 'config',   label: 'Config',   children: <ConfigPanel /> },
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
        defaultActiveKey="joints"
        style={{ color: '#ccc' }}
      />
    </aside>
  )
}
