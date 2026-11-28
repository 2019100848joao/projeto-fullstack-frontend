import { useEffect, useRef } from 'react';
import { LoaderCircle, RotateCw, X } from 'lucide-react';
import './ui.css';

export function PageHeading({ eyebrow, title, description, children }) {
  return (
    <div className="dashboard-page-heading clinic-page-heading">
      <div>
        <span className="dashboard-eyebrow">{eyebrow}</span>
        <h1 id="dashboard-title">{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {children && <div className="clinic-heading-actions">{children}</div>}
    </div>
  );
}

export function StatusBadge({ status, labels }) {
  const { label, tone } = labels[status] ?? { label: status, tone: 'neutral' };
  return <span className={`clinic-badge is-${tone}`}>{label}</span>;
}

export function FormError({ children }) {
  return children ? <p className="form-error" role="alert">{children}</p> : null;
}

/** Renders loading, error and empty states around a list, keeping stale data visible while reloading. */
export function DataView({ data, loading, error, onRetry, isEmpty, empty, children }) {
  if (error) {
    return (
      <div className="dashboard-empty-state" role="alert">
        <h2>Não foi possível carregar os dados</h2>
        <p>{error.message}</p>
        <button type="button" className="clinic-button is-secondary" onClick={onRetry}>
          <RotateCw size={16} aria-hidden="true" /> Tentar novamente
        </button>
      </div>
    );
  }

  if (data == null) {
    return (
      <p className="clinic-loading" role="status">
        <LoaderCircle className="spinner" size={18} aria-hidden="true" /> Carregando...
      </p>
    );
  }

  if (isEmpty) {
    const Icon = empty.icon;
    return (
      <div className="dashboard-empty-state">
        <span className="dashboard-empty-icon"><Icon size={30} aria-hidden="true" /></span>
        <h2>{empty.title}</h2>
        <p>{empty.text}</p>
      </div>
    );
  }

  return (
    <div className="clinic-data" aria-busy={loading}>
      {children}
    </div>
  );
}

export function Modal({ title, onClose, children }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="clinic-modal"
      aria-labelledby="clinic-modal-title"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
    >
      <div className="clinic-modal-header">
        <h2 id="clinic-modal-title">{title}</h2>
        <button type="button" className="clinic-icon-button" aria-label="Fechar" onClick={onClose}>
          <X size={20} aria-hidden="true" />
        </button>
      </div>
      {children}
    </dialog>
  );
}
