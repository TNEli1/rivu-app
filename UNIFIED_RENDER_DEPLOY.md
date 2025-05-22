# Unified Render Deployment Guide for Rivu

This guide explains how to deploy the Rivu application to Render as a unified service where a single Render web service hosts both the Express backend and serves the React frontend static files.

## Deployment Preparation

Follow these steps to prepare your application for deployment:

### 1. Build the Application

Run the build script which creates both frontend and backend in the right structure:

```bash
./build-for-render.sh
```

This script will:
1. Build the React frontend with Vite
2. Create a `dist/public` directory
3. Copy the frontend build files to `dist/public`
4. Build the Express backend to `dist/index.js`

### 2. Test Production Mode Locally

To test the unified application locally before deploying:

```bash
NODE_ENV=production npm run start
```

Visit `http://localhost:8080` to verify that:
- The frontend loads correctly
- API endpoints work properly

## Deploying to Render

### 1. Create a PostgreSQL Database

1. Log in to your Render dashboard
2. Go to **New** → **PostgreSQL**
3. Set up your database with appropriate name and plan
4. Note the internal connection string for the next step

### 2. Create a Web Service

1. Go to **New** → **Web Service**
2. Connect your GitHub repository
3. Configure the service:
   - **Name**: rivu (or your preferred name)
   - **Environment**: Node
   - **Build Command**: `./build-for-render.sh`
   - **Start Command**: `NODE_ENV=production node dist/index.js`

### 3. Configure Environment Variables

Add these required environment variables:

```
NODE_ENV=production
DATABASE_URL=[your_render_postgresql_connection_string]
JWT_SECRET=[secure_random_string]
JWT_EXPIRES_IN=30m  
JWT_REFRESH_EXPIRES_IN=7d
PLAID_CLIENT_ID=[your_plaid_client_id]
PLAID_SECRET_PRODUCTION=[your_plaid_secret]
PLAID_ENV=production
PLAID_REDIRECT_URI=https://tryrivu.com/callback
OPENAI_API_KEY=[your_openai_key]
```

Add any other environment variables your application needs.

### 4. Deploy and Initialize Database

1. Click **Create Web Service** to deploy the application
2. Once deployed, go to the **Shell** tab in your Render dashboard
3. Run the database migration: `npm run db:push`

### 5. Configure Custom Domain

1. In your web service's settings, go to **Custom Domain**
2. Add your domain (e.g., tryrivu.com)
3. Follow Render's instructions to update your DNS settings

## Verifying Deployment

After deployment:

1. Visit your Render URL or custom domain
2. Test user signup and login functionality
3. Verify that API endpoints work by testing core features
4. Confirm that all frontend routes are handled correctly

## Troubleshooting

### Common Issues

- **Frontend Not Loading**: Check that the build process completed successfully and static files were copied to `dist/public`.
- **API Errors**: Verify all environment variables are set correctly.
- **Database Issues**: Confirm the `DATABASE_URL` is correct and migrations were applied.

### Checking Logs

Visit the **Logs** tab in your Render dashboard to view application logs and diagnose issues.

## Updating the Deployment

When you make changes to your application:

1. Push changes to your GitHub repository
2. Render will automatically rebuild and redeploy your application
3. Database schema changes require running `npm run db:push` again

## Security Considerations

- All API keys and secrets should only be stored in Render environment variables
- Frontend code should never contain sensitive information
- Use HTTPS for all communication (Render handles this automatically)

---

By following this unified deployment approach, your Rivu application will have both frontend and backend served from a single Render service, simplifying your infrastructure and deployment process.