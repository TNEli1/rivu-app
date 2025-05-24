# Rivu Finance Deployment Guide

This document provides instructions for deploying the Rivu financial app to production using Vercel for the frontend and Render for the backend.

## Prerequisites

1. **PostgreSQL Database** - Create a PostgreSQL database instance on Render or use Neon (https://neon.tech)
2. **Plaid Development/Production Account** - Ensure you have Plaid API credentials
3. **Vercel Account** - For deploying the frontend
4. **Render Account** - For deploying the backend API

## Environment Variables

### Required Environment Variables

Set these variables in both your Vercel and Render deployments:

```
# Node Environment
NODE_ENV=production

# Database
DATABASE_URL=postgresql://username:password@hostname:port/database

# Authentication
JWT_SECRET=your_secure_jwt_secret_key_here

# Plaid API
PLAID_CLIENT_ID=your_plaid_client_id
PLAID_SECRET_PRODUCTION=your_plaid_production_secret
PLAID_ENV=production
PLAID_REDIRECT_URI=https://tryrivu.com/callback
PLAID_REDIRECT_REGISTERED=true

# Frontend URL (CORS)
ALLOWED_ORIGINS=https://tryrivu.com

# OpenAI API (for AI financial insights)
OPENAI_API_KEY=your_openai_api_key
```

## Deployment Steps

### 1. Backend Deployment (Render)

1. Create a new Web Service in Render
2. Connect your GitHub repository
3. Configure the service with the following settings:
   - **Name**: `rivu-api`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build && npm run db:deploy`
   - **Start Command**: `npm run start`
   - **Plan**: At least the Standard plan ($7/month) is recommended
   - **Set all the environment variables** listed above

4. Configure Auto-Deploy from your main branch
5. Add a health check path: `/health`

### 2. Frontend Deployment (Vercel)

1. Create a new project in Vercel
2. Connect your GitHub repository
3. Configure the build settings:
   - **Framework Preset**: `Vite`
   - **Build Command**: (leave as default)
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

4. Set the required environment variables:
   - `VITE_API_URL=https://rivu-api.onrender.com` (your Render backend URL)
   - `NODE_ENV=production`

5. Deploy and set up your custom domain (`tryrivu.com`)

### 3. Database Setup

The application is configured to automatically run migrations during the Render build process. If you need to manually run migrations:

```bash
# SSH into your Render instance or run locally with production env vars
npm run db:deploy
```

### 4. Plaid Configuration

1. Log in to your Plaid Dashboard
2. Go to API Settings
3. Add `https://tryrivu.com/callback` as an allowed redirect URI
4. Enable webhooks and set the webhook URL to `https://rivu-api.onrender.com/api/plaid/webhook`

### 5. Post-Deployment Verification

After deploying, verify that:

1. The health endpoint returns `200 OK`: `https://rivu-api.onrender.com/health`
2. The frontend can successfully connect to the backend
3. Authentication works properly
4. Plaid connections can be created and OAuth flows complete successfully
5. Transactions are syncing properly

## Rollback Procedure

If issues arise during deployment:

1. For Render, you can roll back to a previous deployment from the Deployments tab
2. For Vercel, you can revert to a previous deployment from the Deployments section

## Monitoring and Maintenance

- Render provides built-in logs and metrics
- Set up Render alerts for the `/health` endpoint
- Monitor database performance using the Neon dashboard
- Check Plaid webhooks are being received properly

## Security Considerations

- The app implements rate limiting to prevent abuse
- HTTPS is enforced on all connections
- JWT tokens are used for authentication with HTTP-only cookies
- Sensitive data is never logged

## Support Contacts

For deployment issues, contact your DevOps team or infrastructure provider.