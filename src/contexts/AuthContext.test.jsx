import { useEffect } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from './AuthContext.jsx';
import { useAuth } from './auth.js';
import { getCurrentUser, refreshToken } from '../services/api.js';

vi.mock('../services/api.js', async (importOriginal) => ({
  ...(await importOriginal()),
  getCurrentUser: vi.fn(),
  refreshToken: vi.fn(),
}));

const TOKEN_KEY = 'clinic_access_token';
const user = { id: 'u1', full_name: 'Paula', email: 'paula@example.com', role: 'patient', documents: [] };

// Unsigned token with only the claims the frontend reads.
function makeToken(expiresInMs) {
  const payload = btoa(JSON.stringify({ sub: 'u1', exp: Math.floor((Date.now() + expiresInMs) / 1000) }));
  return `header.${payload}.signature`;
}

// Exposes the latest context value to the test body.
const probe = {};
function Probe() {
  const value = useAuth();
  useEffect(() => { probe.auth = value; });
  return <p>{value.user ? `logado: ${value.user.full_name}` : `deslogado ${value.sessionNotice}`}</p>;
}

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

beforeEach(() => {
  localStorage.clear();
  getCurrentUser.mockResolvedValue(user);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('AuthProvider', () => {
  it('renews the token before it expires only after user activity', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    const token = makeToken(30 * 60 * 1000);
    localStorage.setItem(TOKEN_KEY, token);
    refreshToken.mockResolvedValue({ access_token: 'renewed-token' });

    render(<AuthProvider><Probe /></AuthProvider>);
    await act(async () => {});
    expect(screen.getByText('logado: Paula')).toBeInTheDocument();

    await act(async () => { vi.advanceTimersByTime(29 * 60 * 1000); });
    expect(refreshToken).not.toHaveBeenCalled();

    await act(async () => { window.dispatchEvent(new Event('pointerdown')); });
    expect(refreshToken).toHaveBeenCalledWith(token);
    expect(localStorage.getItem(TOKEN_KEY)).toBe('renewed-token');
  });

  it('ends the session with a notice when the API answers 401', async () => {
    localStorage.setItem(TOKEN_KEY, makeToken(30 * 60 * 1000));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(401, { detail: 'Could not validate credentials' })));

    render(<AuthProvider><Probe /></AuthProvider>);
    await screen.findByText('logado: Paula');

    await act(async () => { await expect(probe.auth.api.listMyAppointments()).rejects.toThrow(); });

    expect(screen.getByText(/deslogado Sua sessão expirou/)).toBeInTheDocument();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it('registers documents through the API client, resolving type names to ids', async () => {
    localStorage.setItem(TOKEN_KEY, makeToken(30 * 60 * 1000));
    const created = [{ id: 'd1', value: '12345678901', document_type: { id: 't-cpf', type: 'CPF' } }];
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(200, [{ id: 't-cpf', type: 'CPF' }, { id: 't-rg', type: 'RG' }]))
      .mockResolvedValueOnce(jsonResponse(201, created));
    vi.stubGlobal('fetch', fetchMock);

    render(<AuthProvider><Probe /></AuthProvider>);
    await screen.findByText('logado: Paula');
    await act(async () => { await probe.auth.registerDocument([{ type: 'cpf', value: ' 12345678901 ' }]); });

    const [url, options] = fetchMock.mock.calls[1];
    expect(url).toMatch(/\/users\/me\/documents$/);
    expect(options.headers.Authorization).toMatch(/^Bearer /);
    expect(JSON.parse(options.body)).toEqual([{ type_id: 't-cpf', value: '12345678901' }]);
    await waitFor(() => expect(probe.auth.user.documents).toEqual(created));
  });

  it('rejects repeated document types before calling the API', async () => {
    localStorage.setItem(TOKEN_KEY, makeToken(30 * 60 * 1000));
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    render(<AuthProvider><Probe /></AuthProvider>);
    await screen.findByText('logado: Paula');

    await expect(probe.auth.registerDocument([{ type: 'CPF', value: '1' }, { type: 'cpf', value: '2' }]))
      .rejects.toThrow('Confira os documentos informados');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
