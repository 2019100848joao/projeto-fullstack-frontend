import { useCallback, useMemo } from 'react';
import { CalendarDays } from 'lucide-react';
import { useAuth } from '../../contexts/auth.js';
import { useAsync } from '../../hooks/useAsync.js';
import { DataView, PageHeading, StatusBadge } from '../../components/clinic/ui.jsx';
import { appointmentLabels, displayStatus, formatDay, formatTime, groupByDay, isOverdue } from '../../utils/clinic.js';

function AppointmentGroups({ title, appointments }) {
  if (appointments.length === 0) return null;

  return (
    <section className="patient-appointments-section" aria-label={title}>
      <h2 className="patient-appointments-title">{title}</h2>
      {groupByDay(appointments, (item) => item.scheduled_at).map(([day, items]) => (
        <div key={day}>
          <h3 className="clinic-group-title">{formatDay(items[0].scheduled_at)}</h3>
          <ul className="clinic-list">
            {items.map((appointment) => (
              <li key={appointment.id} className="clinic-card clinic-row">
                <strong className="appointment-time">{formatTime(appointment.scheduled_at)}</strong>
                <div className="clinic-row-main">
                  <strong>Dr(a). {appointment.doctor.full_name}</strong>
                </div>
                <StatusBadge status={displayStatus(appointment)} labels={appointmentLabels} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

function PatientAppointments() {
  const { api } = useAuth();
  const loadAppointments = useCallback(() => api.listMyAppointments(), [api]);
  const appointments = useAsync(loadAppointments);

  // Upcoming: scheduled and still ahead. Everything else (including a scheduled one whose
  // time has passed) is history, most recent first.
  const { upcoming, past } = useMemo(() => {
    const items = appointments.data ?? [];
    const isUpcoming = (item) => item.status === 'scheduled' && !isOverdue(item);
    return {
      upcoming: items.filter(isUpcoming),
      past: items.filter((item) => !isUpcoming(item)).reverse(),
    };
  }, [appointments.data]);

  return (
    <section className="dashboard-content" aria-labelledby="dashboard-title">
      <PageHeading eyebrow="ATENDIMENTOS" title="Minhas consultas" description="Acompanhe suas consultas na clínica." />
      <DataView
        {...appointments}
        onRetry={appointments.reload}
        isEmpty={appointments.data?.length === 0}
        empty={{ icon: CalendarDays, title: 'Você ainda não tem consultas', text: 'Para agendar, entre em contato com o atendimento da clínica.' }}
      >
        <AppointmentGroups title="Próximas" appointments={upcoming} />
        <AppointmentGroups title="Anteriores" appointments={past} />
      </DataView>
    </section>
  );
}

export default PatientAppointments;
