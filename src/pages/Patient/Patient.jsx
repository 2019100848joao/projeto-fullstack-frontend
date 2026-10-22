import { CalendarDays, ChevronRight, FileText } from 'lucide-react';
import './Patient.css';

const sections = {
  appointments: {
    eyebrow: 'ATENDIMENTOS',
    title: 'Minhas consultas',
    description: 'Acompanhe suas consultas na clínica.',
    emptyTitle: 'Visualização de consultas em preparação',
    emptyDescription: 'Suas consultas estarão disponíveis aqui em breve.',
    icon: CalendarDays,
  },
  exams: {
    eyebrow: 'RESULTADOS',
    title: 'Meus exames',
    description: 'Consulte seus exames e resultados.',
    emptyTitle: 'Visualização de exames em preparação',
    emptyDescription: 'Seus exames estarão disponíveis aqui em breve.',
    icon: FileText,
  },
};

function Patient({ user, section, onNavigate }) {
  const activeSection = sections[section];

  if (activeSection) {
    const Icon = activeSection.icon;
    return (
      <section className="dashboard-content" aria-labelledby="dashboard-title">
        <div className="dashboard-page-heading">
          <span className="dashboard-eyebrow">{activeSection.eyebrow}</span>
          <h1 id="dashboard-title">{activeSection.title}</h1>
          <p>{activeSection.description}</p>
        </div>
        <div className="dashboard-empty-state">
          <span className="dashboard-empty-icon"><Icon size={30} aria-hidden="true" /></span>
          <h2>{activeSection.emptyTitle}</h2>
          <p>{activeSection.emptyDescription}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="dashboard-content" aria-labelledby="dashboard-title">
      <div className="dashboard-page-heading">
        <span className="dashboard-eyebrow">SUA SAÚDE</span>
        <h1 id="dashboard-title">Olá, {user.full_name}</h1>
        <p>Bem-vindo à sua área de paciente na Clínica Saúde.</p>
      </div>

      <div className="dashboard-welcome-card patient-welcome-card">
        <div>
          <span className="dashboard-card-label">ÁREA DO PACIENTE</span>
          <h2>Sua saúde em um só lugar</h2>
          <p>Acesse suas consultas e exames pelo menu lateral ou pelos atalhos abaixo.</p>
        </div>
        <span className="patient-welcome-icon" aria-hidden="true"><CalendarDays size={58} /></span>
      </div>

      <div className="patient-services" aria-label="Acessos rápidos">
        <button type="button" className="patient-service-card" onClick={() => onNavigate('appointments')}>
          <span className="patient-service-icon"><CalendarDays size={24} aria-hidden="true" /></span>
          <strong>Consultas</strong>
          <span>Acompanhe seus atendimentos na clínica.</span>
          <span className="patient-service-link">Acessar consultas <ChevronRight size={18} aria-hidden="true" /></span>
        </button>
        <button type="button" className="patient-service-card" onClick={() => onNavigate('exams')}>
          <span className="patient-service-icon"><FileText size={24} aria-hidden="true" /></span>
          <strong>Exames</strong>
          <span>Consulte seus exames e resultados.</span>
          <span className="patient-service-link">Acessar exames <ChevronRight size={18} aria-hidden="true" /></span>
        </button>
      </div>
    </section>
  );
}

export default Patient;
