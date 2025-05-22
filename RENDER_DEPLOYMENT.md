# Render Deployment Guide for Rivu Finance

This guide provides step-by-step instructions for deploying the Rivu application as a unified full-stack service on Render.

## Overview

With this configuration, Render will:
1. Build both the frontend and backend
2. Serve the React frontend as static files
3. Run the Express backend for API requests
4. Connect to a PostgreSQL database

## Deployment Steps

### 1. Create a PostgreSQL Database on Render

1. Log in to your Render dashboard
2. Navigate to **New** > **PostgreSQL**
3. Configure your database:
   - **Name**: rivu-db (or your preferred name)
   - **Database**: rivu_production
   - **User**: (Auto-generated)
   - **Region**: Choose the region closest to your users
   - **Plan**: Select appropriate plan based on your needs
4. Click **Create Database**
5. Once created, note the Internal Database URL (under "Connections" tab)

### 2. Deploy the Full-Stack Application

1. Navigate to **New** > **Web Service**
2. Connect your GitHub repository
3. Configure your web service:
   - **Name**: rivu-app (or your preferred name)
   - **Environment**: Node
   - **Region**: Choose the same region as your database
   - **Branch**: main (or your preferred branch)
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
   - **Plan**: Select appropriate plan

4. Add Environment Variables:
   - **NODE_ENV**: `production`
   - **DATABASE_URL**: (Use the Internal Database URL from your Render PostgreSQL)
   - **PORT**: `8080` (this is used by Render)
   - Add other required environment variables (JWT, API keys, etc.)

5. Click **Create Web Service**

### 3. Database Migration

After the initial deployment, you'll need to run database migrations. You can do this in two ways:

#### Option 1: Using Render Shell

1. Navigate to your web service in the Render dashboard
2. Go to the **Shell** tab
3. Run: `npm run db:push`

#### Option 2: Via your local machine

1. Set the DATABASE_URL environment variable to your Render database URL
2. Run: `npm run db:push`

### 4. Domain Configuration

1. Navigate to your web service in the Render dashboard
2. Go to **Settings**
3. Under **Custom Domain**, click **Add Custom Domain**
4. Enter your domain (e.g., tryrivu.com)
5. Follow the DNS configuration instructions provided by Render

## Verification

After deployment, verify your application is working properly:

1. Visit your Render URL or custom domain
2. Verify that the frontend loads correctly
3. Test API endpoints function properly
4. Confirm database connectivity

## Troubleshooting

### Common Issues

- **Missing Frontend**: Make sure the build process completed successfully. Check build logs in Render.
- **Database Connection Issues**: Verify the DATABASE_URL is correct and the database is accessible.
- **Environment Variables**: Ensure all required environment variables are set correctly.

### Checking Logs

1. Navigate to your web service in the Render dashboard
2. Go to the **Logs** tab
3. Filter logs to diagnose specific issues

## Maintenance

- **Updates**: Push changes to your connected GitHub repository, and Render will automatically rebuild and deploy.
- **Database Backups**: Render PostgreSQL includes automated backups. Configure retention settings as needed.
- **Scaling**: Adjust your plan in the Render dashboard if you need more resources.

---

Remember to securely manage your environment variables and never commit sensitive information to your repository.