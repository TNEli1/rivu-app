# Rivu API Server

This is the backend API server for the Rivu personal finance platform.

## Technology Stack
- Node.js with Express
- PostgreSQL with Drizzle ORM
- TypeScript
- JWT Authentication
- Plaid Integration
- OpenAI Integration

## Environment Setup
Create a `.env` file in the root directory with the following variables:
```
NODE_ENV=development
PORT=8080
DATABASE_URL=postgres://user:password@hostname:port/database
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRY=7d
ALLOWED_ORIGINS=https://yourfrontend.vercel.app
OPENAI_API_KEY=your_openai_api_key_here
PLAID_CLIENT_ID=your_plaid_client_id
PLAID_SECRET=your_plaid_secret
PLAID_ENV=sandbox
POSTMARK_API_TOKEN=your_postmark_token_here
APP_URL=https://api.yourapp.com
```

## Development
```bash
npm install
npm run dev
```

## Database Management
```bash
# Push schema changes to the database
npm run db:push
```

## Deployment to Render
1. Connect your GitHub repository to Render
2. Select the `/server` directory as the root directory
3. Use the following settings:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
4. Set all required environment variables in the Render dashboard

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login a user
- `POST /api/auth/logout` - Logout a user
- `GET /api/auth/me` - Get current user info

### Transactions
- `GET /api/transactions` - Get all user transactions
- `POST /api/transactions` - Create a new transaction
- `PUT /api/transactions/:id` - Update a transaction
- `DELETE /api/transactions/:id` - Delete a transaction
- `POST /api/transactions/import` - Import transactions from CSV

### Budget Categories
- `GET /api/budget-categories` - Get all budget categories
- `POST /api/budget-categories` - Create a budget category
- `PUT /api/budget-categories/:id` - Update a budget category
- `DELETE /api/budget-categories/:id` - Delete a budget category

### Savings Goals
- `GET /api/goals` - Get all savings goals
- `POST /api/goals` - Create a savings goal
- `PUT /api/goals/:id` - Update a savings goal
- `DELETE /api/goals/:id` - Delete a savings goal

### Plaid Integration
- `POST /api/plaid/create-link-token` - Create a Plaid link token
- `POST /api/plaid/exchange-public-token` - Exchange a public token for an access token
- `GET /api/plaid/accounts` - Get connected bank accounts