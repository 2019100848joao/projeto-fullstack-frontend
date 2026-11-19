import { useState } from 'react';
import { ArrowRight, Eye, EyeOff, HeartPulse, LoaderCircle } from 'lucide-react';
import { useAuth } from '../../contexts/auth.js';

const MIN_PASSWORD = 8;
const MAX_PASSWORD = 128;

function validate({ fullName, password, confirmation }) {
  if (!fullName.trim()) return 'Informe seu nome completo.';
  if (password.length < MIN_PASSWORD) return `A senha deve ter pelo menos ${MIN_PASSWORD} caracteres.`;
  if (password !== confirmation) return 'As senhas não conferem.';
  return '';
}

export default function Register({ onCancel, onLogin }) {
  const { signUp } = useAuth();
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirmation: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  function update(field) {
    return (event) => {
      setForm({ ...form, [field]: event.target.value });
      setError('');
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (pending) return;
    const validationError = validate(form);
    if (validationError) return setError(validationError);

    setPending(true);
    try {
      await signUp({ fullName: form.fullName.trim(), email: form.email.trim(), password: form.password });
    } catch (caught) {
      setError(caught.message);
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
          <h1>Crie sua conta</h1>
          <p className="login-subtitle">Cadastre-se como paciente para acompanhar suas consultas e exames.</p>
          <form onSubmit={handleSubmit} aria-busy={pending}>
            <div className="field">
              <label htmlFor="register-name">Nome completo</label>
              <input id="register-name" name="name" autoComplete="name" required maxLength={255}
                disabled={pending} value={form.fullName} onChange={update('fullName')} />
            </div>
            <div className="field">
              <label htmlFor="register-email">E-mail</label>
              <input id="register-email" name="email" type="email" autoComplete="email" placeholder="seu@email.com"
                required maxLength={254} disabled={pending} value={form.email} onChange={update('email')} />
            </div>
            <div className="field">
              <label htmlFor="register-password">Senha</label>
              <div className="password-field">
                <input id="register-password" name="password" type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password" required minLength={MIN_PASSWORD} maxLength={MAX_PASSWORD}
                  aria-describedby="register-password-hint" disabled={pending}
                  value={form.password} onChange={update('password')} />
                <button type="button" className="password-toggle" disabled={pending}
                  onClick={() => setShowPassword((value) => !value)} aria-controls="register-password register-confirmation"
                  aria-label={showPassword ? 'Ocultar senhas' : 'Mostrar senhas'}
                  title={showPassword ? 'Ocultar senhas' : 'Mostrar senhas'}>
                  {showPassword ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
                </button>
              </div>
              <p id="register-password-hint" className="field-hint">Mínimo de {MIN_PASSWORD} caracteres.</p>
            </div>
            <div className="field">
              <label htmlFor="register-confirmation">Confirmar senha</label>
              <input id="register-confirmation" name="confirmation" type={showPassword ? 'text' : 'password'}
                autoComplete="new-password" required maxLength={MAX_PASSWORD} disabled={pending}
                value={form.confirmation} onChange={update('confirmation')} />
            </div>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button type="submit" className="auth-submit-button" disabled={pending}>
              {pending ? <><LoaderCircle size={18} className="spinner" aria-hidden="true" /> Criando conta...</>
                : <>Criar conta <ArrowRight size={18} aria-hidden="true" /></>}
            </button>
          </form>
          <div className="auth-switch">
            <span>Já tem conta?</span>
            <button type="button" className="auth-switch-link" onClick={onLogin} disabled={pending}>Entrar</button>
          </div>
        </div>
      </main>
      <footer className="login-footer">Portal da Clínica Saúde</footer>
    </div>
  );
}
