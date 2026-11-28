import { Component } from 'react';
import { RotateCw, TriangleAlert } from 'lucide-react';

/**
 * Shows a recovery message instead of a blank page when a screen throws while rendering.
 * Changing `resetKey` (e.g. navigating to another section) clears the error.
 */
export default class ErrorBoundary extends Component {
  state = { error: null, resetKey: this.props.resetKey };

  static getDerivedStateFromError(error) {
    return { error };
  }

  static getDerivedStateFromProps(props, state) {
    return props.resetKey !== state.resetKey ? { error: null, resetKey: props.resetKey } : null;
  }

  componentDidCatch(error, info) {
    console.error('Screen failed to render', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="dashboard-empty-state error-boundary" role="alert">
        <span className="dashboard-empty-icon"><TriangleAlert size={30} aria-hidden="true" /></span>
        <h2>Algo deu errado nesta tela</h2>
        <p>Tente novamente. Se o problema continuar, recarregue a página.</p>
        <div className="error-boundary-actions">
          <button type="button" className="clinic-button is-secondary" onClick={() => this.setState({ error: null })}>
            <RotateCw size={16} aria-hidden="true" /> Tentar novamente
          </button>
          <button type="button" className="clinic-button" onClick={() => window.location.reload()}>
            Recarregar a página
          </button>
        </div>
      </div>
    );
  }
}
