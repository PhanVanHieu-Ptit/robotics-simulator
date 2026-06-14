import { ConfigProvider, theme } from 'antd'
import { AppLayout } from '@ui/layout/AppLayout'
import { ErrorBoundary } from '@ui/components/ErrorBoundary'

export function App() {
  return (
    <ErrorBoundary>
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
    </ErrorBoundary>
  )
}
