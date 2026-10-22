const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

async function request(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`${API_URL}${path}`, { ...options, signal: controller.signal });
    if (!response.ok) {
      const messages = {
        401: 'E-mail ou senha inválidos. Tente novamente.',
        403: 'Sua conta está inativa. Entre em contato com a clínica.',
        422: 'Confira seu e-mail e sua senha.',
        429: 'Muitas tentativas. Tente novamente mais tarde.',
      };
      throw new Error(messages[response.status] || 'Não foi possível entrar. Tente novamente mais tarde.');
    }
    return await response.json();
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('A solicitação demorou demais. Tente novamente.');
    if (error instanceof TypeError) throw new Error('Não foi possível conectar à clínica. Tente novamente mais tarde.');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function login(email, password) {
  return request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
}

export function getCurrentUser(token) {
  return request('/auth/me', { headers: { Authorization: `Bearer ${token}` } });
}
