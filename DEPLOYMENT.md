# Rivu Finance App - Unified Deployment Guide

This document outlines the steps for deploying the Rivu Finance application to Render as a unified application (frontend + backend).

## Deployment Architecture

The application uses a unified deployment approach:
- Express backend serves both the API endpoints and static frontend files
- PostgreSQL database provided by Render
- PostHog for analytics tracking
- All components deployed as a single service

## Deployment Steps

1. **Create a Web Service in Render**
   - Connect to your GitHub repository
   - Use these settings:
     - Name: `rivu-finance-app`
     - Environment: `Node`
     - Build Command: `chmod +x ./build.sh && ./build.sh`
     - Start Command: `NODE_ENV=production node dist/index.js`

2. **Create a PostgreSQL Database in Render**
   - Name: `rivu-database`
   - Connect it to your web service

3. **Configure Environment Variables**
   
   Add the following environment variables in Render:
   - `NODE_ENV`: `production`
   - `PLAID_CLIENT_ID`: Your Plaid client ID
   - `PLAID_SECRET`: Your Plaid secret
   - `PLAID_ENV`: `production`
   - `JWT_SECRET`: A secure random string for JWT tokens
   - `SESSION_SECRET`: A secure random string for sessions
   - `POSTHOG_API_KEY`: Your PostHog API key

## How It Works

### Build Process
Our `build.sh` script handles the unified build process:
1. Builds the React frontend (client)
2. Installs dependencies for the backend
3. Bundles the server code
4. Copies frontend build to the correct location
5. Prepares the database schema

### Runtime
In production:
1. The Express server starts up
2. It connects to the PostgreSQL database
3. It serves the frontend static files from `dist/public`
4. API requests are handled via the `/api` routes

## Monitoring & Maintenance

- Access logs via the Render dashboard
- Check application health via `/health` endpoint
- Monitor analytics in PostHog

## Database Management

The database schema is automatically pushed during deployment.
For manual database operations, connect via Render's database interface.

## Security Notes

- All API requests are sanitized to prevent injection attacks
- Content Security Policy restricts external resource loading
- User data is properly scoped by userId to prevent data leaks
- HTTPS is enforced by Render