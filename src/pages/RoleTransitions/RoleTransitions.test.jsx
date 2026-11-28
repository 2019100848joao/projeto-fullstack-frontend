import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithAuth } from '../../test/renderWithAuth.jsx';
import RoleTransitions from './RoleTransitions.jsx';
import RoleRequestCard from './RoleRequestCard.jsx';

const paula = { id: 'u1', full_name: 'Paula Paciente', email: 'paula@example.com', role: 'patient', is_active: true };
const request = (id, status, extra = {}) => ({
  id,
  user_id: 'u1',
  requested_role: 'doctor',
  status,
  created_at: '2026-11-20T12:00:00Z',
  reviewed_by_id: null,
  reviewed_at: null,
  ...extra,
});

describe('RoleTransitions (admin)', () => {
  it('lists pending requests with the requester and approves after confirmation', async () => {
    const api = {
      listRoleTransitions: vi.fn().mockResolvedValue([request('r1', 'pending')]),
      listUsers: vi.fn().mockResolvedValue([paula]),
      approveRoleTransition: vi.fn().mockResolvedValue(request('r1', 'approved')),
    };
    renderWithAuth(<RoleTransitions />, { api });

    const row = (await screen.findByText('Paula Paciente')).closest('li');
    expect(api.listRoleTransitions).toHaveBeenCalledWith('pending');
    expect(within(row).getByText(/cargo atual: Paciente/)).toBeInTheDocument();

    await userEvent.click(within(row).getByRole('button', { name: 'Aprovar' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Aprovar Paula Paciente como Médico?');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Aprovar' }));

    expect(api.approveRoleTransition).toHaveBeenCalledWith('r1');
    expect(api.listRoleTransitions).toHaveBeenCalledTimes(2);
  });

  it('shows the API error when the request was already reviewed', async () => {
    const api = {
      listRoleTransitions: vi.fn().mockResolvedValue([request('r1', 'pending')]),
      listUsers: vi.fn().mockResolvedValue([paula]),
      rejectRoleTransition: vi.fn().mockRejectedValue(new Error('Esta solicitação já foi analisada.')),
    };
    renderWithAuth(<RoleTransitions />, { api });

    await userEvent.click(await screen.findByRole('button', { name: 'Recusar' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Recusar' }));

    expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent('Esta solicitação já foi analisada.');
  });
});

describe('RoleRequestCard', () => {
  it('sends a request for a role the user does not have', async () => {
    const api = {
      listMyRoleTransitions: vi.fn().mockResolvedValueOnce([]).mockResolvedValue([request('r1', 'pending', { requested_role: 'attendant' })]),
      requestRoleTransition: vi.fn().mockResolvedValue({}),
    };
    renderWithAuth(<RoleRequestCard user={{ ...paula, role: 'doctor' }} />, { api, refreshUser: vi.fn() });

    expect(await screen.findByRole('radio', { name: 'Atendente' })).toBeChecked();
    expect(screen.queryByRole('radio', { name: 'Médico' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Enviar solicitação' }));

    expect(api.requestRoleTransition).toHaveBeenCalledWith('attendant');
    expect(await screen.findByText(/A administração vai analisar seu pedido/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enviar solicitação' })).not.toBeInTheDocument();
  });

  it('reloads the user when an approval changed their role', async () => {
    const refreshUser = vi.fn().mockResolvedValue();
    const api = { listMyRoleTransitions: vi.fn().mockResolvedValue([request('r1', 'approved', { reviewed_at: '2026-11-21T12:00:00Z' })]) };
    renderWithAuth(<RoleRequestCard user={paula} />, { api, refreshUser });

    expect(await screen.findByText('Aprovada')).toBeInTheDocument();
    expect(refreshUser).toHaveBeenCalledTimes(1);
  });
});
