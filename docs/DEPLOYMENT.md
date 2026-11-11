# Deployment

Production runs as three pieces: the React app on Vercel, the Express API on Render, and MongoDB Atlas.

## 1. Database (MongoDB Atlas)

1. Create a free cluster and a database user.
2. Allow Render's outbound traffic under Network Access (or `0.0.0.0/0` for a hobby project).
3. Copy the connection string into `MONGO_URI`.

## 2. API (Render web service)

- Root directory: `backend`
- Build command: `npm ci`
- Start command: `npm start`

Environment variables:

| Variable | Purpose |
| --- | --- |
| `NODE_ENV` | `production` (enables secure, cross-site cookies) |
| `MONGO_URI` | Atlas connection string |
| `MONGO_USER`, `MONGO_PASSWORD` | Optional, if credentials are kept out of the URI |
| `JWT_SECRET` | Long random string. The API refuses to sign tokens without it |
| `BREVO_API_KEY` | Brevo API key for OTP email |
| `ALLOWED_ORIGINS` | Extra frontend origins, comma-separated and exact (e.g. a custom domain) |

`https://smart-expense-system.vercel.app` is always allowed. Other `*.vercel.app` preview URLs are not; add them to `ALLOWED_ORIGINS` if needed.

## 3. Frontend (Vercel)

- Root directory: `client`
- Framework preset: Vite
- Environment variables: `VITE_API_URL` (e.g. `https://YOUR-API.onrender.com/api`) and `VITE_SOCKET_URL` (the API origin, no `/api`)
- `client/vercel.json` rewrites all routes to `index.html` for client-side routing.

## Keeping the free tier awake

`.github/workflows/backend-health.yml` calls the API once a day so the Atlas connection stays warm and failures show up in Actions.
