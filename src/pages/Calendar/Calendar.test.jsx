import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithAuth } from '../../test/renderWithAuth.jsx';
import Calendar from './Calendar.jsx';

const doctor = { id: 'd1', full_name: 'Daniel Médico', email: 'medico@example.com' };
const patient = { id: 'p1', full_name: 'Paula Paciente', email: 'paciente@example.com' };
const appointment = (id, when) => ({
  id, status: 'scheduled', scheduled_at: new Date(when).toISOString(), doctor, patient, exams: [],
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-19T15:00:00'));
});
afterEach(() => vi.useRealTimers());

describe('Calendar', () => {
  it('asks the admin to pick a doctor before loading a calendar', async () => {
    const api = { listUsers: vi.fn().mockResolvedValue([doctor]), getCalendar: vi.fn().mockResolvedValue({ appointments: [] }) };
    renderWithAuth(<Calendar user={{ id: 'a1', role: 'admin' }} />, { api });

    expect(screen.getByText('Selecione um médico')).toBeInTheDocument();
    expect(api.getCalendar).not.toHaveBeenCalled();

    await userEvent.selectOptions(await screen.findByLabelText('Médico'), 'd1');
    expect(api.getCalendar).toHaveBeenCalledWith({ view: 'week', date: '2026-11-19', doctorId: 'd1' });
  });

  it('lets the doctor register an attendance with exam requests once the time has passed', async () => {
    const api = {
      getCalendar: vi.fn().mockResolvedValue({ appointments: [appointment('past', '2026-11-19T14:00:00'), appointment('later', '2026-11-19T17:00:00')] }),
      registerAttendance: vi.fn().mockResolvedValue({}),
    };
    renderWithAuth(<Calendar user={{ id: 'd1', role: 'doctor' }} />, { api });

    await userEvent.click(await screen.findByRole('button', { name: /17:00/ }));
    expect(within(screen.getByRole('dialog')).getByText(/poderá ser registrado a partir de/)).toBeInTheDocument();
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Fechar' }));

    await userEvent.click(screen.getByRole('button', { name: /14:00/ }));
    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Observações'), 'Paciente bem');
    await userEvent.type(within(dialog).getByLabelText('Solicitar exames'), 'Hemograma');
    await userEvent.click(within(dialog).getByRole('button', { name: /Adicionar/ }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Concluir atendimento' }));

    expect(api.registerAttendance).toHaveBeenCalledWith('past', expect.objectContaining({
      observations: 'Paciente bem',
      exam_requests: ['Hemograma'],
    }));
  });
});
