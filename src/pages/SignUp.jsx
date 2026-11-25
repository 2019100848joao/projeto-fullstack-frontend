import { useState } from "react";
import { ArrowRight, Eye, EyeOff, HeartPulse, LoaderCircle } from "lucide-react";
import "./SignUp.css";

export default function SignUp({ onCancel, onSubmit }) {
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    if (pending) return;

    const fullName = `${first.trim()} ${last.trim()}`.trim();
    if (!first.trim() || !last.trim()) {
      setError("Informe nome e sobrenome.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Informe um e-mail válido.");
      return;
    }
    if (password.length < 8 || password.length > 128) {
      setError("A senha deve ter entre 8 e 128 caracteres.");
      return;
    }
    if (fullName.length > 255) {
      setError("O nome completo deve ter no máximo 255 caracteres.");
      return;
    }

    setError("");
    setPending(true);
    try {
      await onSubmit({
        full_name: fullName,
        email: email.trim(),
        password,
      });
    } catch (submitError) {
      setError(submitError.message || "Não foi possível criar a conta.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="login-page">
      <header className="login-header">
        <HeartPulse aria-hidden="true" />
        <span>Clínica Saúde</span>
        <button
          type="button"
          className="login-back-button"
          onClick={onCancel}
          disabled={pending}
        >
          Voltar ao início
        </button>
      </header>
      <main className="login-main">
        <section className="login-form-container signup-container">
          <h1>Crie sua conta</h1>
          <p className="login-subtitle">Informe seus dados para começar.</p>
          <form onSubmit={submit} noValidate aria-busy={pending}>
            <div className="signup-names">
              <div className="field">
                <label htmlFor="first">Nome</label>
                <input
                  id="first"
                  autoComplete="given-name"
                  value={first}
                  onChange={(event) => {
                    setFirst(event.target.value);
                    setError("");
                  }}
                  disabled={pending}
                />
              </div>
              <div className="field">
                <label htmlFor="last">Sobrenome</label>
                <input
                  id="last"
                  autoComplete="family-name"
                  value={last}
                  onChange={(event) => {
                    setLast(event.target.value);
                    setError("");
                  }}
                  disabled={pending}
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="email-signup">E-mail</label>
              <input
                id="email-signup"
                type="email"
                autoComplete="email"
                maxLength={255}
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError("");
                }}
                disabled={pending}
              />
            </div>
            <div className="field">
              <label htmlFor="password-signup">Crie uma senha</label>
              <div className="password-field">
                <input
                  id="password-signup"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={128}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setError("");
                  }}
                  disabled={pending}
                />
                <button
                  className="password-toggle"
                  type="button"
                  onClick={() => setShowPassword((shown) => !shown)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  disabled={pending}
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>
            </div>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button className="primary-button" type="submit" disabled={pending}>
              {pending ? (
                <>
                  <LoaderCircle size={18} className="spinner" aria-hidden="true" />
                  Criando conta...
                </>
              ) : (
                <>
                  Criar conta <ArrowRight size={18} aria-hidden="true" />
                </>
              )}
            </button>
          </form>
        </section>
      </main>
      <footer className="login-footer">Portal da Clínica Saúde</footer>
    </div>
  );
}
