const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

async function request(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`${API_URL}${path}`, { ...options, signal: controller.signal });
    if (!response.ok) {
      const messages = {
        401: 'Invalid email or password. Please try again.',
        403: 'Your account is inactive. Contact the clinic.',
        422: 'Please check your email and password.',
        429: 'Too many attempts. Please try again later.',
      };
      throw new Error(messages[response.status] || 'Unable to sign in. Please try again later.');
    }
    return await response.json();
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('The request timed out. Please try again.');
    if (error instanceof TypeError) throw new Error('Unable to reach the clinic. Please try again later.');
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
