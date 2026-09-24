import { Component } from 'react';

/** Last line of defence: a render error shows a recovery screen instead of a blank page. */
class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Unhandled UI error', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div role="alert" style={{ padding: 40, textAlign: 'center' }}>
        <h1>Something went wrong</h1>
        <p>Your routes are saved. Reload the page to continue.</p>
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
          Reload
        </button>
      </div>
    );
  }
}

export default ErrorBoundary;
