# Deployment Guide for Rivu Finance

This guide outlines the process for deploying the Rivu application in a production environment. The application architecture consists of:

- **Full-stack Application**: Deployed on Render (https://tryrivu.com)
- **Database**: PostgreSQL on Render

## Prerequisites

Before deployment, ensure you have:

- Access to the Rivu GitHub repository
- Render account (for application and database deployment)
- Domain access for tryrivu.com
- All required API keys (Plaid, OpenAI, Postmark)

## Environment Variables

The following environment variables must be set in your deployment environments. **Never commit these values to the repository.**

### Production Environment (Render)

```
# Core Configuration
NODE_ENV=production
PORT=8080
APP_VERSION=1.0.0

# Database
DATABASE_URL=postgresql://username:password@hostname:port/database

# Security (Generate strong, random values)
JWT_SECRET=use_a_minimum_32_character_random_string
JWT_EXPIRES_IN=30m  # Short-lived tokens (30 minutes) 
JWT_REFRESH_EXPIRES_IN=7d

# Plaid Integration
PLAID_CLIENT_ID=your_plaid_client_id
PLAID_SECRET_PRODUCTION=your_plaid_production_secret  # Keep this secret!
PLAID_ENV=production
PLAID_REDIRECT_URI=https://tryrivu.com/callback
PLAID_REDIRECT_REGISTERED=true

# AI Services
OPENAI_API_KEY=your_openai_api_key  # Keep this secret!

# Email Services
POSTMARK_API_KEY=your_postmark_api_key  # Keep this secret!
POSTMARK_FROM_EMAIL=support@tryrivu.com
POSTMARK_TEMPLATE_ID=your_template_id

# Rate Limiting (Production Values)
RATE_LIMIT_WINDOW_MS=60000  # 1 minute in milliseconds
RATE_LIMIT_MAX_REQUESTS=30  # Maximum requests per minute
AUTH_RATE_LIMIT_MAX=10      # Stricter limit for auth endpoints

# Frontend Configuration 
VITE_APP_NAME=Rivu Finance
VITE_APP_VERSION=1.0.0
VITE_PLAID_ENV=production
VITE_PLAID_PRODUCTS=transactions
VITE_PLAID_COUNTRY_CODES=US
VITE_PLAID_LANGUAGE=en
```

### ⚠️ Important Security Notes

1. **Never store secrets in the frontend**: No API keys or secrets in client-side code - only use `VITE_` prefixed vars for public information.

2. **Generate strong secrets**: Use a secure random generator for JWT_SECRET:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

3. **Rotate secrets regularly**: Change sensitive keys every 30-90 days.

4. **Separate development/production secrets**: Never use the same secret values across environments.

## Deployment Steps

### 1. Database Setup (PostgreSQL on Render)

1. Log in to Render dashboard
2. Create a new PostgreSQL database
3. Note the connection string provided by Render
4. Apply migrations using Drizzle:
   ```
   npm run db:push
   ```

### 2. Full-Stack Application Deployment (Render)

1. Connect your GitHub repository to Render
2. Create a new Web Service:
   - Select the repository
   - Environment: Node
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Environment Variables: Add all environment variables listed above

3. Configure Custom Domain:
   - Add `tryrivu.com` as a custom domain
   - Follow Render's instructions to configure DNS settings

## Post-Deployment Verification

After deployment, verify the following:

1. **Health Check**: Visit `https://tryrivu.com/health` to confirm the application is running
2. **Authentication**: Test registration, login, and logout functionality
3. **Plaid Integration**: Connect a bank account using OAuth
4. **Core Features**: Test budgeting, transactions, and goals functionality
5. **Error Handling**: Confirm proper error responses (no stack traces exposed)

## Troubleshooting

### Common Issues

- **Static File Serving**: Ensure the frontend assets are built properly before deployment
- **Database Connection**: Check the `DATABASE_URL` is correct and accessible
- **Plaid OAuth**: Ensure `PLAID_REDIRECT_URI` matches exactly what's registered in Plaid dashboard
- **Rate Limiting**: If facing "Too many requests" errors, check server logs for IP address patterns

### Monitoring

- Use Render's built-in logging for application monitoring
- Implement client-side error tracking if needed
- Regularly check the `/health` endpoint for application status

## Rollback Process

If deployment issues occur:

1. Immediately roll back to the previous stable version in Render
2. Verify database integrity using diagnostic queries
3. Address issues in development environment before redeploying

## Git Security Practices

When working with the Rivu codebase in Git:

1. **Never commit secrets or environment files**:
   - The `.gitignore` file already excludes `.env` and other secret files
   - Always use `.env.example` as a template without real values

2. **If secrets are accidentally committed**:
   - Immediately remove them from the repository:
     ```bash
     git rm --cached .env
     git commit -m "Remove accidentally committed .env file"
     ```
   - For secrets that were previously committed, purge them from Git history:
     ```bash
     git filter-branch --force --index-filter 'git rm --cached --ignore-unmatch .env' --prune-empty --tag-name-filter cat -- --all
     git push --force
     ```
   - Immediately rotate all affected credentials/secrets

3. **Code reviews**:
   - Always check pull requests for accidental inclusion of secrets
   - Scan for hardcoded credentials, API keys, or tokens
   
4. **Secret scanning**:
   - Consider enabling GitHub's secret scanning feature for the repository
   - Run `git diff --staged` before every commit to review changes

Remember: A secret that has ever been committed to Git should be considered compromised and rotated, even if later removed from the history.