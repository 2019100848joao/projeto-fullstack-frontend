import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import Login from './pages/Login/Login.jsx';
import Home from './pages/Home/Home.jsx';
import Dashboard from './pages/Dashboard/Dashboard.jsx';

function AppContent() {
  const { user, logout } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);

  function handleLogout() {
    logout();
    setLoginOpen(false);
  }

  if (user) {
    return <Dashboard user={user} onLogout={handleLogout} />;
  }

  if (loginOpen) {
    return <Login onCancel={() => setLoginOpen(false)} />;
  }

  return <Home onLogin={() => setLoginOpen(true)} />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
