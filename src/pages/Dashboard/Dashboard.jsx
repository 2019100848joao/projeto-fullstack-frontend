import { useLayoutEffect, useRef, useState } from 'react';
import { CalendarDays, ChevronRight, FileText, HeartPulse, Home, LogOut, PanelLeftClose, PanelLeftOpen, Users } from 'lucide-react';
import Patient from '../Patient/Patient.jsx';
import DoctorPatients from '../DoctorPatients/DoctorPatients.jsx';
import './Dashboard.css';

const roleNames = {
  admin: 'Administração',
  attendant: 'Atendimento',
  doctor: 'Médico',
  patient: 'Paciente',
};

const areaNames = {
  admin: 'Área da administração',
  attendant: 'Área do atendimento',
  doctor: 'Área do médico',
  patient: 'Área do paciente',
};

function Dashboard({ user, onLogout }) {
  const [section, setSection] = useState('home');
  const [compactLayout, setCompactLayout] = useState(false);
  const [manualCollapsed, setManualCollapsed] = useState(null);
  const dashboardRef = useRef(null);
  const previousWidth = useRef(null);
  const collapsed = manualCollapsed ?? compactLayout;
  const isDoctor = user.role === 'doctor';
  const isPatient = user.role === 'patient';
  const navigation = [
    { id: 'home', label: 'Início', icon: Home },
    ...((isDoctor || isPatient) ? [{ id: 'appointments', label: 'Consultas', icon: CalendarDays }] : []),
    ...(isDoctor ? [{ id: 'patients', label: 'Pacientes', icon: Users }] : []),
    ...(isPatient ? [{ id: 'exams', label: 'Exames', icon: FileText }] : []),
  ];

  useLayoutEffect(() => {
    const dashboard = dashboardRef.current;
    const updateForSpace = () => {
      const width = dashboard.clientWidth;
      const sidebarWidth = parseFloat(getComputedStyle(dashboard).getPropertyValue('--dashboard-sidebar-width'));
      setCompactLayout(sidebarWidth / width > 0.3);
      if (previousWidth.current !== null && previousWidth.current !== width) {
        setManualCollapsed(null);
      }
      previousWidth.current = width;
    };

    const observer = new ResizeObserver(updateForSpace);
    observer.observe(dashboard);
    updateForSpace();
    return () => observer.disconnect();
  }, []);

  function navigateTo(nextSection) {
    setSection(nextSection);
    if (compactLayout) setManualCollapsed(null);
  }

  return (
    <div ref={dashboardRef} className={`dashboard${compactLayout ? ' is-compact-layout' : ''}`}>
      <aside className={`dashboard-sidebar${collapsed ? ' is-collapsed' : ''}`} aria-label="Menu lateral">
        <div className="dashboard-sidebar-header">
          <div className="dashboard-brand">
            <span className="dashboard-brand-icon"><HeartPulse size={22} aria-hidden="true" /></span>
            <span className="dashboard-brand-name">Clínica Saúde</span>
          </div>
          <button
            type="button"
            className="dashboard-sidebar-toggle"
            aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
            aria-expanded={!collapsed}
            aria-controls="dashboard-navigation"
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
            onClick={() => setManualCollapsed(!collapsed)}
          >
            {collapsed ? <PanelLeftOpen size={20} aria-hidden="true" /> : <PanelLeftClose size={20} aria-hidden="true" />}
          </button>
        </div>

        <div className="dashboard-sidebar-section">
          <span className="dashboard-nav-heading">NAVEGAÇÃO</span>
          <nav id="dashboard-navigation" className="dashboard-nav" aria-label="Área do usuário">
            {navigation.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                className={`dashboard-nav-item${section === id ? ' is-active' : ''}`}
                aria-label={label}
                aria-current={section === id ? 'page' : undefined}
                title={collapsed ? label : undefined}
                onClick={() => navigateTo(id)}
              >
                <Icon size={19} aria-hidden="true" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="dashboard-sidebar-footer">
          <div className="dashboard-profile">
            <span className="dashboard-avatar" aria-hidden="true">{user.full_name?.charAt(0)?.toUpperCase() || '?'}</span>
            <div className="dashboard-profile-details">
              <strong>{user.full_name}</strong>
              <span>{roleNames[user.role] || 'Usuário'}</span>
            </div>
          </div>
          <button type="button" className="dashboard-logout" aria-label="Sair da conta" title={collapsed ? 'Sair da conta' : undefined} onClick={onLogout}>
            <LogOut size={18} aria-hidden="true" /> <span>Sair da conta</span>
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
        <div className="dashboard-topbar">
          <span>{areaNames[user.role] || 'Área do usuário'}</span>
        </div>

        {isPatient ? (
          <Patient user={user} section={section} onNavigate={navigateTo} />
        ) : section === 'patients' && isDoctor ? (
          <DoctorPatients />
        ) : section === 'appointments' && isDoctor ? (
          <section className="dashboard-content" aria-labelledby="dashboard-title">
            <div className="dashboard-page-heading">
              <span className="dashboard-eyebrow">ATENDIMENTOS</span>
              <h1 id="dashboard-title">Consultas</h1>
              <p>Consulte seus atendimentos em um só lugar.</p>
            </div>
            <div className="dashboard-empty-state">
              <span className="dashboard-empty-icon"><CalendarDays size={30} aria-hidden="true" /></span>
              <h2>Visualização de consultas em preparação</h2>
              <p>A listagem dos seus atendimentos estará disponível em breve.</p>
            </div>
          </section>
        ) : (
          <section className="dashboard-content" aria-labelledby="dashboard-title">
            <div className="dashboard-page-heading">
              <span className="dashboard-eyebrow">VISÃO GERAL</span>
              <h1 id="dashboard-title">Olá, {user.full_name}</h1>
              <p>Bem-vindo à sua área na Clínica Saúde.</p>
            </div>
            <div className="dashboard-welcome-card">
              <div>
                <span className="dashboard-card-label">SUA ÁREA</span>
                <h2>{isDoctor ? 'Seu espaço de trabalho' : 'Tudo em um só lugar'}</h2>
                <p>
                  {isDoctor
                    ? 'Acesse a área de consultas pelo menu lateral.'
                    : 'Esta é a sua página inicial na plataforma.'}
                </p>
                {isDoctor && (
                  <button type="button" className="dashboard-card-action" onClick={() => navigateTo('appointments')}>
                    Ver consultas <ChevronRight size={18} aria-hidden="true" />
                  </button>
                )}
              </div>
              <span className="dashboard-card-decoration" aria-hidden="true"><HeartPulse size={88} /></span>
            </div>
            <div className="dashboard-account-card">
              <span className="dashboard-card-label">CONTA</span>
              <h2>Seus dados</h2>
              <dl>
                <div><dt>Nome</dt><dd>{user.full_name}</dd></div>
                <div><dt>E-mail</dt><dd>{user.email}</dd></div>
                <div><dt>Perfil</dt><dd>{roleNames[user.role] || 'Usuário'}</dd></div>
              </dl>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default Dashboard;
