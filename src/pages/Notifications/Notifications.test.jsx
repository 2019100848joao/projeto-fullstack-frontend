import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithAuth } from '../../test/renderWithAuth.jsx';
import Notifications from './Notifications.jsx';

const email = (id, eventType, createdAt, recipient = 'paula@example.com') => ({
  id,
  recipient_email: recipient,
  subject: `Assunto ${id}`,
  body: `Corpo ${id}`,
  event_type: eventType,
  created_at: createdAt,
});

const emails = [
  email('e1', 'user_registered', '2026-11-20T10:00:00Z'),
  email('e2', 'role_transition_admin_alert', '2026-11-21T10:00:00Z', 'admin@example.com'),
  email('e3', 'role_transition_approved', '2026-11-22T10:00:00Z'),
];

describe('Notifications', () => {
  it('shows the user their e-mails, newest first, and reloads their role', async () => {
    const refreshUser = vi.fn().mockResolvedValue();
    const api = { listEmailNotifications: vi.fn().mockResolvedValue([emails[0], emails[2]]) };
    renderWithAuth(<Notifications user={{ role: 'patient' }} />, { api, refreshUser });

    const items = await screen.findAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Assunto e3');
    expect(items[1]).toHaveTextContent('Assunto e1');
    expect(screen.queryByText(/Para /)).not.toBeInTheDocument();
    expect(refreshUser).toHaveBeenCalled();
  });

  it('lets the admin filter the full log by type', async () => {
    const refreshUser = vi.fn();
    renderWithAuth(<Notifications user={{ role: 'admin' }} />, { api: { listEmailNotifications: vi.fn().mockResolvedValue(emails) }, refreshUser });

    expect(await screen.findAllByRole('listitem')).toHaveLength(3);
    await userEvent.selectOptions(screen.getByLabelText('Tipo'), 'role_transition_admin_alert');

    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByText(/Para admin@example.com/)).toBeInTheDocument();
    expect(refreshUser).not.toHaveBeenCalled();
  });
});
