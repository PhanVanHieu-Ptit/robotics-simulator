import { Toolbar }   from './Toolbar'
import { Sidebar }   from './Sidebar'
import { SceneRoot } from '@rendering/scene/SceneRoot'
import { useInputController } from '@input/hooks/useInputController'

function InputGate() {
  useInputController()
  return null
}

export function AppLayout() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <InputGate />
      <Toolbar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <main style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <SceneRoot />
        </main>
      </div>
    </div>
  )
}
