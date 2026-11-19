import { useCallback } from 'react';
import { Users } from 'lucide-react';
import { useAuth } from '../../contexts/auth.js';
import { useAsync } from '../../hooks/useAsync.js';
import { DataView } from '../../components/clinic/ui.jsx';
import './DoctorPatients.css';

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' });

function DoctorPatients() {
  const { api } = useAuth();
  const loadPatients = useCallback(() => api.listAttendedPatients(), [api]);
  const patients = useAsync(loadPatients);
  const count = patients.data?.length ?? 0;

  return (
    <section className="dashboard-content" aria-labelledby="dashboard-title">
      <div className="dashboard-page-heading">
        <span className="dashboard-eyebrow">ATENDIMENTOS</span>
        <h1 id="dashboard-title">Pacientes</h1>
        <p>Pacientes com consultas concluídas por você.</p>
      </div>

      <div className="doctor-patients-list">
        <p className="doctor-patients-count">Pacientes atendidos{count > 0 && ` · ${count}`}</p>
        <DataView
          {...patients}
          onRetry={patients.reload}
          isEmpty={count === 0}
          empty={{ icon: Users, title: 'Nenhum paciente atendido ainda', text: 'Os pacientes aparecem aqui depois que você registra o atendimento na agenda.' }}
        >
          <ul>
            {patients.data?.map((patient) => (
              <li key={patient.id} className="doctor-patient-row">
                <span className="dashboard-avatar" aria-hidden="true">{patient.full_name.charAt(0).toUpperCase()}</span>
                <div className="doctor-patient-identity">
                  <strong>{patient.full_name}</strong>
                  <span>{patient.email}</span>
                </div>
                <div className="doctor-patient-visit">
                  <span>Último atendimento</span>
                  <strong>{dateFormatter.format(new Date(patient.last_appointment_at))}</strong>
                </div>
              </li>
            ))}
          </ul>
        </DataView>
      </div>
    </section>
  );
}

export default DoctorPatients;
