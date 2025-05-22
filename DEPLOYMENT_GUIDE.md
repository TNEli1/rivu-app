# Rivu Deployment Guide

This guide outlines the steps to deploy the Rivu finance platform to production environments.

## Project Structure

The project is structured for separate deployment:
- `/client` - Frontend React application (deployed to Vercel)
- `/server` - Backend Express API (deployed to Render)
- `/shared` - Shared TypeScript types and schemas

## 1. Frontend Deployment to Vercel

### Prerequisites
- A Vercel account
- GitHub repository with your project

### Steps
1. Connect your GitHub repository to Vercel
2. Configure the build settings:
   - Framework Preset: Vite
   - Root Directory: `client`
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. Add environment variables in the Vercel dashboard:
   ```
   VITE_API_URL=https://api.tryrivu.com  # Replace with your deployed backend URL
   ```
4. Deploy!

## 2. Backend Deployment to Render

### Prerequisites
- A Render account
- GitHub repository with your project
- PostgreSQL database (can be hosted on Render or separately)

### Steps
1. Create a new Web Service in Render
2. Connect your GitHub repository
3. Configure the build settings:
   - Name: `rivu-api` (or your preferred name)
   - Root Directory: `server`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
4. Add environment variables:
   ```
   NODE_ENV=production
   PORT=8080
   DATABASE_URL=postgres://user:password@hostname:port/database
   JWT_SECRET=your_jwt_secret_here
   JWT_EXPIRY=7d
   ALLOWED_ORIGINS=https://tryrivu.com,https://rivu-finance.vercel.app
   OPENAI_API_KEY=your_openai_api_key_here
   PLAID_CLIENT_ID=your_plaid_client_id
   PLAID_SECRET=your_plaid_secret
   PLAID_ENV=production
   POSTMARK_API_TOKEN=your_postmark_token_here
   APP_URL=https://api.tryrivu.com
   ```
5. Deploy!

## 3. Database Setup

### Using Render PostgreSQL
1. Create a PostgreSQL database on Render
2. Get the connection string from the Render dashboard
3. Add it as the `DATABASE_URL` environment variable in your backend service

### Using External PostgreSQL
1. Set up a PostgreSQL database with your preferred provider
2. Get the connection string 
3. Add it as the `DATABASE_URL` environment variable in your backend service

## 4. Post-Deployment Steps

### Database Migration
After deploying the backend, run database migrations:

1. Connect to your Render backend service using SSH
2. Run the following command:
   ```
   npm run db:push
   ```

### Verify API Connectivity
1. Test the API health endpoint: `https://your-api-url.onrender.com/health`
2. Verify that the frontend can communicate with the backend by testing authentication

## 5. Custom Domain Setup (Optional)

### Vercel Custom Domain
1. Go to your Vercel project settings
2. Navigate to the "Domains" section
3. Add your custom domain (e.g., `tryrivu.com`)
4. Follow the DNS configuration instructions

### Render Custom Domain
1. Go to your Render service settings
2. Navigate to the "Custom Domain" section
3. Add your custom domain (e.g., `api.tryrivu.com`)
4. Follow the DNS configuration instructions

## 6. Continuous Deployment

Both Vercel and Render support automatic deployments from your GitHub repository. Any changes pushed to your main branch will automatically trigger a new deployment.

## Troubleshooting

### Common Issues

#### CORS Errors
- Verify that the `ALLOWED_ORIGINS` environment variable includes all frontend domains
- Check that the frontend is using the correct API URL

#### Database Connection Issues
- Verify that the `DATABASE_URL` is correct
- Check database credentials and access permissions
- Ensure the database is accessible from the Render service

#### Authentication Problems
- Verify that the `JWT_SECRET` is set correctly
- Check that cookies are being properly set and sent with requests