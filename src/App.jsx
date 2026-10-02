import React from 'react';
import { HeartPulse, LogOut } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import Login from './pages/Login/Login.jsx';

function AppContent() {
  const { user, logout } = useAuth();

  if (!user) return <Login />;

  return (
    <main className="signed-in">
      <HeartPulse size={32} aria-hidden="true" className="brand-icon" />
      <h1>Welcome, {user.full_name}</h1>
      <p>{user.email}</p>
      <span className="role">{user.role}</span>
      <button className="primary-button" onClick={logout}>
        <LogOut size={18} aria-hidden="true" /> Sign out
      </button>
    </main>
  );
}

export default function App() {
  return <AuthProvider><AppContent /></AuthProvider>;
}
