import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // Errors are intentionally not logged to the console in production
    // to avoid leaking implementation details. Wire up an error reporting
    // service (e.g. Sentry) here if needed.
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0f0d0c] flex items-center justify-center px-6">
          <div className="text-center max-w-md">
            <p className="font-serif text-4xl text-cream mb-4">Something went wrong</p>
            <p className="text-cream/50 text-sm mb-8">
              An unexpected error occurred. Please refresh the page or return home.
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="bg-charcoal text-cream px-6 py-3 text-xs uppercase tracking-[0.2em] hover:bg-charcoal/90 transition-colors"
              >
                Refresh
              </button>
              <a
                href="/"
                className="border border-cream/30 text-cream px-6 py-3 text-xs uppercase tracking-[0.2em] hover:border-cream/60 transition-colors"
              >
                Go Home
              </a>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
