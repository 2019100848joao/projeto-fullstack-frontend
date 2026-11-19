import { useCallback, useId, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/auth.js';
import { useAsync } from '../../hooks/useAsync.js';
import { useSubmit } from '../../hooks/useSubmit.js';
import { DataView, FormError, Modal, PageHeading, StatusBadge } from '../../components/clinic/ui.jsx';
import {
  appointmentLabels,
  displayStatus,
  examStatus,
  isOverdue,
  formatDateTime,
  formatDay,
  formatTime,
  fromDateInput,
  groupByDay,
  toDateInput,
} from '../../utils/clinic.js';

const views = [
  { id: 'day', label: 'Dia' },
  { id: 'week', label: 'Semana' },
  { id: 'month', label: 'Mês' },
];

const monthFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });
const shortFormatter = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' });

function shift(date, view, direction) {
  const next = new Date(date);
  if (view === 'month') {
    next.setDate(1);
    next.setMonth(next.getMonth() + direction);
  } else {
    next.setDate(next.getDate() + direction * (view === 'week' ? 7 : 1));
  }
  return next;
}

// Mirrors the backend periods: weeks start on Monday.
function periodLabel(date, view) {
  if (view === 'day') return formatDay(date);
  if (view === 'month') return monthFormatter.format(date);
  const monday = new Date(date);
  monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return `${shortFormatter.format(monday)} – ${shortFormatter.format(sunday)}`;
}

function Calendar({ user }) {
  const { api } = useAuth();
  const id = useId();
  const isAdmin = user.role === 'admin';
  const [view, setView] = useState('week');
  const [date, setDate] = useState(() => toDateInput(new Date()));
  const [doctorId, setDoctorId] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  const loadDoctors = useCallback(
    () => (isAdmin ? api.listUsers('doctor') : Promise.resolve([])),
    [api, isAdmin],
  );
  const doctors = useAsync(loadDoctors);

  const loadCalendar = useCallback(
    () => (isAdmin && !doctorId ? Promise.resolve(null) : api.getCalendar({ view, date, doctorId: isAdmin ? doctorId : undefined })),
    [api, isAdmin, doctorId, view, date],
  );
  const calendar = useAsync(loadCalendar);
  const appointments = calendar.data?.appointments ?? [];
  const selected = appointments.find((appointment) => appointment.id === selectedId);
  const reference = fromDateInput(date);

  return (
    <section className="dashboard-content" aria-labelledby="dashboard-title">
      <PageHeading
        eyebrow="ATENDIMENTOS"
        title={isAdmin ? 'Agenda dos médicos' : 'Minha agenda'}
        description="Veja as consultas por dia, semana ou mês e registre os atendimentos."
      />

      <div className="clinic-toolbar">
        {isAdmin && (
          <div className="clinic-field">
            <label htmlFor={`${id}-doctor`}>Médico</label>
            <select id={`${id}-doctor`} value={doctorId} onChange={(event) => setDoctorId(event.target.value)}>
              <option value="">Selecione</option>
              {doctors.data?.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.full_name}</option>)}
            </select>
          </div>
        )}
        <div className="calendar-views" role="group" aria-label="Período">
          {views.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`calendar-view${view === option.id ? ' is-active' : ''}`}
              aria-pressed={view === option.id}
              onClick={() => setView(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="calendar-navigation">
          <button type="button" className="clinic-icon-button" aria-label="Período anterior" onClick={() => setDate(toDateInput(shift(reference, view, -1)))}>
            <ChevronLeft size={20} aria-hidden="true" />
          </button>
          <button type="button" className="clinic-button is-secondary is-small" onClick={() => setDate(toDateInput(new Date()))}>Hoje</button>
          <button type="button" className="clinic-icon-button" aria-label="Próximo período" onClick={() => setDate(toDateInput(shift(reference, view, 1)))}>
            <ChevronRight size={20} aria-hidden="true" />
          </button>
          <strong className="calendar-period" aria-live="polite">{periodLabel(reference, view)}</strong>
        </div>
      </div>
      <FormError>{doctors.error && `Não foi possível carregar os médicos. ${doctors.error.message}`}</FormError>

      {isAdmin && !doctorId ? (
        <div className="dashboard-empty-state">
          <span className="dashboard-empty-icon"><CalendarDays size={30} aria-hidden="true" /></span>
          <h2>Selecione um médico</h2>
          <p>Escolha um médico para ver a agenda dele.</p>
        </div>
      ) : (
        <DataView
          {...calendar}
          onRetry={calendar.reload}
          isEmpty={appointments.length === 0}
          empty={{ icon: CalendarDays, title: 'Nenhuma consulta no período', text: 'Use as setas para navegar por outros períodos.' }}
        >
          {groupByDay(appointments, (item) => item.scheduled_at).map(([day, items]) => (
            <div key={day}>
              <h2 className="clinic-group-title">{formatDay(items[0].scheduled_at)}</h2>
              <ul className="clinic-list">
                {items.map((appointment) => (
                  <li key={appointment.id}>
                    <button type="button" className="clinic-card clinic-row calendar-item" onClick={() => setSelectedId(appointment.id)}>
                      <strong className="appointment-time">{formatTime(appointment.scheduled_at)}</strong>
                      <span className="clinic-row-main">
                        <strong>{appointment.patient.full_name}</strong>
                        <span>{appointment.patient.email}</span>
                      </span>
                      <StatusBadge status={displayStatus(appointment)} labels={appointmentLabels} />
                      <ChevronRight size={18} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </DataView>
      )}

      {selected && (
        <AppointmentDetails
          appointment={selected}
          onClose={() => setSelectedId(null)}
          onChanged={calendar.reload}
        />
      )}
    </section>
  );
}

function AppointmentDetails({ appointment, onClose, onChanged }) {
  return (
    <Modal title="Consulta" onClose={onClose}>
      <dl className="clinic-details">
        <div><dt>Paciente</dt><dd>{appointment.patient.full_name} · {appointment.patient.email}</dd></div>
        <div><dt>Médico</dt><dd>{appointment.doctor.full_name}</dd></div>
        <div><dt>Horário</dt><dd>{formatDateTime(appointment.scheduled_at)}</dd></div>
        <div><dt>Status</dt><dd><StatusBadge status={displayStatus(appointment)} labels={appointmentLabels} /></dd></div>
        {appointment.status === 'completed' && (
          <>
            <div><dt>Atendido em</dt><dd>{formatDateTime(appointment.attended_at)}</dd></div>
            <div><dt>Observações</dt><dd>{appointment.observations || '—'}</dd></div>
            <div><dt>Informações</dt><dd>{appointment.consultation_info || '—'}</dd></div>
            <div>
              <dt>Exames</dt>
              <dd>
                {appointment.exams.length === 0 ? '—' : (
                  <ul className="calendar-exams">
                    {appointment.exams.map((exam) => (
                      <li key={exam.id}>{exam.name} <StatusBadge status={exam.status} labels={examStatus} /></li>
                    ))}
                  </ul>
                )}
              </dd>
            </div>
          </>
        )}
      </dl>

      {isOverdue(appointment) && <NoShowAction appointment={appointment} onSaved={onChanged} />}
      {appointment.status === 'scheduled' && (
        <AttendanceForm appointment={appointment} onCancel={onClose} onSaved={onChanged} />
      )}
    </Modal>
  );
}

function NoShowAction({ appointment, onSaved }) {
  const { api } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const submit = useSubmit(() => api.markNoShow(appointment.id));

  async function handleConfirm() {
    if (await submit.run()) onSaved();
  }

  return (
    <div className="calendar-no-show">
      <p className="clinic-dialog-text">
        {confirming ? 'Confirmar que o paciente não compareceu? Esta ação não pode ser desfeita.' : 'O paciente não veio à consulta?'}
      </p>
      <FormError>{submit.error}</FormError>
      <div className="clinic-form-actions">
        {confirming ? (
          <>
            <button type="button" className="clinic-button is-secondary is-small" onClick={() => setConfirming(false)}>Voltar</button>
            <button type="button" className="clinic-button is-small" disabled={submit.pending} onClick={handleConfirm}>
              {submit.pending ? 'Registrando...' : 'Confirmar falta'}
            </button>
          </>
        ) : (
          <button type="button" className="clinic-button is-secondary is-small" onClick={() => setConfirming(true)}>Registrar falta</button>
        )}
      </div>
    </div>
  );
}

function AttendanceForm({ appointment, onCancel, onSaved }) {
  const { api } = useAuth();
  const id = useId();
  const [observations, setObservations] = useState('');
  const [consultationInfo, setConsultationInfo] = useState('');
  const [exams, setExams] = useState([]);
  const [examName, setExamName] = useState('');
  const started = new Date(appointment.scheduled_at) <= new Date();
  const submit = useSubmit(() => api.registerAttendance(appointment.id, {
    observations: observations.trim() || null,
    consultation_info: consultationInfo.trim() || null,
    exam_requests: exams,
  }));

  function addExam() {
    const name = examName.trim();
    if (!name) return;
    if (!exams.includes(name)) setExams([...exams, name]);
    setExamName('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (await submit.run()) onSaved();
  }

  if (!started) {
    return (
      <p className="clinic-dialog-text">
        O atendimento poderá ser registrado a partir de {formatDateTime(appointment.scheduled_at)}.
      </p>
    );
  }

  return (
    <form className="clinic-form" onSubmit={handleSubmit}>
      <h3 className="calendar-form-title">Registrar atendimento</h3>
      <div className="clinic-field">
        <label htmlFor={`${id}-observations`}>Observações</label>
        <textarea id={`${id}-observations`} maxLength={5000} value={observations} onChange={(event) => setObservations(event.target.value)} />
      </div>
      <div className="clinic-field">
        <label htmlFor={`${id}-info`}>Informações da consulta</label>
        <textarea id={`${id}-info`} maxLength={5000} value={consultationInfo} onChange={(event) => setConsultationInfo(event.target.value)} />
      </div>
      <div className="clinic-field">
        <label htmlFor={`${id}-exam`}>Solicitar exames</label>
        <div className="calendar-exam-input">
          <input
            id={`${id}-exam`}
            maxLength={255}
            placeholder="Ex.: Hemograma completo"
            value={examName}
            disabled={exams.length >= 50}
            onChange={(event) => setExamName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') { event.preventDefault(); addExam(); }
            }}
          />
          <button type="button" className="clinic-button is-secondary" onClick={addExam} disabled={!examName.trim() || exams.length >= 50}>
            <Plus size={16} aria-hidden="true" /> Adicionar
          </button>
        </div>
        {exams.length > 0 && (
          <ul className="calendar-exams">
            {exams.map((name) => (
              <li key={name}>
                {name}
                <button type="button" className="clinic-icon-button" aria-label={`Remover ${name}`} onClick={() => setExams(exams.filter((item) => item !== name))}>
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <FormError>{submit.error}</FormError>
      <div className="clinic-form-actions">
        <button type="button" className="clinic-button is-secondary" onClick={onCancel}>Voltar</button>
        <button type="submit" className="clinic-button" disabled={submit.pending}>{submit.pending ? 'Salvando...' : 'Concluir atendimento'}</button>
      </div>
    </form>
  );
}

export default Calendar;
