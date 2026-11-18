import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { login, getCurrentUser } from '../services/api.js';

const AuthContext = createContext(null);
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
  }

  function logout() {
    restoreGeneration.current += 1;
    removeStoredToken();
    setStoredToken(null);
    setSession(null);
    setRestoreStatus('ready');
  }

  function retryRestore() {
    setRestoreStatus('restoring');
    setRestoreAttempt((attempt) => attempt + 1);
  }

  return (
    <AuthContext.Provider value={{ user: session?.user ?? null, signIn, logout, restoreStatus, retryRestore }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
