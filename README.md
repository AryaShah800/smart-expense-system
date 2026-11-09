# Smart Expense System

A personal and group finance tracker built as an installable PWA. Track income and expenses, set budgets, automate recurring transactions, split costs with friends and settle up, and get live notifications.

> **Live demo:** <!-- TODO: replace with the Vercel production URL --> `https://YOUR-APP.vercel.app`
> **Demo login:** `demo@smartexpense.app` / `Demo@1234` (sample data, resets periodically). The API runs on a free Render instance, so the first request after idle can take up to a minute to wake it.

## Features

- **Transactions and categories:** income and expense tracking with default and custom categories.
- **Budgets:** per-category limits with status against actual spending.
- **Recurring transactions:** daily, weekly, monthly or yearly items, processed automatically; pause and resume.
- **Group expenses:** equal, exact and percentage splits, balances per member, settle-up payments, invite by code or invitation.
- **Reports and insights:** dashboard charts, spending insights and monthly PDF export.
- **Real-time notifications:** Socket.io, authenticated per user.
- **PWA:** installable, with offline caching and background sync for queued changes.
- **Email verification:** OTP sent on signup.

## Architecture

```mermaid
flowchart LR
  B[Browser<br/>React 19 PWA] -- "/api (rewrite)" --> V[Vercel]
  V -- proxy --> A[Express 5 API<br/>on Render]
  B -- "WebSocket (token)" --> A
  A --> M[(MongoDB Atlas)]
  A -- OTP email --> E[Brevo]
```

- The client calls `/api/*` on its own domain; `client/vercel.json` rewrites that to the Render API, so the auth cookie is first-party.
- Vercel cannot proxy WebSockets, so the socket connects straight to the API using a 2-minute token from `GET /api/users/socket-token`.

## Tech stack

| Layer | Tools |
| --- | --- |
| Client | React 19, Vite 7, React Router 7, Recharts, jsPDF, Socket.io client, vite-plugin-pwa (Workbox) |
| API | Node 22, Express 5, Mongoose 8, Socket.io |
| Data | MongoDB Atlas |
| Security | JWT in an `httpOnly` cookie, bcrypt, helmet, express-rate-limit, per-user socket rooms |
| CI | GitHub Actions (backend tests and `npm audit`, daily health ping) |

## Security notes

- The session JWT lives only in an `httpOnly` cookie, never in `localStorage` or a response body.
- Socket connections must present a valid token; the server decides which room a socket joins.
- Login, signup and OTP endpoints are rate limited (5 attempts per 15 minutes per IP and email).
- The debug OTP route does not exist unless `ENABLE_DEBUG_OTP=true`.
- Set `ALLOWED_ORIGINS` in production to restrict CORS to your own domain.

## Run locally

Requires Node 22+ and a MongoDB connection string (a free Atlas cluster works).

```bash
# API
cd backend
cp .env.example .env     # fill in MONGO_URI, JWT_SECRET, BREVO_API_KEY
npm install
npm run dev              # http://localhost:7000

# Client (second terminal)
cd client
cp .env.example .env
npm install
npm run dev              # http://localhost:5173
```

Sample data: `npm run seed:demo` in `backend/` creates the demo account (safe on any database; it only touches the demo users). Without email set up, add `ENABLE_DEBUG_OTP=true` to `backend/.env` for local testing and read an OTP from `GET /api/users/debug/otp?email=...`.

## Tests

```bash
cd backend
npm test                # 100+ integration tests: Supertest against an in-memory MongoDB
npm run test:coverage   # same, with a coverage report; fails under 70% line coverage
```

The first run downloads a MongoDB binary for `mongodb-memory-server` (cached afterwards). CI runs the backend tests with coverage, `npm audit`, and a client lint and build.

## Project structure

```
backend/
  controllers/   request handlers          routes/        Express routers
  middlewares/   auth, rate limits, socket auth
  models/        Mongoose schemas          scripts/       seed and load scripts
  tests/         node:test suites
client/
  src/pages/     route screens            src/components/  UI and charts
  src/api/       axios + socket clients   src/context/     auth state
```

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md).
