import { Users } from 'lucide-react';
import './DoctorPatients.css';

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' });

function DoctorPatients({ patients = [] }) {
  return (
    <section className="dashboard-content" aria-labelledby="dashboard-title">
      <div className="dashboard-page-heading">
        <span className="dashboard-eyebrow">ATENDIMENTOS</span>
        <h1 id="dashboard-title">Pacientes</h1>
        <p>Pacientes com consultas concluídas por você.</p>
      </div>

      <div className="doctor-patients-list">
        <p className="doctor-patients-count">Pacientes atendidos{patients.length > 0 && ` · ${patients.length}`}</p>
        {patients.length === 0 ? (
          <div className="dashboard-empty-state">
            <span className="dashboard-empty-icon"><Users size={30} aria-hidden="true" /></span>
            <h2>Listagem de pacientes indisponível</h2>
            <p>Seus pacientes atendidos aparecerão aqui em breve.</p>
          </div>
        ) : (
          <ul>
            {patients.map((patient) => (
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
        )}
      </div>
    </section>
  );
}

export default DoctorPatients;
