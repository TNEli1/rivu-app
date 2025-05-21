# Deployment Guide for Rivu Finance

This guide outlines the process for deploying the Rivu application in a production environment. The application architecture consists of:

- **Frontend**: Deployed on Vercel (https://tryrivu.com)
- **Backend**: Deployed on Render (Node.js + Express)
- **Database**: PostgreSQL on Render

## Prerequisites

Before deployment, ensure you have:

- Access to the Rivu GitHub repository
- Vercel account (for frontend deployment)
- Render account (for backend and database deployment)
- Domain access for tryrivu.com
- All required API keys (Plaid, OpenAI, Postmark)

## Environment Variables

The following environment variables must be set in your deployment environments:

### Backend (Render)

```
NODE_ENV=production
PORT=8080
DATABASE_URL=postgresql://username:password@hostname:port/database
JWT_SECRET=your_secure_jwt_secret_key
JWT_EXPIRES_IN=7d
PLAID_CLIENT_ID=your_plaid_client_id
PLAID_SECRET_PRODUCTION=your_plaid_production_secret
PLAID_ENV=production
PLAID_REDIRECT_URI=https://tryrivu.com/callback
PLAID_REDIRECT_REGISTERED=true
OPENAI_API_KEY=your_openai_api_key
POSTMARK_API_KEY=your_postmark_api_key
POSTMARK_FROM_EMAIL=support@tryrivu.com
POSTMARK_TEMPLATE_ID=your_template_id
ALLOWED_ORIGINS=https://tryrivu.com
APP_VERSION=1.0.0
```

### Frontend (Vercel)

```
VITE_API_URL=https://api.tryrivu.com
VITE_PLAID_CLIENT_ID=your_plaid_client_id
VITE_PLAID_ENV=production
VITE_PLAID_REDIRECT_URI=https://tryrivu.com/callback
```

## Deployment Steps

### 1. Database Setup (PostgreSQL on Render)

1. Log in to Render dashboard
2. Create a new PostgreSQL database
3. Note the connection string provided by Render
4. Apply migrations using Drizzle:
   ```
   npm run db:deploy
   ```

### 2. Backend Deployment (Render)

1. Connect your GitHub repository to Render
2. Create a new Web Service:
   - Select the repository
   - Environment: Node
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Environment Variables: Add all backend variables listed above

3. Configure Custom Domain:
   - Add `api.tryrivu.com` as a custom domain
   - Follow Render's instructions to configure DNS settings

### 3. Frontend Deployment (Vercel)

1. Connect your GitHub repository to Vercel
2. Configure project:
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Environment Variables: Add all frontend variables listed above

3. Configure Custom Domain:
   - Add `tryrivu.com` as a custom domain
   - Follow Vercel's instructions to configure DNS settings

## Post-Deployment Verification

After deployment, verify the following:

1. **Health Check**: Visit `https://api.tryrivu.com/health` to confirm the backend is running
2. **Authentication**: Test registration, login, and logout functionality
3. **Plaid Integration**: Connect a bank account using OAuth
4. **Core Features**: Test budgeting, transactions, and goals functionality
5. **Error Handling**: Confirm proper error responses (no stack traces exposed)

## Troubleshooting

### Common Issues

- **CORS Errors**: Verify `ALLOWED_ORIGINS` includes the frontend domain
- **Database Connection**: Check the `DATABASE_URL` is correct and accessible
- **Plaid OAuth**: Ensure `PLAID_REDIRECT_URI` matches exactly what's registered in Plaid dashboard
- **Rate Limiting**: If facing "Too many requests" errors, check server logs for IP address patterns

### Monitoring

- Use Render's built-in logging for backend monitoring
- Set up Vercel Analytics for frontend performance metrics
- Regularly check the `/health` endpoint for backend status

## Rollback Process

If deployment issues occur:

1. Immediately roll back to the previous stable version in Vercel/Render
2. Verify database integrity using diagnostic queries
3. Address issues in development environment before redeploying