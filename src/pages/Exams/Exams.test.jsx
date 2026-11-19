import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithAuth } from '../../test/renderWithAuth.jsx';
import Exams from './Exams.jsx';

const patient = { id: 'p1', full_name: 'Paula Paciente', email: 'paciente@example.com' };
const doctor = { id: 'd1', full_name: 'Daniel Médico', email: 'medico@example.com' };
const otherDoctor = { id: 'd2', full_name: 'Outra Médica', email: 'outra@example.com' };

const exam = (id, name, status, requestedBy = doctor) => ({
  id,
  name,
  status,
  patient,
  doctor: requestedBy,
  appointment_id: 'a1',
  created_at: '2026-11-19T15:00:00Z',
  scheduled_at: null,
  performed_at: null,
  result_available_at: status === 'result_available' ? '2026-11-20T15:00:00Z' : null,
});

const exams = [
  exam('e1', 'Hemograma', 'requested'),
  exam('e2', 'Glicemia', 'scheduled'),
  exam('e3', 'Raio-X', 'performed'),
  exam('e4', 'Ultrassom', 'performed', otherDoctor),
];

function makeApi({ results = [] } = {}) {
  return {
    listUsers: vi.fn().mockResolvedValue([patient]),
    listExams: vi.fn().mockResolvedValue(exams),
    listExamResults: vi.fn().mockResolvedValue(results),
  };
}

const row = async (name) => (await screen.findByText(name)).closest('li');

describe('Exams', () => {
  it('lets attendants schedule and mark exams as performed, but not register results', async () => {
    const api = makeApi();
    renderWithAuth(<Exams user={{ id: 'att', role: 'attendant' }} />, { api });

    expect(within(await row('Hemograma')).getByRole('button', { name: 'Agendar' })).toBeInTheDocument();
    expect(within(await row('Glicemia')).getByRole('button', { name: 'Marcar como realizado' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Registrar resultado' })).not.toBeInTheDocument();
    expect(api.listExamResults).not.toHaveBeenCalled();
  });

  it('lets only the requesting doctor register the result', async () => {
    renderWithAuth(<Exams user={{ id: 'd1', role: 'doctor' }} />, { api: makeApi() });

    expect(within(await row('Raio-X')).getByRole('button', { name: 'Registrar resultado' })).toBeInTheDocument();
    expect(within(await row('Ultrassom')).queryByRole('button', { name: 'Registrar resultado' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Agendar' })).not.toBeInTheDocument();
  });

  it('shows the patient the available result', async () => {
    const ready = exam('e5', 'Colesterol', 'result_available');
    const api = {
      listExams: vi.fn().mockResolvedValue([ready]),
      listExamResults: vi.fn().mockResolvedValue([{ ...ready, result: 'Dentro da normalidade' }]),
    };
    renderWithAuth(<Exams user={{ id: 'p1', role: 'patient' }} />, { api });

    expect(within(await row('Colesterol')).getByRole('button', { name: 'Ver resultado' })).toBeInTheDocument();
    expect(screen.queryByText('Paciente: Paula Paciente')).not.toBeInTheDocument();
  });
});
