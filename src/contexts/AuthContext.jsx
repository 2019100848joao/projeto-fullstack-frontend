import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AuthContext } from './auth.js';
import { createClinicApi, getCurrentUser, login, refreshToken } from '../services/api.js';

// Renew this long before expiry, and only for a user who interacted since the last renewal:
// an idle session still expires instead of staying open forever.
const REFRESH_BEFORE_EXPIRY_MS = 2 * 60 * 1000;
const ACTIVITY_EVENTS = ['pointerdown', 'keydown'];

// Reads the `exp` claim only to schedule the renewal; the backend still validates the token.
function tokenExpiresAt(token) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload)).exp * 1000;
  } catch {
    return null;
  }
}

const TOKEN_KEY = 'clinic_access_token';
function getStoredToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function storeToken(token) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // The current session still works when browser storage is unavailable.
  }
}

function removeStoredToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // The in-memory session is cleared even when browser storage is unavailable.
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [storedToken, setStoredToken] = useState(getStoredToken);
  const [restoreStatus, setRestoreStatus] = useState(storedToken ? 'restoring' : 'ready');
  const [restoreAttempt, setRestoreAttempt] = useState(0);
  const restoreGeneration = useRef(0);
  // Why the last session ended on its own (shown on the login screen); empty otherwise.
  const [sessionNotice, setSessionNotice] = useState('');

  useEffect(() => {
    function handleStorage(event) {
      if (event.key !== TOKEN_KEY && event.key !== null) return;

      const nextToken = event.key === null ? getStoredToken() : event.newValue;
      restoreGeneration.current += 1;
      setSession(null);
      setStoredToken(nextToken);
      setRestoreStatus(nextToken ? 'restoring' : 'ready');
    }

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    if (!storedToken) return;

    let active = true;
    const generation = ++restoreGeneration.current;
    getCurrentUser(storedToken)
      .then((user) => {
        if (!active || generation !== restoreGeneration.current) return;
        setSession({ token: storedToken, user });
        setRestoreStatus('ready');
      })
      .catch((error) => {
        if (!active || generation !== restoreGeneration.current) return;
        if (error.status === 401 || error.status === 403) {
          removeStoredToken();
          setStoredToken(null);
          setRestoreStatus('ready');
        } else {
          setRestoreStatus('error');
        }
      });

    return () => { active = false; };
  }, [storedToken, restoreAttempt]);

  async function signIn(email, password) {
    const generation = restoreGeneration.current;
    const { access_token: token } = await login(email, password);
    const user = await getCurrentUser(token);
    if (generation !== restoreGeneration.current) {
      throw new Error('A sessão mudou em outra aba. Tente novamente.');
    }
    storeToken(token);
    setSession({ token, user });
    setSessionNotice('');
  }

  const logout = useCallback(() => {
    restoreGeneration.current += 1;
    removeStoredToken();
    setStoredToken(null);
    setSession(null);
    setRestoreStatus('ready');
    setSessionNotice('');
  }, []);

  const token = session?.token;
  const api = useMemo(() => {
    if (!token) return null;
    // The token expired or was revoked: end this session, unless a newer one already replaced it.
    return createClinicApi(token, () => {
      if (getStoredToken() === token) {
        removeStoredToken();
        setStoredToken(null);
      }
      setSession((current) => (current?.token === token ? null : current));
      setSessionNotice('Sua sessão expirou. Entre novamente para continuar.');
    });
  }, [token]);

  useEffect(() => {
    const expiresAt = token && tokenExpiresAt(token);
    if (!expiresAt) return undefined;

    let active = false;
    let due = false;
    let renewing = false;

    async function renew() {
      if (renewing) return;
      renewing = true;
      try {
        const { access_token: nextToken } = await refreshToken(token);
        if (getStoredToken() === token) storeToken(nextToken);
        setSession((current) => (current?.token === token ? { ...current, token: nextToken } : current));
      } catch {
        // An expired or revoked session is ended by the next API call that gets a 401.
      }
    }

    function markActive() {
      active = true;
      if (due) renew();
    }

    const timer = setTimeout(() => {
      due = true;
      if (active) renew();
    }, Math.max(expiresAt - Date.now() - REFRESH_BEFORE_EXPIRY_MS, 0));

    ACTIVITY_EVENTS.forEach((name) => window.addEventListener(name, markActive, { passive: true }));
    return () => {
      clearTimeout(timer);
      ACTIVITY_EVENTS.forEach((name) => window.removeEventListener(name, markActive));
    };
  }, [token]);

  // Reloads the signed-in user (e.g. after an admin changed their role).
  const refreshUser = useCallback(async () => {
    if (!token) return;
    const user = await getCurrentUser(token);
    setSession((current) => (current?.token === token ? { ...current, user } : current));
  }, [token]);

  function retryRestore() {
    setRestoreStatus('restoring');
    setRestoreAttempt((attempt) => attempt + 1);
  }

  // Saves CPF/RG documents for the signed-in user, resolving type names (e.g. "CPF") to their ids.
  async function registerDocument(documents) {
    if (!api) throw new Error('Sua sessão expirou. Entre novamente.');
    const requested = Array.isArray(documents) ? documents : [documents];
    const normalize = (type) => String(type || '').trim().toLocaleUpperCase('pt-BR');
    if (!requested.length || new Set(requested.map(({ type }) => normalize(type))).size !== requested.length
      || requested.some(({ type, value }) => !normalize(type) || !String(value || '').trim())) {
      throw new Error('Confira os documentos informados e tente novamente.');
    }

    const availableTypes = await api.listDocumentTypes();
    const payload = requested.map(({ type, value }) => {
      const documentType = availableTypes.find((entry) => normalize(entry.type) === normalize(type));
      if (!documentType) throw new Error('O tipo de documento selecionado não está cadastrado na clínica.');
      return { type_id: documentType.id, value: String(value).trim() };
    });

    const createdDocuments = await api.registerDocuments(payload);
    setSession((current) => {
      if (current?.token !== token) return current;
      const existingIds = new Set((current.user.documents || []).map((document) => document.id));
      return {
        ...current,
        user: {
          ...current.user,
          documents: [...(current.user.documents || []), ...createdDocuments.filter((document) => !existingIds.has(document.id))],
        },
      };
    });
    return createdDocuments;
  }

  return (
    <AuthContext.Provider value={{ user: session?.user ?? null, api, signIn, logout, restoreStatus, retryRestore, registerDocument, refreshUser, sessionNotice, clearSessionNotice: () => setSessionNotice('') }}>
      {children}
    </AuthContext.Provider>
  );
}
