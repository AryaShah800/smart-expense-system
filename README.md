# Smart Expense System

[![Backend tests](https://github.com/AryaShah800/smart-expense-system/actions/workflows/backend-tests.yml/badge.svg)](https://github.com/AryaShah800/smart-expense-system/actions/workflows/backend-tests.yml)

A full-stack expense tracker with email-verified sign-up, budgets, recurring transactions, shared group expenses and an installable offline-capable PWA.

**[Live demo](https://smart-expense-system.vercel.app)** · The API runs on Render's free tier, so the first request after a quiet period can take up to a minute while it wakes.

## Features

- Email OTP sign-up with resend and edit-email, JWT sessions, bcrypt password hashing
- Income and expense tracking with categories, search and filters
- Budgets and recurring transactions processed on a schedule
- Groups: shared expenses, member invitations, settlements and live notifications over Socket.IO
- Dashboard charts (Recharts) and PDF report export
- Light and dark themes, currency setting, mobile layout
- PWA with service worker for offline use

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React, Vite, Tailwind CSS 4, Recharts, Socket.IO client |
| Backend | Node.js, Express, Mongoose, Socket.IO |
| Database | MongoDB Atlas |
| Email | Brevo transactional API |
| Hosting | Vercel (frontend), Render (API) |
| CI | GitHub Actions: backend tests and `npm audit`, daily API health check |

## Architecture

```
React PWA (Vercel) ──HTTPS + JWT──▶ Express API (Render) ──▶ MongoDB Atlas
        ▲                                   │
        └──────── Socket.IO (live updates) ─┘        Brevo ◀── OTP emails
```

Routes live in `backend/routes`, request handling in `backend/controllers`, Mongoose schemas in `backend/models`, and auth middleware in `backend/middlewares`. Group endpoints check membership on every request; `backend/tests/group-authorization.test.js` covers those rules.

## Run locally

Prerequisites: Node.js 22+ and a MongoDB connection string (a free Atlas cluster works).

```bash
# 1. API
cd backend
cp .env.example .env        # fill in MONGO_URI, JWT_SECRET, BREVO_API_KEY
npm ci
npm run dev                 # http://localhost:7000

# 2. Frontend (new terminal)
cd client
cp .env.example .env
npm ci
npm run dev                 # http://localhost:5173
```

Sign-up sends an OTP email through Brevo, so `BREVO_API_KEY` and a verified sender are required to create accounts.

## Tests

```bash
cd backend && npm test
```

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## What I'd do next

- Add tests for auth, transactions and budgets (only group authorization is covered today)
- Move the JWT from `localStorage` to an `httpOnly` cookie end to end
- Add rate limiting on sign-up and OTP endpoints
- Fix the existing ESLint errors in the client

## License

MIT. See [LICENSE](LICENSE).
