import React, { createContext, useContext, useState } from 'react';
import { login, getCurrentUser } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);

  async function signIn(email, password) {
    const { access_token: token } = await login(email, password);
    const user = await getCurrentUser(token);
    setSession({ token, user });
  }

  return (
    <AuthContext.Provider value={{ user: session?.user ?? null, signIn, logout: () => setSession(null) }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
