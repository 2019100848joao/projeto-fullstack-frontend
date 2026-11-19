import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithAuth } from '../../test/renderWithAuth.jsx';
import Appointments from './Appointments.jsx';

const doctor = { id: 'd1', full_name: 'Daniel Médico', email: 'medico@example.com', is_active: true };
const patient = { id: 'p1', full_name: 'Paula Paciente', email: 'paciente@example.com', is_active: true };
const appointment = (id, when, status = 'scheduled') => ({
  id,
  status,
  scheduled_at: new Date(when).toISOString(),
  doctor,
  patient,
  created_at: '2026-11-01T12:00:00Z',
});

function makeApi(appointments) {
  return {
    listUsers: vi.fn((role) => Promise.resolve(role === 'doctor' ? [doctor] : [patient])),
    listAppointments: vi.fn().mockResolvedValue(appointments),
    markNoShow: vi.fn().mockResolvedValue({}),
  };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-19T15:00:00'));
});

afterEach(() => vi.useRealTimers());

describe('Appointments', () => {
  it('only offers slots the chosen doctor still has free', async () => {
    const api = makeApi([
      appointment('a1', '2026-11-24T09:00:00'),
      appointment('a2', '2026-11-24T10:00:00', 'cancelled'),
    ]);
    renderWithAuth(<Appointments />, { api });

    await userEvent.click(await screen.findByRole('button', { name: /Nova consulta/ }));
    const dialog = screen.getByRole('dialog');

    expect(within(dialog).getByText('Selecione o médico para ver os horários disponíveis.')).toBeInTheDocument();

    await userEvent.selectOptions(within(dialog).getByLabelText('Médico'), 'd1');
    fireEvent.change(within(dialog).getByLabelText('Data'), { target: { value: '2026-11-24' } });

    expect(await within(dialog).findByRole('radio', { name: '09:30' })).toBeInTheDocument();
    expect(within(dialog).queryByRole('radio', { name: '09:00' })).not.toBeInTheDocument();
    expect(within(dialog).getByRole('radio', { name: '10:00' })).toBeInTheDocument();
    expect(api.listAppointments).toHaveBeenCalledWith({ doctor_id: 'd1' });
  });

  it('lets the attendant register a no-show only after the appointment time', async () => {
    const api = makeApi([
      appointment('past', '2026-11-19T12:30:00'),
      appointment('future', '2026-11-24T11:00:00'),
    ]);
    renderWithAuth(<Appointments />, { api });

    const pastRow = (await screen.findByText('Aguardando registro')).closest('li');
    expect(within(screen.getByText('11:00').closest('li')).queryByRole('button', { name: 'Não compareceu' })).not.toBeInTheDocument();

    await userEvent.click(within(pastRow).getByRole('button', { name: 'Não compareceu' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Registrar falta' }));

    expect(api.markNoShow).toHaveBeenCalledWith('past');
  });
});
