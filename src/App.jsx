import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import Login from './pages/Login/Login.jsx';
import Home from './pages/Home/Home.jsx';
import Dashboard from './pages/Dashboard/Dashboard.jsx';

function AppContent() {
  const { user, logout, restoreStatus, retryRestore } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);

  function handleLogout() {
    logout();
    setLoginOpen(false);
  }

  if (restoreStatus !== 'ready') {
    return (
      <main className="session-status">
        {restoreStatus === 'restoring' ? (
          <p>Restaurando sua sessão...</p>
        ) : (
          <>
            <h1>Não foi possível verificar sua sessão</h1>
            <p>Confira sua conexão e tente novamente.</p>
            <div className="session-status-actions">
              <button type="button" onClick={retryRestore}>Tentar novamente</button>
              <button type="button" onClick={handleLogout}>Sair da conta</button>
            </div>
          </>
        )}
      </main>
    );
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
