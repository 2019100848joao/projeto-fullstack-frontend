import { screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithAuth } from '../../test/renderWithAuth.jsx';
import PatientAppointments from './PatientAppointments.jsx';

const doctor = { id: 'd1', full_name: 'Daniel Médico', email: 'medico@example.com' };
const appointment = (id, when, status) => ({
  id,
  status,
  scheduled_at: new Date(when).toISOString(),
  doctor,
  patient: { id: 'p1', full_name: 'Paula', email: 'paciente@example.com' },
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-19T15:00:00'));
});

afterEach(() => vi.useRealTimers());

describe('PatientAppointments', () => {
  it('splits upcoming appointments from history, including overdue ones', async () => {
    const api = {
      listMyAppointments: vi.fn().mockResolvedValue([
        appointment('overdue', '2026-11-19T12:30:00', 'scheduled'),
        appointment('next', '2026-11-24T11:00:00', 'scheduled'),
        appointment('done', '2026-11-10T09:00:00', 'completed'),
        appointment('missed', '2026-11-12T09:00:00', 'no_show'),
      ]),
    };

    renderWithAuth(<PatientAppointments />, { api });

    const upcoming = await screen.findByRole('region', { name: 'Próximas' });
    const past = screen.getByRole('region', { name: 'Anteriores' });

    expect(within(upcoming).getAllByRole('listitem')).toHaveLength(1);
    expect(within(upcoming).getByText('Agendada')).toBeInTheDocument();
    expect(within(past).getByText('Aguardando registro')).toBeInTheDocument();
    expect(within(past).getByText('Realizada')).toBeInTheDocument();
    expect(within(past).getByText('Não compareceu')).toBeInTheDocument();
  });

  it('guides the patient when there are no appointments', async () => {
    renderWithAuth(<PatientAppointments />, { api: { listMyAppointments: vi.fn().mockResolvedValue([]) } });

    expect(await screen.findByText('Você ainda não tem consultas')).toBeInTheDocument();
  });

  it('offers a retry when loading fails', async () => {
    const api = { listMyAppointments: vi.fn().mockRejectedValue(new Error('Falha de rede')) };

    renderWithAuth(<PatientAppointments />, { api });

    expect(await screen.findByText('Falha de rede')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument();
  });
});
