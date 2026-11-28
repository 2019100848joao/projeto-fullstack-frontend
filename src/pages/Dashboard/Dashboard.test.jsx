import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithAuth } from '../../test/renderWithAuth.jsx';
import Dashboard from './Dashboard.jsx';

const menuFor = (role) => {
  renderWithAuth(<Dashboard user={{ id: 'u1', full_name: 'Teste', email: 't@example.com', role }} onLogout={vi.fn()} />);
  return within(screen.getByRole('navigation', { name: 'Área do usuário' })).getAllByRole('button').map((item) => item.textContent);
};

describe('Dashboard menu', () => {
  it.each([
    ['patient', ['Início', 'Meu perfil', 'Consultas', 'Exames', 'Notificações']],
    ['doctor', ['Início', 'Meu perfil', 'Agenda', 'Pacientes', 'Exames', 'Notificações']],
    ['attendant', ['Início', 'Meu perfil', 'Agendamentos', 'Exames', 'Notificações']],
    ['admin', ['Início', 'Meu perfil', 'Agendamentos', 'Agenda médica', 'Exames', 'Solicitações de cargo', 'E-mails']],
  ])('shows the %s only their own sections', (role, items) => {
    expect(menuFor(role)).toEqual(items);
  });
});
