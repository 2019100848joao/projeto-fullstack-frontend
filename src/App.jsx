import { useEffect, useRef, useState } from "react";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import { useAuth } from "./contexts/auth.js";
import { register } from "./services/api.js";
import Login from "./pages/Login/Login.jsx";
import SignUp from "./pages/SignUp.jsx";
import Home from "./pages/Home/Home.jsx";
import Dashboard from "./pages/Dashboard/Dashboard.jsx";
import SuccessToast from "./components/SuccessToast.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";

const DOCUMENT_TYPES = ["CPF", "RG"];

function Reminder({ open, missingTypes, onDismiss, onSuccess }) {
  const { registerDocument } = useAuth();
  const dialogRef = useRef(null);
  const returnFocusRef = useRef(null);
  const onDismissRef = useRef(onDismiss);
  const [documentType, setDocumentType] = useState(missingTypes[0] || "CPF");
  const [documentValue, setDocumentValue] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    onDismissRef.current = pending ? () => {} : onDismiss;
  }, [onDismiss, pending]);

  useEffect(() => {
    if (!open) return undefined;

    const activeElement = document.activeElement;
    returnFocusRef.current = activeElement instanceof HTMLElement && activeElement !== document.body
      ? activeElement
      : null;

    const focusableSelector = [
      "a[href]",
      "button:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      '[tabindex]:not([tabindex="-1"])',
    ].join(",");
    const focusFirst = () => {
      const firstFocusable = dialogRef.current?.querySelector(focusableSelector);
      (firstFocusable || dialogRef.current)?.focus();
    };
    const focusFrame = window.requestAnimationFrame(focusFirst);

    function containFocus(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        onDismissRef.current();
        return;
      }
      if (event.key !== "Tab") return;

      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusableElements = [...dialog.querySelectorAll(focusableSelector)];
      if (!focusableElements.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", containFocus);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", containFocus);
      const returnTarget = returnFocusRef.current;
      window.requestAnimationFrame(() => {
        if (returnTarget?.isConnected) {
          returnTarget.focus();
        } else {
          document.querySelector(".navbar-account-trigger")?.focus();
        }
      });
    };
  }, [open]);

  async function submit(event) {
    event.preventDefault();
    if (pending) return;
    const value = documentType === "CPF" ? documentValue.replace(/\D/g, "") : documentValue.trim();
    if (!value) {
      setError(`Informe ${documentType === "CPF" ? "um CPF" : "um RG"}.`);
      return;
    }
    if (documentType === "CPF" && value.length !== 11) {
      setError("O CPF deve conter 11 números.");
      return;
    }
    if (documentType === "RG" && value.length > 255) {
      setError("O RG deve ter no máximo 255 caracteres.");
      return;
    }

    setError("");
    setPending(true);
    try {
      await registerDocument([{ type: documentType, value }]);
      onSuccess();
      onDismiss();
    } catch (requestError) {
      setError(requestError.message || "Não foi possível salvar os documentos.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className={`document-reminder-overlay${open ? " is-visible" : ""}`}
      aria-hidden={!open}
      inert={!open}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reminder-title"
        aria-hidden={!open}
        tabIndex={-1}
      >
        <h2 id="reminder-title">Cadastre seus documentos</h2>
        <p>Escolha qual documento deseja cadastrar. Este lembrete pode ser fechado.</p>
        <form onSubmit={submit} aria-busy={pending}>
          <fieldset className="profile-document-choice" disabled={pending}>
            <legend>Escolha o documento</legend>
            {missingTypes.map((type) => (
              <label key={type}>
                <input
                  type="radio"
                  name="reminder-document-type"
                  value={type}
                  checked={documentType === type}
                  onChange={() => {
                    setDocumentType(type);
                    setDocumentValue("");
                    setError("");
                  }}
                />
                {type}
              </label>
            ))}
          </fieldset>
          <div className="field">
            <label htmlFor="reminder-document-value">{documentType}</label>
            <input
              id="reminder-document-value"
              type="text"
              placeholder={documentType === "CPF" ? "Digite seu CPF" : "Digite seu RG"}
              inputMode={documentType === "CPF" ? "numeric" : "text"}
              autoComplete="off"
              maxLength={documentType === "CPF" ? 11 : 255}
              value={documentValue}
              onChange={(event) => {
                const value = documentType === "CPF"
                  ? event.target.value.replace(/\D/g, "")
                  : event.target.value;
                setDocumentValue(value);
                setError("");
              }}
              disabled={pending}
            />
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary-button" type="submit" disabled={pending}>
            {pending ? "Salvando..." : "Salvar documento"}
          </button>
          <div className="session-status-actions">
            <button type="button" onClick={onDismiss} disabled={pending}>
              Agora não
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function AppContent() {
  const { user, logout, restoreStatus, retryRestore, sessionNotice, clearSessionNotice } = useAuth();
  const [screen, setScreen] = useState("dashboard");
  const [dashboardInitialSection, setDashboardInitialSection] = useState("home");
  const [dismissedReminderFor, setDismissedReminderFor] = useState(null);
  const [toast, setToast] = useState(null);

  function leave() {
    logout();
    setScreen("home");
    setDashboardInitialSection("home");
    setDismissedReminderFor(null);
  }

  if (restoreStatus === "restoring")
    return (
      <main className="session-status">
        <p>Restaurando sua sessão...</p>
      </main>
    );
  if (restoreStatus !== "ready")
    return (
      <main className="session-status">
        <h1>Não foi possível verificar sua sessão</h1>
        <p>Confira sua conexão e tente novamente.</p>
        <div className="session-status-actions">
          <button type="button" onClick={retryRestore}>
            Tentar novamente
          </button>
          <button type="button" onClick={leave}>
            Sair da conta
          </button>
        </div>
      </main>
    );

  const savedTypes = new Set(
    (user?.documents || []).map((document) =>
      String(document.document_type?.type || "").trim().toLocaleUpperCase("pt-BR"),
    ),
  );
  const missingTypes = DOCUMENT_TYPES.filter((type) => !savedTypes.has(type));
  const hasRequiredDocument = missingTypes.length < DOCUMENT_TYPES.length;
  const reminderOpen = Boolean(
    user && !hasRequiredDocument && dismissedReminderFor !== user.id,
  );
  let currentScreen;

  if (user && screen === "dashboard") {
    currentScreen = (
      <Dashboard
        user={user}
        initialSection={dashboardInitialSection}
        onLogout={leave}
      />
    );
  } else if (!user && (screen === "login" || sessionNotice)) {
    currentScreen = (
      <Login
        notice={sessionNotice}
        onCancel={() => {
          clearSessionNotice();
          setScreen("home");
        }}
        onSuccess={() => {
          setDashboardInitialSection("home");
          setScreen("dashboard");
        }}
        onRegister={() => {
          clearSessionNotice();
          setScreen("signup");
        }}
      />
    );
  } else if (screen === "signup") {
    currentScreen = (
      <SignUp
        onCancel={() => setScreen("home")}
        onSubmit={async (data) => {
          await register({ fullName: data.full_name, email: data.email, password: data.password });
          setScreen("login");
        }}
      />
    );
  } else {
    currentScreen = (
      <Home
        user={user}
        onLogin={() => {
          if (user) {
            setDashboardInitialSection("home");
            setScreen("dashboard");
          } else {
            setScreen("login");
          }
        }}
        onSignUp={() => {
          if (user) {
            setDashboardInitialSection("home");
            setScreen("dashboard");
          } else {
            setScreen("signup");
          }
        }}
        onLogout={leave}
        onNavigateToProfile={() => {
          setDashboardInitialSection("profile");
          setScreen("dashboard");
        }}
      />
    );
  }

  return (
    <>
      <ErrorBoundary>{currentScreen}</ErrorBoundary>
      <Reminder
        key={user?.id ?? "anonymous"}
        open={reminderOpen}
        missingTypes={missingTypes}
        onDismiss={() => setDismissedReminderFor(user?.id)}
        onSuccess={() => setToast({ id: Date.now(), message: "Documento cadastrado com sucesso!", variant: "document" })}
      />
      {toast && <SuccessToast key={toast.id} message={toast.message} variant={toast.variant} />}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
