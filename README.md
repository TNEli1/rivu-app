# Rivu Finance Platform

Rivu is an AI-powered personal finance platform that combines intelligent financial tracking with advanced user engagement and security features.

## Project Structure

This project is organized for separate deployment:

- `/client` - Frontend React application (deployed to Vercel)
- `/server` - Backend Express API (deployed to Render)
- `/shared` - Shared TypeScript types and schemas

## Frontend (Vercel Deployment)

The frontend is a React application built with:
- TypeScript
- Tailwind CSS
- Shadcn UI components
- React Query
- Wouter for routing

### Deployment Steps

1. Connect your GitHub repository to Vercel
2. Configure the build settings:
   - Framework Preset: Vite
   - Root Directory: `client`
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. Add environment variables in the Vercel dashboard:
   ```
   VITE_API_URL=https://api.tryrivu.com
   ```
4. Deploy!

## Backend (Render Deployment)

The backend is an Express API with:
- Node.js
- Express
- PostgreSQL with Drizzle ORM
- TypeScript
- JWT Authentication
- Plaid API Integration
- OpenAI Integration

### Deployment Steps

1. Connect your GitHub repository to Render
2. Configure the build settings:
   - Root Directory: `server`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
3. Set the following environment variables:
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
4. Deploy!

## Database

The application uses PostgreSQL, accessed via Drizzle ORM. The database connection is managed through the `DATABASE_URL` environment variable, which should point to your PostgreSQL instance.

## Local Development

For local development:

1. Start the backend:
   ```bash
   cd server
   npm install
   npm run dev
   ```

2. Start the frontend:
   ```bash
   cd client
   npm install
   npm run dev
   ```

For more detailed instructions, see the README files in the `/client` and `/server` directories.