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
        <span>Clinic</span>
        {onCancel && <button type="button" className="login-back-button" onClick={onCancel}>Voltar para a Home</button>}
      </header>
      <main className="login-main">
        <div className="login-form-container">
          <h1>Welcome back</h1>
          <p className="login-subtitle">Sign in to your clinic account.</p>
          <form onSubmit={handleSubmit} aria-busy={pending}>
            <div className="field">
              <label htmlFor="email">Email address</label>
              <input id="email" name="email" type="email" autoComplete="username"
                placeholder="you@example.com" required maxLength={254} disabled={pending}
                value={email} onChange={(event) => { setEmail(event.target.value); setError(''); }} />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <div className="password-field">
                <input id="password" name="password" type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password" placeholder="Enter your password" required
                  maxLength={128} disabled={pending} value={password}
                  onChange={(event) => { setPassword(event.target.value); setError(''); }} />
                <button type="button" className="password-toggle" disabled={pending}
                  onClick={() => setShowPassword((value) => !value)} aria-controls="password"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button type="submit" className="primary-button" disabled={pending}>
              {pending ? <><LoaderCircle size={18} className="spinner" aria-hidden="true" /> Signing in...</>
                : <>Sign in <ArrowRight size={18} aria-hidden="true" /></>}
            </button>
          </form>
        </div>
      </main>
      <footer className="login-footer">Clinic Portal</footer>
    </div>
  );
}






