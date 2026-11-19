import { useCallback, useId, useState } from 'react';
import { FileText } from 'lucide-react';
import { useAuth } from '../../contexts/auth.js';
import { useAsync } from '../../hooks/useAsync.js';
import { useSubmit } from '../../hooks/useSubmit.js';
import { DataView, FormError, Modal, PageHeading, StatusBadge } from '../../components/clinic/ui.jsx';
import { examStatus, formatDateTime } from '../../utils/clinic.js';

const operatorRoles = ['attendant', 'admin'];
const resultViewerRoles = ['patient', 'doctor', 'admin'];

const descriptions = {
  patient: 'Acompanhe seus exames e consulte os resultados.',
  doctor: 'Exames solicitados por você. Registre o resultado dos exames já realizados.',
  attendant: 'Agende os exames solicitados e marque os que foram realizados.',
  admin: 'Acompanhe, agende e marque os exames realizados da clínica.',
};

function Exams({ user }) {
  const { api } = useAuth();
  const id = useId();
  const canOperate = operatorRoles.includes(user.role);
  const canViewResults = resultViewerRoles.includes(user.role);
  const canFilterPatient = user.role !== 'patient';
  const [status, setStatus] = useState('');
  const [patientId, setPatientId] = useState('');
  const [dialog, setDialog] = useState(null);

  const loadPatients = useCallback(
    () => (canFilterPatient ? api.listUsers('patient') : Promise.resolve([])),
    [api, canFilterPatient],
  );
  const patients = useAsync(loadPatients);

  // Only /exams/results returns the result text, so it is merged into the exam list.
  // Attendants and admins schedule and mark exams as performed; only the requesting doctor registers the result.
  const loadExams = useCallback(async () => {
    const filters = { status, patient_id: patientId };
    const [exams, results] = await Promise.all([
      api.listExams(filters),
      canViewResults && (!status || status === 'result_available')
        ? api.listExamResults({ patient_id: patientId })
        : [],
    ]);
    const resultById = new Map(results.map((exam) => [exam.id, exam.result]));
    return exams.map((exam) => ({ ...exam, result: resultById.get(exam.id) }));
  }, [api, canViewResults, status, patientId]);
  const exams = useAsync(loadExams);

  function closeDialog(changed) {
    setDialog(null);
    if (changed) exams.reload();
  }

  return (
    <section className="dashboard-content" aria-labelledby="dashboard-title">
      <PageHeading eyebrow="EXAMES" title={user.role === 'patient' ? 'Meus exames' : 'Exames'} description={descriptions[user.role]} />

      <div className="clinic-toolbar">
        {canFilterPatient && (
          <div className="clinic-field">
            <label htmlFor={`${id}-patient`}>Paciente</label>
            <select id={`${id}-patient`} value={patientId} onChange={(event) => setPatientId(event.target.value)}>
              <option value="">Todos</option>
              {patients.data?.map((patient) => <option key={patient.id} value={patient.id}>{patient.full_name}</option>)}
            </select>
          </div>
        )}
        <div className="clinic-field">
          <label htmlFor={`${id}-status`}>Status</label>
          <select id={`${id}-status`} value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">Todos</option>
            {Object.entries(examStatus).map(([value, { label }]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
      </div>
      <FormError>{patients.error && `Não foi possível carregar os pacientes. ${patients.error.message}`}</FormError>

      <DataView
        {...exams}
        onRetry={exams.reload}
        isEmpty={exams.data?.length === 0}
        empty={{ icon: FileText, title: 'Nenhum exame encontrado', text: 'Os exames solicitados nas consultas aparecerão aqui.' }}
      >
        <ul className="clinic-list">
          {exams.data?.map((exam) => (
            <li key={exam.id} className="clinic-card clinic-row">
              <div className="clinic-row-main">
                <strong>{exam.name}</strong>
                {user.role !== 'patient' && <span>Paciente: {exam.patient.full_name}</span>}
                <span>Solicitado por Dr(a). {exam.doctor.full_name} em {formatDateTime(exam.created_at)}</span>
                {exam.scheduled_at && <span>Agendado para {formatDateTime(exam.scheduled_at)}</span>}
                {exam.performed_at && <span>Realizado em {formatDateTime(exam.performed_at)}</span>}
              </div>
              <StatusBadge status={exam.status} labels={examStatus} />
              <div className="clinic-row-actions">
                {exam.result != null && (
                  <button type="button" className="clinic-button is-small" onClick={() => setDialog({ type: 'result', exam })}>Ver resultado</button>
                )}
                {canOperate && (exam.status === 'requested' || exam.status === 'scheduled') && (
                  <button type="button" className="clinic-button is-secondary is-small" onClick={() => setDialog({ type: 'schedule', exam })}>
                    {exam.status === 'requested' ? 'Agendar' : 'Reagendar'}
                  </button>
                )}
                {canOperate && exam.status === 'scheduled' && (
                  <button type="button" className="clinic-button is-secondary is-small" onClick={() => setDialog({ type: 'perform', exam })}>Marcar como realizado</button>
                )}
                {exam.status === 'performed' && user.role === 'doctor' && exam.doctor.id === user.id && (
                  <button type="button" className="clinic-button is-small" onClick={() => setDialog({ type: 'register', exam })}>Registrar resultado</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </DataView>

      {dialog?.type === 'result' && (
        <Modal title={dialog.exam.name} onClose={() => closeDialog(false)}>
          <dl className="clinic-details">
            <div><dt>Disponível em</dt><dd>{formatDateTime(dialog.exam.result_available_at)}</dd></div>
            <div><dt>Resultado</dt><dd>{dialog.exam.result}</dd></div>
          </dl>
        </Modal>
      )}
      {dialog?.type === 'schedule' && <ScheduleExam exam={dialog.exam} onClose={closeDialog} />}
      {dialog?.type === 'perform' && <PerformExam exam={dialog.exam} onClose={closeDialog} />}
      {dialog?.type === 'register' && <RegisterResult exam={dialog.exam} onClose={closeDialog} />}
    </section>
  );
}

function ScheduleExam({ exam, onClose }) {
  const { api } = useAuth();
  const id = useId();
  const [value, setValue] = useState('');
  const submit = useSubmit(() => api.scheduleExam(exam.id, new Date(value).toISOString()));

  async function handleSubmit(event) {
    event.preventDefault();
    if (new Date(value) <= new Date()) return submit.setError('Escolha uma data e um horário no futuro.');
    if (await submit.run()) onClose(true);
  }

  return (
    <Modal title={`Agendar ${exam.name}`} onClose={() => onClose(false)}>
      <form className="clinic-form" onSubmit={handleSubmit}>
        <p className="clinic-dialog-text">Paciente: {exam.patient.full_name}</p>
        <div className="clinic-field">
          <label htmlFor={`${id}-when`}>Data e horário</label>
          <input id={`${id}-when`} type="datetime-local" required value={value} onChange={(event) => setValue(event.target.value)} />
        </div>
        <FormError>{submit.error}</FormError>
        <div className="clinic-form-actions">
          <button type="button" className="clinic-button is-secondary" onClick={() => onClose(false)}>Voltar</button>
          <button type="submit" className="clinic-button" disabled={submit.pending}>{submit.pending ? 'Salvando...' : 'Agendar exame'}</button>
        </div>
      </form>
    </Modal>
  );
}

function PerformExam({ exam, onClose }) {
  const { api } = useAuth();
  const submit = useSubmit(() => api.markExamPerformed(exam.id));

  async function handleConfirm() {
    if (await submit.run()) onClose(true);
  }

  return (
    <Modal title="Marcar exame como realizado" onClose={() => onClose(false)}>
      <div className="clinic-form">
        <p className="clinic-dialog-text">Confirmar que {exam.patient.full_name} realizou o exame {exam.name}?</p>
        <FormError>{submit.error}</FormError>
        <div className="clinic-form-actions">
          <button type="button" className="clinic-button is-secondary" onClick={() => onClose(false)}>Voltar</button>
          <button type="button" className="clinic-button" disabled={submit.pending} onClick={handleConfirm}>{submit.pending ? 'Salvando...' : 'Confirmar'}</button>
        </div>
      </div>
    </Modal>
  );
}

function RegisterResult({ exam, onClose }) {
  const { api } = useAuth();
  const id = useId();
  const [result, setResult] = useState('');
  const submit = useSubmit(() => api.registerExamResult(exam.id, result.trim()));

  async function handleSubmit(event) {
    event.preventDefault();
    if (!result.trim()) return submit.setError('Informe o resultado do exame.');
    if (await submit.run()) onClose(true);
  }

  return (
    <Modal title={`Resultado de ${exam.name}`} onClose={() => onClose(false)}>
      <form className="clinic-form" onSubmit={handleSubmit}>
        <p className="clinic-dialog-text">Paciente: {exam.patient.full_name}</p>
        <div className="clinic-field">
          <label htmlFor={`${id}-result`}>Resultado</label>
          <textarea id={`${id}-result`} required maxLength={20000} rows={8} value={result} onChange={(event) => setResult(event.target.value)} />
        </div>
        <FormError>{submit.error}</FormError>
        <div className="clinic-form-actions">
          <button type="button" className="clinic-button is-secondary" onClick={() => onClose(false)}>Voltar</button>
          <button type="submit" className="clinic-button" disabled={submit.pending}>{submit.pending ? 'Salvando...' : 'Registrar resultado'}</button>
        </div>
      </form>
    </Modal>
  );
}

export default Exams;
