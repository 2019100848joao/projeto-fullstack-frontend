import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import Login from './pages/Login/Login.jsx';
import Home from './pages/Home.jsx';

function AppContent() {
  const { user } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);

  if (loginOpen && !user) {
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
