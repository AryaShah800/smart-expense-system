# Deployment

The app runs as two services plus a database:

| Part | Host | Root directory |
| --- | --- | --- |
| API (Express + Socket.io) | Render web service | `backend` |
| Client (React PWA) | Vercel | `client` |
| Database | MongoDB Atlas | n/a |

The Render API is at `https://smart-expense-system-api.onrender.com`. Record the Vercel production URL in the README and in the repo's About → Website field.

## 1. MongoDB Atlas

1. Create a free cluster and a database user.
2. Network Access: allow `0.0.0.0/0` (Render's outbound IPs change on the free plan).
3. Copy the connection string; it becomes `MONGO_URI`.

## 2. API on Render

New → Web Service, connect the repo, then:

| Setting | Value |
| --- | --- |
| Root directory | `backend` |
| Build command | `npm install` |
| Start command | `npm start` |

Environment variables:

| Variable | Notes |
| --- | --- |
| `MONGO_URI` | Atlas connection string |
| `MONGO_USER`, `MONGO_PASSWORD` | Optional, only if credentials are kept out of the URI |
| `JWT_SECRET` | Required. Long random string (`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`). The server refuses to issue tokens without it. Changing it logs every user out. |
| `NODE_ENV` | `production` (enables `SameSite=None; Secure` cookies) |
| `ALLOWED_ORIGINS` | Your Vercel origin, for example `https://smart-expense.vercel.app` (comma-separate several). Strongly recommended: while unset, every `*.vercel.app` origin is allowed. |
| `BREVO_API_KEY` | Brevo transactional email key, used for OTP emails |
| `ENABLE_DEBUG_OTP` | Leave unset in production |

The sender address for OTP emails is set in `backend/controllers/user.js` and must be a verified sender in Brevo.

## 3. Client on Vercel

Import the repo with root directory `client`. Framework preset: Vite.

| Variable | Value |
| --- | --- |
| `VITE_API_URL` | `/api` |
| `VITE_SOCKET_URL` | `https://smart-expense-system-api.onrender.com` |

`client/vercel.json` rewrites `/api/*` to the Render API, so the auth cookie belongs to the Vercel domain. If the Render URL changes, update the rewrite destination there.

## 4. Demo data

With `MONGO_URI` pointing at the target database:

```bash
cd backend
npm run seed:demo
```

This creates `demo@smartexpense.app` (password `Demo@1234`, or `DEMO_PASSWORD` if set) with six months of transactions, budgets, recurring items and two groups. It only touches the demo users, so it is safe on production; run it again any time to reset the demo.

`npm run seed:heavy` is different: it deletes everything in the database and refuses to run without `--wipe`. Use it on local databases only.

## 5. Health check

`.github/workflows/backend-health.yml` pings the API daily, which also wakes a sleeping Render instance. Run it manually from the Actions tab when needed.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| First load takes about a minute | Render free instance was asleep; retry |
| CORS error in the browser | Origin missing from `ALLOWED_ORIGINS`, or it has a trailing path |
| Logged out right after login | Client is calling the Render URL directly (third-party cookie blocked); set `VITE_API_URL=/api` and redeploy |
| `429 Too many attempts` | Rate limit hit on login or OTP; wait 15 minutes |
| Socket never connects | `VITE_SOCKET_URL` wrong, or the user is not logged in |
| Server exits at boot with a Mongo error | `MONGO_URI` missing or Atlas network access blocks Render |
