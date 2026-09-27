# College ERP - Production Deployment Guide

This guide details the exact steps and environment variables required to deploy the full-stack **College ERP** system across **Vercel** (Frontend), **Render** (Backend), and **MongoDB Atlas** (Database).

---

## 1. Database Deployment: MongoDB Atlas

### Step-by-Step Setup:
1. Log in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a new Shared (M0 Free Tier) or Dedicated Cluster.
3. Under **Database Access**, create a database user (e.g. `college_admin`) with **Read and write to any database** privileges.
4. Under **Network Access**, add an IP Access Entry:
   - For Render cloud hosting, add `0.0.0.0/0` (Allow Access from Anywhere) or Render's specific outbound IP range.
5. In **Database Deployments**, click **Connect** -> **Drivers** (Node.js).
6. Copy the connection string format:
   ```text
   mongodb+srv://<username>:<password>@<cluster-address>.mongodb.net/college_erp?retryWrites=true&w=majority
   ```

---

## 2. Backend Deployment: Render

### Step-by-Step Setup:
1. Push the code repository to GitHub/GitLab.
2. Log in to [Render](https://render.com) and click **New +** -> **Web Service**.
3. Connect your repository.
4. Set the following build and runtime settings:
   - **Name**: `college-erp-api`
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Configure the **Environment Variables** in Render's dashboard:

| Variable Name | Example / Production Value | Description |
|---|---|---|
| `NODE_ENV` | `production` | Enables production mode, disables stack traces & memory fallback |
| `PORT` | `10000` *(or default assigned by Render)* | Port for Express server |
| `MONGODB_URI` | `mongodb+srv://<db_user>:<db_pass>@cluster0.xxx.mongodb.net/college_erp?retryWrites=true&w=majority` | MongoDB Atlas URI |
| `JWT_SECRET` | `<32+_character_cryptographically_secure_random_string>` | Secret key for signing authentication JWTs |
| `JWT_EXPIRES_IN` | `24h` | Token expiration duration |
| `CLIENT_URL` | `https://your-college-erp.vercel.app` | Frontend production origin for CORS validation |
| `SEED_DATA` | `true` *(first run only, then `false`)* | Seeds initial admin credentials and demo roster |

6. Deploy the service. Note your Render URL: `https://college-erp-api.onrender.com`.

---

## 3. Frontend Deployment: Vercel

### Step-by-Step Setup:
1. Log in to [Vercel](https://vercel.com) and click **Add New...** -> **Project**.
2. Select your repository.
3. Configure the project settings:
   - **Framework Preset**: `Other`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build` *(or leave blank for static assets)*
   - **Output Directory**: `.`
4. Configure **Environment Variables** in Vercel:

| Variable Name | Production Value | Description |
|---|---|---|
| `VITE_API_URL` | `https://college-erp-api.onrender.com/api` | Render backend API endpoint |

5. For static vanilla HTML/JS deployments on Vercel, the client dynamic URL resolver (`api.js`) connects to `window.__API_URL__`, `localStorage.getItem("API_URL")`, or same-origin `/api` with URL fallback.
6. Click **Deploy**.

---

## 4. Post-Deployment Verification Checklist

1. **Health Check**: Open `https://college-erp-api.onrender.com/api/health` and verify `database: "connected"`.
2. **Admin Login**: Log in on the Vercel URL using the administrative credentials.
3. **Database Population**: Confirm dashboard displays real counts and student records.
4. **CORS Validation**: Check browser DevTools network tab to ensure no CORS errors occur.
5. **Disable Seeding**: In Render, set `SEED_DATA=false` after initial deployment to preserve live production data.
