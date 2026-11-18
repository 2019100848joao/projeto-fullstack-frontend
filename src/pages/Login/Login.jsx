import React, { useState } from 'react';
import { ArrowRight, Eye, EyeOff, HeartPulse, LoaderCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.jsx';

export default function Login({ onCancel }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    if (pending) return;
    setError('');
    setPending(true);
    try {
      await signIn(email.trim(), password);
    } catch (error) {
      setError(error.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="login-page">
      <header className="login-header">
        <HeartPulse size={26} aria-hidden="true" />
        <span>Clínica Saúde</span>
        {onCancel && <button type="button" className="login-back-button" onClick={onCancel}>Voltar ao início</button>}
      </header>
      <main className="login-main">
        <div className="login-form-container">
          <h1>Boas-vindas de volta</h1>
          <p className="login-subtitle">Entre na sua conta da clínica.</p>
          <form onSubmit={handleSubmit} aria-busy={pending}>
            <div className="field">
              <label htmlFor="email">E-mail</label>
              <input id="email" name="email" type="email" autoComplete="username"
                placeholder="seu@email.com" required maxLength={254} disabled={pending}
                value={email} onChange={(event) => { setEmail(event.target.value); setError(''); }} />
            </div>
            <div className="field">
              <label htmlFor="password">Senha</label>
              <div className="password-field">
                <input id="password" name="password" type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password" placeholder="Digite sua senha" required
                  maxLength={128} disabled={pending} value={password}
                  onChange={(event) => { setPassword(event.target.value); setError(''); }} />
                <button type="button" className="password-toggle" disabled={pending}
                  onClick={() => setShowPassword((value) => !value)} aria-controls="password"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button type="submit" className="primary-button" disabled={pending}>
              {pending ? <><LoaderCircle size={18} className="spinner" aria-hidden="true" /> Entrando...</>
                : <>Entrar <ArrowRight size={18} aria-hidden="true" /></>}
            </button>
          </form>
        </div>
      </main>
      <footer className="login-footer">Portal da Clínica Saúde</footer>
    </div>
  );
}






