import { Component } from 'react'
import { Button } from '../ui/Button'

export class GlobalErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error) {
    console.error('Unhandled UI error:', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-dvh flex items-center justify-center px-4">
          <div className="max-w-md rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-6 text-center space-y-3">
            <h1 className="text-lg font-semibold text-[var(--color-text)]">Something went wrong</h1>
            <p className="text-sm text-[var(--color-text-muted)]">
              The app hit an unexpected error. Please retry.
            </p>
            <div className="flex items-center justify-center gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => this.setState({ hasError: false })}
              >
                Retry
              </Button>
              <Button type="button" variant="accent" onClick={() => window.location.reload()}>
                Reload
              </Button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
