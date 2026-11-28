import { useCallback, useEffect, useId, useState } from 'react';
import { useAuth } from '../../contexts/auth.js';
import { useAsync } from '../../hooks/useAsync.js';
import { useSubmit } from '../../hooks/useSubmit.js';
import { FormError, StatusBadge } from '../../components/clinic/ui.jsx';
import { formatDateTime, roleNames, transitionRoles, transitionStatus } from '../../utils/clinic.js';

/** Lets a non-admin user ask to become a doctor or attendant and follow the request. */
export default function RoleRequestCard({ user }) {
  const { api, refreshUser } = useAuth();
  const id = useId();
  const loadRequests = useCallback(() => api.listMyRoleTransitions(), [api]);
  const requests = useAsync(loadRequests);
  const options = transitionRoles.filter((role) => role !== user.role);
  const [choice, setChoice] = useState(options[0]);
  // The role may change after an approval; never keep a choice that is no longer offered.
  const requestedRole = options.includes(choice) ? choice : options[0];
  const submit = useSubmit(() => api.requestRoleTransition(requestedRole));

  const latest = requests.data?.[0];
  const pending = requests.data?.find((request) => request.status === 'pending');

  // An approval changes the role on the server; reload the user so menus follow it.
  useEffect(() => {
    if (latest?.status === 'approved' && latest.requested_role !== user.role) {
      refreshUser().catch(() => {});
    }
  }, [latest, user.role, refreshUser]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (await submit.run()) requests.reload();
  }

  return (
    <div className="dashboard-account-card">
      <span className="dashboard-card-label">CARGO</span>
      <h2>Mudança de cargo</h2>

      {requests.error && <FormError>{`Não foi possível carregar suas solicitações. ${requests.error.message}`}</FormError>}

      {latest && (
        <p className="profile-document-status">
          Última solicitação: <strong>{roleNames[latest.requested_role]}</strong>, enviada em {formatDateTime(latest.created_at)}{' '}
          <StatusBadge status={latest.status} labels={transitionStatus} />
          {latest.reviewed_at && <> · analisada em {formatDateTime(latest.reviewed_at)}</>}
        </p>
      )}

      {pending ? (
        <p className="profile-document-status">A administração vai analisar seu pedido. Você recebe a resposta em Notificações.</p>
      ) : requests.data && (
        <form onSubmit={handleSubmit} aria-busy={submit.pending}>
          <fieldset className="profile-document-choice" disabled={submit.pending}>
            <legend>Solicitar o cargo de</legend>
            {options.map((role) => (
              <label key={role}>
                <input
                  type="radio"
                  name={`${id}-role`}
                  value={role}
                  checked={requestedRole === role}
                  onChange={() => setChoice(role)}
                />
                {roleNames[role]}
              </label>
            ))}
          </fieldset>
          <FormError>{submit.error}</FormError>
          <button className="primary-button" type="submit" disabled={submit.pending}>
            {submit.pending ? 'Enviando...' : 'Enviar solicitação'}
          </button>
        </form>
      )}
    </div>
  );
}
