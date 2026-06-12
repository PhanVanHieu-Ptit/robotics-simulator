import { ConfigProvider, theme } from 'antd'
import { AppLayout } from '@ui/layout/AppLayout'

export function App() {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#4a9eff',
          colorBgBase: '#12121a',
          borderRadius: 4,
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', monospace",
        },
      }}
    >
      <AppLayout />
    </ConfigProvider>
  )
}
