const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

const statusMessages = {
  401: 'Sua sessão expirou. Entre novamente.',
  403: 'Você não tem permissão para realizar esta ação.',
  404: 'Registro não encontrado.',
  409: 'O registro mudou e não permite mais esta ação. Atualize a página.',
  422: 'Confira os dados informados.',
  429: 'Muitas tentativas. Tente novamente mais tarde.',
};

// Backend `detail` values that deserve a specific message for the user.
const detailMessages = {
  'Doctor already has an appointment at this time': 'O médico já tem uma consulta neste horário.',
  'Appointment is not in scheduled status': 'Esta consulta não está mais agendada.',
  'Appointment time has not been reached yet': 'O atendimento só pode ser registrado a partir do horário da consulta.',
  'Exam status does not allow this operation': 'O status atual do exame não permite esta ação.',
  'doctor_id is required for admin users': 'Selecione um médico para ver a agenda.',
  'patient_id must reference an active user with the patient role': 'Selecione um paciente ativo.',
  'doctor_id must reference an active user with the doctor role': 'Selecione um médico ativo.',
  'User already has a pending role transition request': 'Você já tem uma solicitação em análise. Aguarde a resposta da administração.',
  'Role transition is not valid for the current user role': 'Sua conta já tem este cargo ou não pode solicitar esta mudança.',
  'Role transition request has already been reviewed': 'Esta solicitação já foi analisada.',
  "Role transition is no longer valid for the user's current role": 'O cargo do usuário mudou e esta solicitação não é mais válida.',
  'Role transition request not found': 'Solicitação não encontrada.',
};

async function request(path, { token, method = 'GET', body, query, messages = {} } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  const params = new URLSearchParams(Object.entries(query ?? {}).filter(([, value]) => value != null && value !== ''));
  const url = `${API_URL}${path}${params.size ? `?${params}` : ''}`;
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) {
      const detail = await response.json().then((data) => data?.detail, () => undefined);
      const error = new Error(
        messages[response.status]
          || (typeof detail === 'string' && detailMessages[detail])
          || statusMessages[response.status]
          || messages.default
          || 'Não foi possível concluir a solicitação. Tente novamente.',
      );
      error.status = response.status;
      throw error;
    }
    return response.status === 204 ? null : await response.json();
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('A solicitação demorou demais. Tente novamente.', { cause: error });
    if (error instanceof TypeError) throw new Error('Não foi possível conectar à clínica. Tente novamente mais tarde.', { cause: error });
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function login(email, password) {
  return request('/auth/login', {
    method: 'POST',
    body: { email, password },
    messages: {
      401: 'E-mail ou senha inválidos. Tente novamente.',
      403: 'Sua conta está inativa. Entre em contato com a clínica.',
      422: 'Confira seu e-mail e sua senha.',
      default: 'Não foi possível entrar. Tente novamente mais tarde.',
    },
  });
}

// Public sign-up creates patient accounts only: the role is never sent, so the backend default applies.
export function register({ fullName, email, password }) {
  return request('/auth/register', {
    method: 'POST',
    body: { full_name: fullName, email, password },
    messages: {
      409: 'Este e-mail já está cadastrado. Entre com sua conta.',
      422: 'Confira os dados informados.',
      default: 'Não foi possível criar sua conta. Tente novamente mais tarde.',
    },
  });
}

export function refreshToken(token) {
  return request('/auth/refresh', { method: 'POST', token });
}

export function getCurrentUser(token) {
  return request('/auth/me', { token });
}

// Endpoints that require a session. `onUnauthorized` runs when the token is no longer accepted.
export function createClinicApi(token, onUnauthorized) {
  async function call(path, options) {
    try {
      return await request(path, { ...options, token });
    } catch (error) {
      if (error.status === 401) onUnauthorized();
      throw error;
    }
  }

  return {
    listUsers: (role) => call('/users', { query: { role } }),

    listAppointments: (filters) => call('/appointments', { query: filters }),
    listMyAppointments: () => call('/appointments/me'),
    listAttendedPatients: () => call('/appointments/patients'),
    getCalendar: ({ view, date, doctorId }) => call('/appointments/calendar', { query: { view, date, doctor_id: doctorId } }),
    scheduleAppointment: (appointment) => call('/appointments', { method: 'POST', body: appointment }),
    rescheduleAppointment: (id, scheduledAt) => call(`/appointments/${id}/reschedule`, { method: 'POST', body: { scheduled_at: scheduledAt } }),
    cancelAppointment: (id) => call(`/appointments/${id}/cancel`, { method: 'POST' }),
    markNoShow: (id) => call(`/appointments/${id}/no-show`, { method: 'POST' }),
    registerAttendance: (id, attendance) => call(`/appointments/${id}/attendance`, { method: 'POST', body: attendance }),

    listExams: (filters) => call('/exams', { query: filters }),
    listExamResults: (filters) => call('/exams/results', { query: filters }),
    scheduleExam: (id, scheduledAt) => call(`/exams/${id}/schedule`, { method: 'POST', body: { scheduled_at: scheduledAt } }),
    markExamPerformed: (id) => call(`/exams/${id}/perform`, { method: 'POST' }),
    registerExamResult: (id, result) => call(`/exams/${id}/result`, { method: 'POST', body: { result } }),

    requestRoleTransition: (requestedRole) => call('/role-transitions', { method: 'POST', body: { requested_role: requestedRole } }),
    listMyRoleTransitions: () => call('/role-transitions/me'),
    listRoleTransitions: (status) => call('/role-transitions', { query: { status } }),
    approveRoleTransition: (id) => call(`/role-transitions/${id}/approve`, { method: 'POST' }),
    rejectRoleTransition: (id) => call(`/role-transitions/${id}/reject`, { method: 'POST' }),

    listEmailNotifications: () => call('/notifications/emails'),

    listDocumentTypes: () => call('/document-types', { messages: { default: 'Não foi possível carregar os tipos de documento.' } }),
    registerDocuments: (documents) => call('/users/me/documents', {
      method: 'POST',
      body: documents,
      messages: {
        403: 'Sua conta está inativa e não pode cadastrar documentos.',
        404: 'O tipo de documento selecionado não está cadastrado na clínica.',
        409: 'Já existe um documento cadastrado para um desses tipos.',
        422: 'Confira os documentos informados e tente novamente.',
        default: 'Não foi possível salvar o documento. Tente novamente.',
      },
    }),
  };
}
