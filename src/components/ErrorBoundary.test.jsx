import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ErrorBoundary from './ErrorBoundary.jsx';

function Broken() {
  throw new Error('boom');
}

beforeEach(() => { vi.spyOn(console, 'error').mockImplementation(() => {}); });
afterEach(() => vi.restoreAllMocks());

describe('ErrorBoundary', () => {
  it('shows a recovery message instead of a blank screen', () => {
    render(<ErrorBoundary><Broken /></ErrorBoundary>);

    expect(screen.getByRole('alert')).toHaveTextContent('Algo deu errado nesta tela');
    expect(screen.getByRole('button', { name: 'Recarregar a página' })).toBeInTheDocument();
  });

  it('recovers when the reset key changes (e.g. another section)', () => {
    const { rerender } = render(<ErrorBoundary resetKey="exams"><Broken /></ErrorBoundary>);
    rerender(<ErrorBoundary resetKey="home"><p>Início</p></ErrorBoundary>);

    expect(screen.getByText('Início')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
