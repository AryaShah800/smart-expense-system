# Smart Expense System - Render Deployment Guide

## Overview
This full-stack application runs on Render with:
- **Backend**: Node.js/Express API server
- **Frontend**: React SPA (served from backend in production)
- **Database**: MongoDB Atlas

## Backend Setup on Render

### 1. Create a New Web Service
1. Go to [render.com](https://render.com)
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `smart-expense-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm run start:prod`
   - **Plan**: Free or Paid (as needed)

### 2. Set Environment Variables
Click "Advanced" and add:

```
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname
NODE_ENV=production
PORT=7000
FRONTEND_URL=https://your-frontend-domain.onrender.com
JWT_SECRET=your-secure-secret-here
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

**Important**: 
- Get `MONGO_URI` from MongoDB Atlas
- For Gmail: Enable 2FA and generate an app password (not your regular password)
- Use a strong `JWT_SECRET`

### 3. Deploy
The postinstall script automatically:
- Installs client dependencies
- Builds the client (`npm run build`)
- Backend serves the built frontend in production

## Frontend Setup on Render (Optional - if serving separately)

### Alternative: Deploy Frontend Separately
If you want frontend on a separate domain:

1. Create a new "Static Site" on Render
2. Connect GitHub
3. Configure:
   - **Build Command**: `npm run build`
   - **Publish Directory**: `dist`

4. Add environment variables to `.env`:
   ```
   VITE_API_URL=https://your-backend.onrender.com/api
   VITE_SOCKET_URL=https://your-backend.onrender.com
   ```

## File Changes Made

### Backend
- `index.js`: 
  - Added dynamic CORS configuration via `ALLOWED_ORIGINS` or `FRONTEND_URL` env vars
  - Added static file serving for production client build
  - Fixed socket.io CORS for cloud deployment

- `package.json`:
  - Added `start:prod` script
  - Added `postinstall` script to auto-build client

- `.env.example`: Template for required environment variables

### Frontend
- `src/api/axios.js`: Already configured for `VITE_API_URL` env var
- `src/api/socket.js`: Updated to use `VITE_SOCKET_URL` env var
- `.env.example`: Template for frontend environment variables

## Database Setup

### MongoDB Atlas
1. Create a free MongoDB Atlas cluster: [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a database user with secure password
3. Add IP whitelist (add "0.0.0.0/0" for Render access)
4. Copy connection string as `MONGO_URI`

## Testing Locally

### Test Production Build
```bash
# Backend
cd backend
npm install
NODE_ENV=production npm run start:prod

# In another terminal, test API
curl http://localhost:7000
```

### Environment Variables Local Testing
Create `.env` files:

**backend/.env**:
```
MONGO_URI=mongodb+srv://...
NODE_ENV=production
PORT=7000
FRONTEND_URL=http://localhost:5173
JWT_SECRET=test-secret
```

**client/.env**:
```
VITE_API_URL=http://localhost:7000/api
VITE_SOCKET_URL=http://localhost:7000
```

Then run:
```bash
# Terminal 1 - Backend
cd backend && npm run start:prod

# Terminal 2 - Frontend
cd client && npm run dev
```

## Troubleshooting

### CORS Errors
- Check `FRONTEND_URL` or `ALLOWED_ORIGINS` matches your frontend domain exactly
- Ensure HTTPS is used in production URLs

### Socket.io Connection Failed
- Verify `VITE_SOCKET_URL` matches backend URL
- Check browser console for connection errors

### Database Connection Failed
- Test `MONGO_URI` format
- Verify IP whitelist in MongoDB Atlas (should include Render's IPs)
- Ensure database user has correct permissions

### Build Issues on Render
- Check build logs in Render dashboard
- Ensure `postinstall` script has write permissions
- Verify all dependencies in `package.json` are compatible

## Production Checklist

- [ ] MongoDB Atlas cluster created and configured
- [ ] Environment variables set on Render
- [ ] IP whitelist includes Render's servers
- [ ] JWT_SECRET is strong and unique
- [ ] FRONTEND_URL/ALLOWED_ORIGINS configured correctly
- [ ] Email credentials valid (if using email features)
- [ ] Run local test with production settings
- [ ] Test API endpoints from frontend
- [ ] Test real-time features (socket.io)
- [ ] Check Render logs for errors
- [ ] Set up monitoring/alerts

## Helpful Links
- [Render Documentation](https://render.com/docs)
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- [Environment Variables](https://render.com/docs/environment-variables)
