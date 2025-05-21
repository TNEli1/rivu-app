# Rivu Finance Platform

A modern personal finance platform that combines intelligent financial tracking with advanced user engagement and security features.

## Migration from Replit to Production

This repository has been prepared for migration from Replit to:
- Frontend → Vercel (https://tryrivu.com)
- Backend → Render (Node.js + Express)
- Database → PostgreSQL on Render

## Quick Start

### Development
```bash
# Install dependencies
npm install

# Run in development mode
npm run dev
```

### Production
```bash
# Build for production
npm run build

# Start production server
npm run start
```

## Environment Configuration

See `.env.example` for required environment variables.

## Database Migration

The application uses Drizzle ORM with PostgreSQL. To apply database schema changes:

```bash
# Apply database schema changes
npm run db:push
```

## Security Features

- JWT authentication with secure HTTP-only cookies
- Rate limiting on critical endpoints
- CSRF protection
- Content Security Policy
- Structured error logging
- Health monitoring endpoint

## Deployment Instructions

For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)

## Architecture

- **Frontend**: React with TypeScript, Tailwind CSS, and Shadcn/UI components
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT with secure cookie storage
- **Integrations**: Plaid for bank connectivity, OpenAI for financial insights