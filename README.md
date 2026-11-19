# Clínica Saúde — Web Frontend

React 19 + Vite single-page app for the clinic. It talks to the FastAPI backend
(`projeto-fullstack`) and covers sign-up, login, appointments, the doctor calendar,
attendance records and exams for each user role.

## Requirements

- Node.js 22+ and npm
- The backend running on `http://127.0.0.1:8000` (see its README)

## Setup and run

```bash
npm ci
npm run dev        # http://127.0.0.1:5173
```

In development, Vite proxies `/api/*` to `http://127.0.0.1:8000` (see `vite.config.js`),
so no CORS setup is needed. To point to another backend, set `VITE_API_URL`
(see `.env.example`).

## Scripts

| Command | Make | What it does |
|---|---|---|
| `npm run dev` | `make dev` | Development server with hot reload |
| `npm test` | `make test` | Unit and component tests (Vitest + Testing Library, jsdom) |
| `npm run test:watch` | | Tests in watch mode |
| `npm run lint` | `make lint` | ESLint |
| `npm run build` | `make build` | Production build in `dist/` |
| | `make check` | Lint, tests and build |

## Docker

```bash
make docker-build                  # or: docker build --build-arg VITE_API_URL=https://api.example.com -t clinic-frontend .
make docker-run                    # http://127.0.0.1:8080
```

The image serves the static build with nginx and does **not** proxy `/api`. Build it
with `VITE_API_URL` set to the public backend URL, and enable CORS for the frontend
origin on the backend.

## Features by role

| Role | Screens |
|---|---|
| Visitor | Landing page, login, patient sign-up |
| Patient | Home, **Minhas consultas** (upcoming and past), **Meus exames** with results |
| Attendant | **Agendamentos**: schedule, reschedule, cancel and register no-shows; **Exames**: schedule and mark as performed |
| Doctor | **Agenda** (day, week, month) with attendance record, exam requests and no-show; **Pacientes** attended; **Exames**, registering the result of the ones they requested |
| Admin | Everything the attendant does, plus the calendar of any doctor |
| Any signed-in user | **Meu perfil** with CPF/RG documents, and a reminder to register one |

Business rules mirrored in the UI (the backend remains the authority and rejects
violations on its own):

- Appointments start on 30-minute slots, in the future, within business hours
  (07:00–18:00, `BUSINESS_HOURS` in `src/utils/clinic.js`). The picker hides slots
  the doctor already has; the API still answers `409` if two people pick the same
  slot at once. Business hours are only enforced in the frontend.
- Attendance and no-shows can only be registered once the appointment time has passed.
- Only the doctor who requested an exam registers its result.
- Public sign-up creates **patient** accounts only; the role is never sent.

## Project structure

```
src/
  services/api.js        HTTP client: every endpoint, Portuguese error messages, 401 handling
  contexts/              Session (AuthProvider) and the useAuth hook
  hooks/                 useAsync (loading/error/reload) and useSubmit (form actions)
  utils/clinic.js        Status labels, date/slot helpers, business hours
  components/clinic/     Shared UI: headings, badges, DataView, Modal, SlotPicker
  pages/                 One folder per screen (Appointments, Calendar, Exams, ...)
  test/                  Test setup and helpers
```

## Session and security

- The backend issues a JWT access token (30 minutes) at login. It is kept in
  `localStorage` so the session survives a reload, and sent as
  `Authorization: Bearer` on each request. Pages never handle the token directly:
  they use the `api` object from `useAuth()`, and a `401` ends the session.
- The session is renewed through `POST /auth/refresh` about two minutes before it
  expires, **only if the user clicked or typed since the last renewal**. An idle
  session expires and the user has to log in again.
- No clinical data is stored in the browser.
- Known limitation: a token in `localStorage` can be read by any script running on
  the page, so an XSS flaw would expose it. A stronger option is an `HttpOnly`,
  `Secure`, `SameSite` cookie set by the backend, which needs backend changes and
  CSRF protection.

## Not implemented (possible next steps)

- **Password reset by e-mail.** Free ways to send e-mail: [Mailpit](https://mailpit.axllent.org/)
  in Docker Compose captures messages locally (no account, good for demos); Resend
  and Brevo have free tiers; Gmail SMTP works with an app password. A safe flow uses
  single-use tokens that expire in about 30 minutes, stores only their hash, and
  always answers the same way whether the e-mail exists or not. The backend must
  implement it first (see its README).
- Role management screens: handled by other team members.
- Patient-uploaded exam files: out of scope, since exams are performed at the clinic.
