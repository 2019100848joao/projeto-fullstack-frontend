import { useCallback, useEffect, useId, useState } from 'react';
import { BellRing, CircleCheck, CircleX, Mail, Send, UserPlus } from 'lucide-react';
import { useAuth } from '../../contexts/auth.js';
import { useAsync } from '../../hooks/useAsync.js';
import { DataView, PageHeading } from '../../components/clinic/ui.jsx';
import { emailEvents, formatDay, formatTime, groupByDay, toDateInput } from '../../utils/clinic.js';
import './Notifications.css';

// Icon and color per kind of e-mail, so the outcome is visible before reading the text.
const eventStyles = {
  user_registered: { icon: UserPlus, tone: 'teal' },
  role_transition_requested: { icon: Send, tone: 'blue' },
  role_transition_admin_alert: { icon: BellRing, tone: 'amber' },
  role_transition_approved: { icon: CircleCheck, tone: 'green' },
  role_transition_rejected: { icon: CircleX, tone: 'red' },
};

function dayTitle(value) {
  const day = toDateInput(new Date(value));
  const today = new Date();
  if (day === toDateInput(today)) return 'Hoje';
  today.setDate(today.getDate() - 1);
  if (day === toDateInput(today)) return 'Ontem';
  return formatDay(value);
}

/**
 * E-mails the system recorded. The backend returns every e-mail to the admin and only
 * the user's own e-mails to everyone else.
 */
export default function Notifications({ user }) {
  const { api, refreshUser } = useAuth();
  const id = useId();
  const isAdmin = user.role === 'admin';
  const [event, setEvent] = useState('');
  const loadEmails = useCallback(() => api.listEmailNotifications(), [api]);
  const emails = useAsync(loadEmails);

  // A decision on a role request may have changed this user's role since login.
  useEffect(() => {
    if (!isAdmin) refreshUser().catch(() => {});
  }, [isAdmin, refreshUser]);

  const visible = emails.data
    ?.filter((email) => !event || email.event_type === event)
    .toSorted((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return (
    <section className="dashboard-content" aria-labelledby="dashboard-title">
      <PageHeading
        eyebrow={isAdmin ? 'ADMINISTRAÇÃO' : 'CONTA'}
        title={isAdmin ? 'E-mails enviados' : 'Notificações'}
        description={isAdmin
          ? 'Registro de todos os e-mails gerados pelo sistema.'
          : 'E-mails enviados para você sobre seu cadastro e suas solicitações.'}
      />

      {isAdmin && (
        <div className="clinic-toolbar">
          <div className="clinic-field">
            <label htmlFor={`${id}-event`}>Tipo</label>
            <select id={`${id}-event`} value={event} onChange={(changeEvent) => setEvent(changeEvent.target.value)}>
              <option value="">Todos</option>
              {Object.entries(emailEvents).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
        </div>
      )}

      <DataView
        {...emails}
        onRetry={emails.reload}
        isEmpty={visible?.length === 0}
        empty={{ icon: Mail, title: 'Nenhuma notificação', text: 'Os e-mails sobre cadastro e solicitações de cargo aparecem aqui.' }}
      >
        <p className="email-count">{visible?.length} {visible?.length === 1 ? 'e-mail' : 'e-mails'}</p>
        {visible && groupByDay(visible, (email) => email.created_at).map(([day, items]) => (
          <section key={day} className="email-day" aria-label={dayTitle(items[0].created_at)}>
            <h2 className="clinic-group-title">{dayTitle(items[0].created_at)}</h2>
            <ul className="clinic-list">
              {items.map((email) => {
                const { icon: Icon, tone } = eventStyles[email.event_type] ?? { icon: Mail, tone: 'teal' };
                return (
                  <li key={email.id} className="clinic-card email-item">
                    <span className={`email-icon is-${tone}`} aria-hidden="true"><Icon size={18} /></span>
                    <div className="email-content">
                      <div className="email-header">
                        <strong className="email-subject">{email.subject}</strong>
                        <time className="email-time" dateTime={email.created_at}>{formatTime(email.created_at)}</time>
                      </div>
                      <div className="email-meta">
                        <span className={`email-tag is-${tone}`}>{emailEvents[email.event_type] ?? email.event_type}</span>
                        {isAdmin && <span className="email-recipient">Para {email.recipient_email}</span>}
                      </div>
                      <p className="email-body">{email.body}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </DataView>
    </section>
  );
}
