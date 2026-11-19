import { useState } from 'react';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { useAuth } from './contexts/auth.js';
import Login from './pages/Login/Login.jsx';
import Register from './pages/Register/Register.jsx';
import Home from './pages/Home/Home.jsx';
import Dashboard from './pages/Dashboard/Dashboard.jsx';

function AppContent() {
  const { user, logout, restoreStatus, retryRestore } = useAuth();
  const [screen, setScreen] = useState('home');

  function handleLogout() {
    logout();
    setScreen('home');
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

  if (screen === 'login') {
    return <Login onCancel={() => setScreen('home')} onRegister={() => setScreen('register')} />;
  }

  if (screen === 'register') {
    return <Register onCancel={() => setScreen('home')} onLogin={() => setScreen('login')} />;
  }

  return <Home onLogin={() => setScreen('login')} />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
