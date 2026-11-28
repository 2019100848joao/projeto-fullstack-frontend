export const appointmentStatus = {
  scheduled: { label: 'Agendada', tone: 'info' },
  completed: { label: 'Realizada', tone: 'success' },
  no_show: { label: 'Não compareceu', tone: 'warning' },
  cancelled: { label: 'Cancelada', tone: 'muted' },
};

// Display-only state: still scheduled, but its time has passed without attendance or no-show.
export const appointmentLabels = {
  ...appointmentStatus,
  overdue: { label: 'Aguardando registro', tone: 'warning' },
};

export function isOverdue(appointment, now = new Date()) {
  return appointment.status === 'scheduled' && new Date(appointment.scheduled_at) <= now;
}

export function displayStatus(appointment) {
  return isOverdue(appointment) ? 'overdue' : appointment.status;
}

export const roleNames = {
  admin: 'Administração',
  attendant: 'Atendente',
  doctor: 'Médico',
  patient: 'Paciente',
};

/** Roles a user can ask to move to (the backend accepts only these). */
export const transitionRoles = ['doctor', 'attendant'];

export const transitionStatus = {
  pending: { label: 'Em análise', tone: 'warning' },
  approved: { label: 'Aprovada', tone: 'success' },
  rejected: { label: 'Recusada', tone: 'muted' },
};

export const emailEvents = {
  user_registered: 'Cadastro',
  role_transition_requested: 'Solicitação enviada',
  role_transition_admin_alert: 'Alerta à administração',
  role_transition_approved: 'Solicitação aprovada',
  role_transition_rejected: 'Solicitação recusada',
};

export const examStatus = {
  requested: { label: 'Solicitado', tone: 'warning' },
  scheduled: { label: 'Agendado', tone: 'info' },
  performed: { label: 'Realizado', tone: 'neutral' },
  result_available: { label: 'Resultado disponível', tone: 'success' },
};

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const timeFormatter = new Intl.DateTimeFormat('pt-BR', { timeStyle: 'short' });
const dayFormatter = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

export const formatDateTime = (value) => (value ? dateTimeFormatter.format(new Date(value)) : '—');
export const formatTime = (value) => timeFormatter.format(new Date(value));
export const formatDay = (value) => dayFormatter.format(new Date(value));

// Local calendar date as YYYY-MM-DD (toISOString would shift it to UTC).
export function toDateInput(date) {
  const pad = (number) => String(number).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Local time as HH:MM, the format of the slots.
export function toTimeInput(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** Slots of a doctor already taken on a local date (cancelled appointments free their slot). */
export function occupiedSlots(appointments, date, ignoreId) {
  return new Set(
    appointments
      .filter((item) => item.status !== 'cancelled' && item.id !== ignoreId)
      .map((item) => new Date(item.scheduled_at))
      .filter((start) => toDateInput(start) === date)
      .map(toTimeInput),
  );
}

export function fromDateInput(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// The backend accepts appointments only in the future and on 30-minute slots.
export const SLOT_MINUTES = 30;

// Business hours: appointments start from 07:00 and the last one ends at 18:00.
export const BUSINESS_HOURS = { start: 7, end: 18 };

export const daySlots = Array.from(
  { length: ((BUSINESS_HOURS.end - BUSINESS_HOURS.start) * 60) / SLOT_MINUTES },
  (_, index) => {
    const minutes = BUSINESS_HOURS.start * 60 + index * SLOT_MINUTES;
    return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  },
);

/** Combines a local date and time into an ISO timestamp with timezone, as the API requires. */
export function toApiDateTime(date, time) {
  return new Date(`${date}T${time}`).toISOString();
}

export function isPast(date, time) {
  return new Date(`${date}T${time}`) <= new Date();
}

export function groupByDay(items, getDate) {
  const groups = new Map();
  for (const item of items) {
    const key = toDateInput(new Date(getDate(item)));
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  return [...groups];
}
