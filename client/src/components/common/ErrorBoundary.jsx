import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="m-4 rounded-md border border-danger-600/30 bg-danger-50 p-4 text-danger-600">
        <p className="font-semibold">Something went wrong on this screen.</p>
        <pre className="mt-2 whitespace-pre-wrap text-sm">{String(this.state.error?.message || this.state.error)}</pre>
        <button
          onClick={() => window.location.assign('/')}
          className="mt-3 min-h-10 rounded-md border border-danger-600 px-4 text-sm font-medium"
        >
          Go to Home
        </button>
      </div>
    );
  }
}