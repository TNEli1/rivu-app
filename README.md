# Rivu Finance App

An AI-powered personal finance platform that combines intelligent financial tracking with advanced user engagement and security features.

## Deployment to Render

### Setup Instructions

1. Create a new Web Service in your Render Dashboard
2. Connect your repository
3. Configure the following settings:
   - **Name**: rivu-finance-app
   - **Environment**: Node
   - **Build Command**: `chmod +x ./build.sh && ./build.sh`
   - **Start Command**: `NODE_ENV=production node dist/index.js`

### Environment Variables

Set the following environment variables in your Render Dashboard:

- `NODE_ENV`: production
- `DATABASE_URL`: (provided by your Render PostgreSQL service)
- `PLAID_CLIENT_ID`: Your Plaid client ID
- `PLAID_SECRET`: Your Plaid secret key
- `PLAID_ENV`: production
- `JWT_SECRET`: A secure secret for JWT tokens
- `POSTHOG_API_KEY`: Your PostHog API key (for analytics)

## Local Development

1. Install dependencies: `npm install`
2. Start the backend server: `npm run dev`
3. In a separate terminal, start the frontend development server:
   ```
   cd client
   npm install
   npm run dev
   ```

## Project Structure

- `/client`: React frontend
- `/server`: Express backend
- `/shared`: Shared types and schemas
- `/dist`: Production build (generated)

## Database

The application uses PostgreSQL with Drizzle ORM. The database schema is defined in `/shared/schema.ts`.

To update the database schema:
```
npm run db:push
```