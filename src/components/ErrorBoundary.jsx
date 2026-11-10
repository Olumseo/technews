import { Component } from 'react'
import { LoadError } from './State.jsx'

// Without this, an error while drawing a page makes React clear the whole screen.
export default class ErrorBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error) {
    console.error(error)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <LoadError
        error={{ message: 'Something went wrong while showing this page.' }}
        onRetry={() => window.location.reload()}
      />
    )
  }
}
