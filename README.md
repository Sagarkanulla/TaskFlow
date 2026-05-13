# TaskFlow - Team Task Manager

A full-stack team collaboration app with project management, role-based access control, and task tracking.

## Test Credentials

| Role | Email | Password |
| --- | --- | --- |
| Admin | admin@demo.com | password123 |
| Member | member@demo.com | password123 |

Demo credentials are optional. You can also create a brand-new account with any real email from the signup page, then login with that email. Emails are normalized to lowercase so `YOU@COMPANY.COM` and `you@company.com` resolve to the same account.

## Features

- JWT authentication with signup, login, and current-user lookup
- Project management with owners and members
- Role-based access control for admin-only project and task operations
- Task CRUD with status, priority, due date, and assignment
- Dashboard with assigned tasks, overdue tracking, status breakdown, and project count
- Kanban-style project board
- Add registered members by real email
- Premium workspace UI inspired by the `awesome-design-md-main` product design references

# TaskFlow — Team Task Manager

TaskFlow is a full-stack team collaboration and project management application. It provides projects, tasks, role-based access control, and dashboards for tracking work across teams. The project includes a React + Vite frontend and a Node.js + Express backend using Prisma and PostgreSQL for persistence.

## Quick demo credentials

These demo accounts exist in the seeded database (if you run the provided seed script):

| Role  | Email             | Password     |
|-------|-------------------|--------------|
| Admin | admin@demo.com    | password123  |
| Member| member@demo.com   | password123  |

You can also register a new account from the signup page. Emails are normalized to lowercase by the backend.

## Features

- JWT-based authentication (signup, login, current user)
- Project CRUD with owners and members
- Role-based access control (admin / member) for sensitive actions
- Task CRUD (status, priority, due date, assignees, attachments)
- Kanban-style project board
- Dashboard: assigned tasks, overdue tracking, status breakdown, project counts
- Add team members by email and join-by-code company flow
- Responsive UI built with TailwindCSS and design guidance from the included `awesome-design-md-main` references

## Tech stack

- Frontend: React 18, Vite, Tailwind CSS, React Router, Axios
- Backend: Node.js, Express, Prisma ORM, Zod (validation), JWT, bcrypt
- Database: PostgreSQL (works with local Postgres or managed providers)
- Dev tooling: nodemon / ts-node (or node), Prisma CLI
- Deployment examples: Railway, Docker

## Repo structure (top-level)

- `backend/` — Express API, Prisma schema, migrations, seed data
- `frontend/` — React app (Vite) and UI components
- `awesome-design-md-main/` — design references used for UI polish
- `README.md` — this file

## Local development

Make sure you have Node.js (>=16), npm or yarn, and a running PostgreSQL instance (local or Docker).

### Backend

1. Install dependencies and prepare env:

```bash
cd backend
npm install
cp .env.example .env
# Edit .env and set DATABASE_URL and JWT_SECRET (see notes below)
```

2. Database migrations & seed (local development):

```bash
npx prisma migrate dev --name init
npm run seed
```

3. Start the dev server:

```bash
npm run dev
```

By default the backend runs on http://localhost:5001 (this project reserves 5000 on macOS). If you change PORT, update the frontend env.

Required backend env vars (example keys):

- `DATABASE_URL` — e.g. `postgresql://user:pass@localhost:5432/taskmgr`
- `JWT_SECRET` — a long random string used to sign tokens
- `PORT` — optional, defaults to 5001

### Frontend

1. Install and run:

```bash
cd frontend
npm install
cp .env.example .env
# Set VITE_API_URL to your backend base URL (e.g. http://localhost:5001)
npm run dev
```

2. The default Vite URL is http://localhost:5173.

Frontend env vars:

- `VITE_API_URL` — backend base URL (without trailing `/api`), e.g. `http://localhost:5001`

### Docker (Postgres)

To run a local Postgres quickly for development:

```bash
docker run -d --name taskflow-pg \
  -e POSTGRES_PASSWORD=pass \
  -e POSTGRES_USER=user \
  -e POSTGRES_DB=taskmgr \
  -p 5432:5432 \
  postgres
```

Then set `DATABASE_URL` to `postgresql://user:pass@localhost:5432/taskmgr` in `backend/.env`.

## Prisma notes

- Schema: `backend/prisma/schema.prisma`
- Common commands:

  - `npx prisma migrate dev` — apply migrations in development
  - `npx prisma migrate deploy` — apply migrations in production
  - `npx prisma studio` — GUI to inspect your DB

If you change the Prisma schema, create a migration and re-run the seed script if needed.

## API overview

This is a summarised list of the main API endpoints (prefix: `/api`):

- Auth
  - `POST /api/auth/signup` — create a new user
  - `POST /api/auth/login` — login and receive JWT
  - `GET  /api/auth/me` — get current user (requires Authorization header)

- Projects
  - `GET    /api/projects`
  - `POST   /api/projects`
  - `GET    /api/projects/:projectId`
  - `DELETE /api/projects/:projectId`
  - `POST   /api/projects/:projectId/members` — add member by email
  - `DELETE /api/projects/:projectId/members/:userId`

- Tasks
  - `GET    /api/tasks/dashboard` — dashboard data
  - `POST   /api/tasks`
  - `PATCH  /api/tasks/:id`
  - `DELETE /api/tasks/:id`

- Users
  - `GET /api/users/search?q=email`

Authentication: pass the JWT token in the `Authorization: Bearer <token>` header.

## Deployment

Railway (example):

1. Create a PostgreSQL database on Railway.
2. Deploy the `backend/` folder as a service and set environment variables: `DATABASE_URL`, `JWT_SECRET`, `PORT`.
3. Deploy the `frontend/` folder as a static site and set `VITE_API_URL` to the backend public URL.

Alternatively, build a Docker image that contains both frontend (built) and backend, or deploy to VPS/Heroku/Vercel as preferred.

## Tests

If the project includes tests, run them from the respective package folders. (Add test scripts as needed.)

## Troubleshooting

- Backend fails to connect: confirm `DATABASE_URL` and Postgres availability.
- Prisma errors after schema change: run `npx prisma migrate dev --name your_change` and restart the server.
- CORS / 4xx frontend issues: ensure `VITE_API_URL` points to the correct backend URL and the backend allows the frontend origin.

## Contributing

Contributions are welcome. Please open an issue to discuss major changes first. Basic workflow:

1. Fork the repository
2. Create a feature branch
3. Add tests (where applicable) and ensure lint/build passes
4. Open a pull request describing the change

See `awesome-design-md-main/CONTRIBUTING.md` for design and contribution guidelines used during the UI build.

## License

This project includes third-party designs and assets. See top-level `LICENSE`.

## Contact

If you need help running the project or want to collaborate, open an issue or reach out to the repository owner.

---

If you'd like, I can also:

- add a short Quick Start script (one-liners) for macOS (zsh)
- generate a minimal docker-compose.yml to run the DB + services
- add a small CONTRIBUTING.md or a Developer Quick Reference

Tell me which of those you'd like me to add next.
