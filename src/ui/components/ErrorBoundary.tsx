import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack)
  }

  override render(): ReactNode {
    const { error } = this.state
    if (error) {
      return (
        this.props.fallback ?? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100vh',
              background: '#12121a',
              color: '#e0e0e0',
              fontFamily: 'monospace',
              gap: 16,
              padding: 32,
            }}
          >
            <h2 style={{ color: '#ff6b6b', margin: 0 }}>Something went wrong</h2>
            <pre
              style={{
                background: '#1a1a2a',
                border: '1px solid #333',
                borderRadius: 4,
                padding: '12px 16px',
                fontSize: 12,
                maxWidth: 640,
                overflow: 'auto',
                color: '#ff9966',
              }}
            >
              {error.message}
            </pre>
            <button
              onClick={() => this.setState({ error: null })}
              style={{
                background: '#4a9eff',
                border: 'none',
                borderRadius: 4,
                color: '#fff',
                cursor: 'pointer',
                fontSize: 13,
                padding: '8px 20px',
              }}
            >
              Retry
            </button>
          </div>
        )
      )
    }
    return this.props.children
  }
}
