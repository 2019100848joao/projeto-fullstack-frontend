import { useCallback, useId, useMemo, useState } from 'react';
import { CalendarDays, CalendarPlus } from 'lucide-react';
import { useAuth } from '../../contexts/auth.js';
import { useAsync } from '../../hooks/useAsync.js';
import { useSubmit } from '../../hooks/useSubmit.js';
import { DataView, FormError, Modal, PageHeading, StatusBadge } from '../../components/clinic/ui.jsx';
import SlotPicker from '../../components/clinic/SlotPicker.jsx';
import {
  appointmentLabels,
  appointmentStatus,
  displayStatus,
  formatDay,
  formatTime,
  groupByDay,
  isOverdue,
  isPast,
  occupiedSlots,
  toApiDateTime,
} from '../../utils/clinic.js';

const emptySlot = { date: '', time: '' };

function slotError(slot, occupied) {
  if (!slot.date || !slot.time) return 'Selecione a data e o horário.';
  if (isPast(slot.date, slot.time)) return 'Escolha um horário no futuro.';
  if (occupied.has(slot.time)) return 'O médico já tem uma consulta neste horário. Escolha outro.';
  return '';
}

/** The doctor's taken slots on `date`, so the picker only offers free ones. The API still rejects races with 409. */
function useOccupiedSlots(doctorId, date, ignoreId) {
  const { api } = useAuth();
  const loadSchedule = useCallback(
    () => (doctorId ? api.listAppointments({ doctor_id: doctorId }) : Promise.resolve([])),
    [api, doctorId],
  );
  const schedule = useAsync(loadSchedule);
  const occupied = useMemo(
    () => occupiedSlots(schedule.data ?? [], date, ignoreId),
    [schedule.data, date, ignoreId],
  );

  let blockedReason = '';
  if (!doctorId) blockedReason = 'Selecione o médico para ver os horários disponíveis.';
  else if (schedule.error) blockedReason = `Não foi possível carregar a agenda do médico. ${schedule.error.message}`;
  else if (schedule.loading) blockedReason = 'Carregando a agenda do médico...';

  return { occupied, blockedReason };
}

function Appointments() {
  const { api } = useAuth();
  const filterId = useId();
  const [filters, setFilters] = useState({ doctor_id: '', patient_id: '', status: 'scheduled' });
  const [dialog, setDialog] = useState(null);

  const loadPeople = useCallback(
    () => Promise.all([api.listUsers('doctor'), api.listUsers('patient')])
      .then(([doctors, patients]) => ({
        doctors: doctors.filter((user) => user.is_active),
        patients: patients.filter((user) => user.is_active),
      })),
    [api],
  );
  const people = useAsync(loadPeople);

  const { doctor_id: doctorId, patient_id: patientId } = filters;
  const loadAppointments = useCallback(
    () => api.listAppointments({ doctor_id: doctorId, patient_id: patientId }),
    [api, doctorId, patientId],
  );
  const appointments = useAsync(loadAppointments);

  const visible = useMemo(
    () => (appointments.data ?? []).filter((item) => !filters.status || item.status === filters.status),
    [appointments.data, filters.status],
  );

  function closeDialog(changed) {
    setDialog(null);
    if (changed) appointments.reload();
  }

  return (
    <section className="dashboard-content" aria-labelledby="dashboard-title">
      <PageHeading eyebrow="ATENDIMENTO" title="Agendamentos" description="Agende, remarque e cancele consultas da clínica.">
        <button type="button" className="clinic-button" disabled={!people.data} onClick={() => setDialog({ type: 'create' })}>
          <CalendarPlus size={18} aria-hidden="true" /> Nova consulta
        </button>
      </PageHeading>

      <div className="clinic-toolbar">
        <div className="clinic-field">
          <label htmlFor={`${filterId}-doctor`}>Médico</label>
          <select id={`${filterId}-doctor`} value={filters.doctor_id} onChange={(event) => setFilters({ ...filters, doctor_id: event.target.value })}>
            <option value="">Todos</option>
            {people.data?.doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.full_name}</option>)}
          </select>
        </div>
        <div className="clinic-field">
          <label htmlFor={`${filterId}-patient`}>Paciente</label>
          <select id={`${filterId}-patient`} value={filters.patient_id} onChange={(event) => setFilters({ ...filters, patient_id: event.target.value })}>
            <option value="">Todos</option>
            {people.data?.patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.full_name}</option>)}
          </select>
        </div>
        <div className="clinic-field">
          <label htmlFor={`${filterId}-status`}>Status</label>
          <select id={`${filterId}-status`} value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
            <option value="">Todos</option>
            {Object.entries(appointmentStatus).map(([value, { label }]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
      </div>
      <FormError>{people.error && `Não foi possível carregar médicos e pacientes. ${people.error.message}`}</FormError>

      <DataView
        {...appointments}
        onRetry={appointments.reload}
        isEmpty={visible.length === 0}
        empty={{ icon: CalendarDays, title: 'Nenhuma consulta encontrada', text: 'Ajuste os filtros ou agende uma nova consulta.' }}
      >
        {groupByDay(visible, (item) => item.scheduled_at).map(([day, items]) => (
          <div key={day}>
            <h2 className="clinic-group-title">{formatDay(items[0].scheduled_at)}</h2>
            <ul className="clinic-list">
              {items.map((appointment) => (
                <li key={appointment.id} className="clinic-card clinic-row">
                  <strong className="appointment-time">{formatTime(appointment.scheduled_at)}</strong>
                  <div className="clinic-row-main">
                    <strong>{appointment.patient.full_name}</strong>
                    <span>Dr(a). {appointment.doctor.full_name}</span>
                  </div>
                  <StatusBadge status={displayStatus(appointment)} labels={appointmentLabels} />
                  {appointment.status === 'scheduled' && (
                    <div className="clinic-row-actions">
                      {isOverdue(appointment) && (
                        <button type="button" className="clinic-button is-secondary is-small" onClick={() => setDialog({ type: 'no-show', appointment })}>Não compareceu</button>
                      )}
                      <button type="button" className="clinic-button is-secondary is-small" onClick={() => setDialog({ type: 'reschedule', appointment })}>Remarcar</button>
                      <button type="button" className="clinic-button is-danger is-small" onClick={() => setDialog({ type: 'cancel', appointment })}>Cancelar</button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </DataView>

      {dialog?.type === 'create' && <CreateAppointment people={people.data} onClose={closeDialog} />}
      {dialog?.type === 'reschedule' && <RescheduleAppointment appointment={dialog.appointment} onClose={closeDialog} />}
      {dialog?.type === 'cancel' && (
        <ConfirmAppointmentAction
          appointment={dialog.appointment}
          title="Cancelar consulta"
          question="Cancelar a consulta"
          confirmLabel="Cancelar consulta"
          pendingLabel="Cancelando..."
          danger
          action={api.cancelAppointment}
          onClose={closeDialog}
        />
      )}
      {dialog?.type === 'no-show' && (
        <ConfirmAppointmentAction
          appointment={dialog.appointment}
          title="Registrar falta"
          question="Registrar que o paciente não compareceu à consulta"
          confirmLabel="Registrar falta"
          pendingLabel="Registrando..."
          action={api.markNoShow}
          onClose={closeDialog}
        />
      )}
    </section>
  );
}

function CreateAppointment({ people, onClose }) {
  const { api } = useAuth();
  const id = useId();
  const [form, setForm] = useState({ patient_id: '', doctor_id: '', slot: emptySlot });
  const { occupied, blockedReason } = useOccupiedSlots(form.doctor_id, form.slot.date);
  const submit = useSubmit(() => api.scheduleAppointment({
    patient_id: form.patient_id,
    doctor_id: form.doctor_id,
    scheduled_at: toApiDateTime(form.slot.date, form.slot.time),
  }));

  async function handleSubmit(event) {
    event.preventDefault();
    const error = slotError(form.slot, occupied);
    if (error) return submit.setError(error);
    if (await submit.run()) onClose(true);
  }

  return (
    <Modal title="Nova consulta" onClose={() => onClose(false)}>
      <form className="clinic-form" onSubmit={handleSubmit}>
        <div className="clinic-field">
          <label htmlFor={`${id}-patient`}>Paciente</label>
          <select id={`${id}-patient`} required value={form.patient_id} onChange={(event) => setForm({ ...form, patient_id: event.target.value })}>
            <option value="">Selecione</option>
            {people.patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.full_name} · {patient.email}</option>)}
          </select>
        </div>
        <div className="clinic-field">
          <label htmlFor={`${id}-doctor`}>Médico</label>
          <select id={`${id}-doctor`} required value={form.doctor_id} onChange={(event) => setForm({ ...form, doctor_id: event.target.value, slot: { ...form.slot, time: '' } })}>
            <option value="">Selecione</option>
            {people.doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.full_name}</option>)}
          </select>
        </div>
        <SlotPicker value={form.slot} onChange={(slot) => setForm({ ...form, slot })} occupied={occupied} blockedReason={blockedReason} />
        <FormError>{submit.error}</FormError>
        <div className="clinic-form-actions">
          <button type="button" className="clinic-button is-secondary" onClick={() => onClose(false)}>Voltar</button>
          <button type="submit" className="clinic-button" disabled={submit.pending}>{submit.pending ? 'Agendando...' : 'Agendar consulta'}</button>
        </div>
      </form>
    </Modal>
  );
}

function RescheduleAppointment({ appointment, onClose }) {
  const { api } = useAuth();
  const [slot, setSlot] = useState(emptySlot);
  const { occupied, blockedReason } = useOccupiedSlots(appointment.doctor.id, slot.date, appointment.id);
  const submit = useSubmit(() => api.rescheduleAppointment(appointment.id, toApiDateTime(slot.date, slot.time)));

  async function handleSubmit(event) {
    event.preventDefault();
    const error = slotError(slot, occupied);
    if (error) return submit.setError(error);
    if (await submit.run()) onClose(true);
  }

  return (
    <Modal title="Remarcar consulta" onClose={() => onClose(false)}>
      <form className="clinic-form" onSubmit={handleSubmit}>
        <p className="clinic-dialog-text">
          {appointment.patient.full_name} com Dr(a). {appointment.doctor.full_name}, atualmente em {formatDay(appointment.scheduled_at)} às {formatTime(appointment.scheduled_at)}.
        </p>
        <SlotPicker value={slot} onChange={setSlot} occupied={occupied} blockedReason={blockedReason} />
        <FormError>{submit.error}</FormError>
        <div className="clinic-form-actions">
          <button type="button" className="clinic-button is-secondary" onClick={() => onClose(false)}>Voltar</button>
          <button type="submit" className="clinic-button" disabled={submit.pending}>{submit.pending ? 'Salvando...' : 'Remarcar'}</button>
        </div>
      </form>
    </Modal>
  );
}

function ConfirmAppointmentAction({ appointment, title, question, confirmLabel, pendingLabel, danger = false, action, onClose }) {
  const submit = useSubmit(() => action(appointment.id));

  async function handleConfirm() {
    if (await submit.run()) onClose(true);
  }

  return (
    <Modal title={title} onClose={() => onClose(false)}>
      <div className="clinic-form">
        <p className="clinic-dialog-text">
          {question} de {appointment.patient.full_name} com Dr(a). {appointment.doctor.full_name} em {formatDay(appointment.scheduled_at)} às {formatTime(appointment.scheduled_at)}? Esta ação não pode ser desfeita.
        </p>
        <FormError>{submit.error}</FormError>
        <div className="clinic-form-actions">
          <button type="button" className="clinic-button is-secondary" onClick={() => onClose(false)}>Voltar</button>
          <button type="button" className={`clinic-button${danger ? ' is-danger' : ''}`} disabled={submit.pending} onClick={handleConfirm}>
            {submit.pending ? pendingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default Appointments;
