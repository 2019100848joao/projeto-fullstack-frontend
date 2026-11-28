import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createClinicApi, login, register } from './api.js';

function respond(status, body) {
  return Promise.resolve(new Response(body === undefined ? null : JSON.stringify(body), { status }));
}

let fetchMock;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => vi.unstubAllGlobals());

describe('login', () => {
  it('uses login-specific messages', async () => {
    fetchMock.mockReturnValue(respond(401, { detail: 'Invalid email or password' }));

    await expect(login('a@example.com', 'wrong')).rejects.toThrow('E-mail ou senha inválidos');
  });
});

describe('register', () => {
  it('never sends a role, so the backend creates a patient', async () => {
    fetchMock.mockReturnValue(respond(201, { id: '1' }));

    await register({ fullName: 'Ana', email: 'ana@example.com', password: 'senhaSegura1' });

    const [, options] = fetchMock.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({ full_name: 'Ana', email: 'ana@example.com', password: 'senhaSegura1' });
  });

  it('explains a duplicated e-mail', async () => {
    fetchMock.mockReturnValue(respond(409, { detail: 'Email is already registered' }));

    await expect(register({ fullName: 'Ana', email: 'ana@example.com', password: 'senhaSegura1' }))
      .rejects.toThrow('Este e-mail já está cadastrado');
  });
});

describe('createClinicApi', () => {
  it('sends the token and drops empty query values', async () => {
    fetchMock.mockReturnValue(respond(200, []));
    const api = createClinicApi('token-123', vi.fn());

    await api.listAppointments({ doctor_id: 'd1', patient_id: '' });

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/appointments?doctor_id=d1');
    expect(options.headers.Authorization).toBe('Bearer token-123');
  });

  it('translates known backend details into Portuguese', async () => {
    fetchMock.mockReturnValue(respond(409, { detail: 'Doctor already has an appointment at this time' }));
    const api = createClinicApi('token', vi.fn());

    await expect(api.scheduleAppointment({})).rejects.toThrow('O médico já tem uma consulta neste horário.');
  });

  it('ends the session when the token is rejected', async () => {
    fetchMock.mockReturnValue(respond(401, { detail: 'Could not validate credentials' }));
    const onUnauthorized = vi.fn();
    const api = createClinicApi('expired', onUnauthorized);

    await expect(api.listExams()).rejects.toMatchObject({ status: 401 });
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });

  it('does not end the session on other errors', async () => {
    fetchMock.mockReturnValue(respond(403, { detail: 'Forbidden' }));
    const onUnauthorized = vi.fn();
    const api = createClinicApi('token', onUnauthorized);

    await expect(api.listAppointments()).rejects.toThrow('Você não tem permissão');
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('reports a network failure clearly', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const api = createClinicApi('token', vi.fn());

    await expect(api.listExams()).rejects.toThrow('Não foi possível conectar à clínica');
  });
});
