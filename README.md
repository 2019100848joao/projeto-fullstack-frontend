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

The image builds the app and serves it with nginx, which also proxies `/api/*` to
the backend container (same origin, so no CORS). Both containers share the Docker
network `clinic`, created by the backend's `docker-compose.yml`.

```bash
# 1. In the backend folder: start Postgres + API (creates the "clinic" network)
make up

# 2. Here: build and run the frontend on that network
make docker-build
make docker-run                    # http://127.0.0.1:8080
```

`make docker-run` is `docker run -p 127.0.0.1:8080:8080 --network clinic -e API_UPSTREAM=http://clinic_api:8000 clinic-frontend`.
Override with `PORT`, `NETWORK` or `API_UPSTREAM`. nginx resolves the backend on each
request, so the frontend starts even if the API is not up yet (API calls answer `502`
until it is).

To serve the frontend against a backend on another host instead, either point
`API_UPSTREAM` to its URL, or build with `--build-arg VITE_API_URL=https://api.example.com`
and enable CORS for the frontend origin on the backend.

## Features by role

| Role | Screens |
|---|---|
| Visitor | Landing page, login, patient sign-up |
| Patient | Home, **Minhas consultas** (upcoming and past), **Meus exames** with results |
| Attendant | **Agendamentos**: schedule, reschedule, cancel and register no-shows; **Exames**: schedule and mark as performed |
| Doctor | **Agenda** (day, week, month) with attendance record, exam requests and no-show; **Pacientes** attended; **Exames**, registering the result of the ones they requested |
| Admin | Everything the attendant does, plus the calendar of any doctor; **Solicitações de cargo** (approve or reject role requests) and **E-mails** (log of every e-mail the system recorded) |
| Any signed-in user | **Meu perfil** with CPF/RG documents, and a reminder to register one. Non-admins can also ask there to become a doctor or attendant and follow the request; **Notificações** lists the e-mails sent to them |

Business rules mirrored in the UI (the backend remains the authority and rejects
violations on its own):

- Appointments start on 30-minute slots, in the future, within business hours
  (07:00–18:00, `BUSINESS_HOURS` in `src/utils/clinic.js`). The picker hides slots
  the doctor already has; the API still answers `409` if two people pick the same
  slot at once. Business hours are only enforced in the frontend.
- Attendance and no-shows can only be registered once the appointment time has passed.
- Only the doctor who requested an exam registers its result.
- Public sign-up creates **patient** accounts only; the role is never sent. Other roles
  come from a request in **Meu perfil** that an admin approves. Only one request can be
  pending at a time; once approved, the user's menus switch to the new role the next
  time they open their profile or notifications (no new login needed).

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
  they use the `api` object from `useAuth()` (document registration included), and a `401`
  ends the session and opens the login screen with "Sua sessão expirou".
- The session is renewed through `POST /auth/refresh` about two minutes before it
  expires, **only if the user clicked or typed since the last renewal**. An idle
  session expires and the user has to log in again.
- If a screen crashes while rendering, an error boundary shows "Algo deu errado nesta tela"
  with retry and reload buttons instead of a blank page; switching sections clears it.
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
- Patient-uploaded exam files: out of scope, since exams are performed at the clinic.
