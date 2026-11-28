import { useCallback, useId, useState } from 'react';
import { UserCog } from 'lucide-react';
import { useAuth } from '../../contexts/auth.js';
import { useAsync } from '../../hooks/useAsync.js';
import { useSubmit } from '../../hooks/useSubmit.js';
import { DataView, FormError, Modal, PageHeading, StatusBadge } from '../../components/clinic/ui.jsx';
import { formatDateTime, roleNames, transitionStatus } from '../../utils/clinic.js';

const decisions = {
  approve: {
    title: 'Aprovar solicitação',
    question: (name, role) => `Aprovar ${name} como ${role}? O cargo da conta muda imediatamente.`,
    confirmLabel: 'Aprovar',
    pendingLabel: 'Aprovando...',
  },
  reject: {
    title: 'Recusar solicitação',
    question: (name, role) => `Recusar o pedido de ${name} para ${role}? O cargo atual é mantido.`,
    confirmLabel: 'Recusar',
    pendingLabel: 'Recusando...',
    danger: true,
  },
};

/** Admin: reviews requests to become a doctor or attendant. */
export default function RoleTransitions() {
  const { api } = useAuth();
  const id = useId();
  const [status, setStatus] = useState('pending');
  const [dialog, setDialog] = useState(null);

  const loadRequests = useCallback(() => api.listRoleTransitions(status), [api, status]);
  const requests = useAsync(loadRequests);
  // Requests only carry the user id; the user list resolves names and current roles.
  const loadUsers = useCallback(async () => new Map((await api.listUsers()).map((user) => [user.id, user])), [api]);
  const users = useAsync(loadUsers);

  function closeDialog(changed) {
    setDialog(null);
    if (changed) {
      requests.reload();
      users.reload();
    }
  }

  return (
    <section className="dashboard-content" aria-labelledby="dashboard-title">
      <PageHeading
        eyebrow="ADMINISTRAÇÃO"
        title="Solicitações de cargo"
        description="Pedidos de usuários para atuar como médico ou atendente."
      />

      <div className="clinic-toolbar">
        <div className="clinic-field">
          <label htmlFor={`${id}-status`}>Status</label>
          <select id={`${id}-status`} value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">Todas</option>
            {Object.entries(transitionStatus).map(([value, { label }]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
      </div>
      <FormError>{users.error && `Não foi possível carregar os usuários. ${users.error.message}`}</FormError>

      <DataView
        {...requests}
        onRetry={requests.reload}
        isEmpty={requests.data?.length === 0}
        empty={{ icon: UserCog, title: 'Nenhuma solicitação', text: status === 'pending' ? 'Não há pedidos aguardando análise.' : 'Nenhum pedido com este status.' }}
      >
        <ul className="clinic-list">
          {requests.data?.map((request) => {
            const requester = users.data?.get(request.user_id);
            const name = requester?.full_name ?? 'Usuário';
            return (
              <li key={request.id} className="clinic-card clinic-row">
                <div className="clinic-row-main">
                  <strong>{name}</strong>
                  {requester && <span>{requester.email} · cargo atual: {roleNames[requester.role]}</span>}
                  <span>Solicita: {roleNames[request.requested_role]} · enviada em {formatDateTime(request.created_at)}</span>
                  {request.reviewed_at && <span>Analisada em {formatDateTime(request.reviewed_at)}</span>}
                </div>
                <StatusBadge status={request.status} labels={transitionStatus} />
                {request.status === 'pending' && (
                  <div className="clinic-row-actions">
                    <button type="button" className="clinic-button is-small" onClick={() => setDialog({ type: 'approve', request, name })}>Aprovar</button>
                    <button type="button" className="clinic-button is-secondary is-small" onClick={() => setDialog({ type: 'reject', request, name })}>Recusar</button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </DataView>

      {dialog && (
        <ReviewDialog
          {...decisions[dialog.type]}
          question={decisions[dialog.type].question(dialog.name, roleNames[dialog.request.requested_role])}
          action={() => (dialog.type === 'approve' ? api.approveRoleTransition(dialog.request.id) : api.rejectRoleTransition(dialog.request.id))}
          onClose={closeDialog}
        />
      )}
    </section>
  );
}

function ReviewDialog({ title, question, confirmLabel, pendingLabel, danger = false, action, onClose }) {
  const submit = useSubmit(action);

  async function handleConfirm() {
    if (await submit.run()) onClose(true);
  }

  return (
    <Modal title={title} onClose={() => onClose(Boolean(submit.error))}>
      <div className="clinic-form">
        <p className="clinic-dialog-text">{question}</p>
        <FormError>{submit.error}</FormError>
        <div className="clinic-form-actions">
          <button type="button" className="clinic-button is-secondary" onClick={() => onClose(Boolean(submit.error))}>Voltar</button>
          <button type="button" className={`clinic-button${danger ? ' is-danger' : ''}`} disabled={submit.pending} onClick={handleConfirm}>
            {submit.pending ? pendingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
