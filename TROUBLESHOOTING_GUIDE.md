# Troubleshooting Guide

This document logs bugs that have been fixed in the codebase to help prevent repeated issues. For each bug, we document what went wrong, how it was fixed, and where the changes were made.

## User Registration and Authentication Issues

### 500 Error on User Registration (Users Table Issue)

**Error Message/Behavior:**  
Server returned 500 error during user registration with message: "relation 'users1' does not exist"

**Cause:**  
The schema was referencing a non-existent table name 'users1' instead of the correct 'users' table. This occurred because of a schema inconsistency between development and production environments.

**Fix:**  
1. Updated database schema to consistently use 'users' as the table name
2. Implemented table existence checks in migrations
3. Added proper error handling for database operations

**Files/Lines Modified:**
- `/shared/schema.ts` - Fixed table reference from 'users1' to 'users'
- `/server/storage.ts` - Updated all SQL queries to use the correct table name
- `/server/migrate.ts` - Added table existence verification before operations

**Date of Fix:** May 22, 2025

### Password Confirmation Validation Missing

**Error Message/Behavior:**  
Users could register with mismatched passwords as the registration form didn't properly validate password confirmation. The form would submit even with mismatched passwords, causing inconsistent registration behavior.

**Cause:**  
1. The registration form was missing client-side validation to ensure password and confirmation password matched before submission
2. The submit button wasn't properly disabled when passwords didn't match
3. The backend API didn't verify that passwords matched when processing registration requests

**Fix:**  
1. Added client-side validation that checks if passwords match before form submission 
2. Implemented a `passwordsMatch` state variable to track validation status
3. Updated form submission handler to verify passwords match before making API call
4. Added visual feedback when passwords don't match
5. Disabled submit button when validation fails
6. Added server-side validation to double-check password matching

**Files/Lines Modified:**
- `/client/src/pages/auth-page.tsx` - Added password matching validation in form submit handler:
  ```tsx
  onSubmit={(e) => {
    e.preventDefault();
    
    // Verify passwords match before submitting
    if (password !== confirmPassword) {
      setPasswordsMatch(false);
      return; // Prevent form submission
    }
    
    const formData = new FormData(e.currentTarget);
    registerMutation.mutate({
      // form data...
    });
  }}
  ```
- `/server/controllers/userController.js` - Added server-side password matching validation

**Date of Fix:** May 22, 2025

### Missing Database Migrations

**Error Message/Behavior:**  
Application failed to start with database errors such as:
- "column 'status' of relation 'users' does not exist"
- "column 'last_activity_date' of relation 'users' does not exist"
- Other missing column errors when accessing database tables

**Cause:**  
1. New schema changes were not properly migrated to the database
2. Migration system didn't check for column existence before attempting operations
3. No proper error handling in migrations to continue with available tables/columns
4. Missing automatic migration on application startup

**Fix:**  
Implemented a robust migration system that:
1. Runs automatically on application startup
2. Checks if required tables exist and creates them if missing
3. Verifies columns exist and adds them if missing
4. Uses `IF NOT EXISTS` in all column/table creation statements to prevent errors
5. Added proper error handling to continue with other migrations if one fails

**Files/Lines Modified:**
- `/server/migrations/add-user-status-fields.ts` - Added column existence checks:
  ```typescript
  // Check if the status column exists
  const statusResult = await db.execute(sql`
    SELECT EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'users' 
      AND column_name = 'status'
    );
  `) as unknown as Array<{exists: boolean}>;
  
  const statusExists = statusResult.length > 0 ? statusResult[0].exists : false;
  
  if (!statusExists) {
    console.log('Adding status field to users table...');
    await db.execute(sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
    `);
    console.log('Status field added successfully.');
  }
  ```
- `/server/migrate.ts` - Improved migration process with better error handling and startup integration
- `/server/index.ts` - Added migration execution on server startup

**Date of Fix:** May 22, 2025

### Signup/Login/Account Deletion Not Functioning

**Error Message/Behavior:**  
- Users unable to register with error: "Internal server error" (500)
- Login attempts failing with error: "Invalid credentials" even with correct information
- Account deletion either failing completely or removing records instead of soft-deleting

**Cause:**  
Multiple issues:
1. Database schema and storage interface implementation mismatch
2. Authentication token generation and verification errors
3. Missing validation checks for user registration
4. Improper handling of account deletion (hard delete vs. soft delete)
5. Password hashing inconsistencies

**Fix:**  
1. Aligned storage interface implementation with schema definitions
2. Fixed token generation and verification in authentication flow
3. Added comprehensive validation for user registration and login
4. Implemented soft deletion for accounts by setting status to 'deleted' rather than removing records
5. Ensured consistent password hashing with bcrypt (salt factor 12)
6. Added proper error handling with specific error messages

**Files/Lines Modified:**
- `/server/storage.ts` - Updated user CRUD operations:
  ```typescript
  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    try {
      const result = await db
        .update(users)
        .set(userData)
        .where(eq(users.id, id))
        .returning();
      
      return result[0];
    } catch (error) {
      console.error('Error updating user:', error);
      return undefined;
    }
  }
  ```

- `/controllers/userController.js` - Fixed authentication logic and added better error handling:
  ```javascript
  // Create new user with hashed password
  const hashedPassword = await bcrypt.hash(password, 12);
  
  try {
    const user = await storage.createUser({
      username,
      email,
      password: hashedPassword,
      firstName: firstName || '',
      lastName: lastName || '',
      // Other user properties...
    });
    
    // Generate JWT token with proper user ID
    const token = generateToken(user.id.toString());
  } catch (error) {
    // Specific error handling
  }
  ```

- `/server/routes.ts` - Updated route handlers with proper validation:
  ```typescript
  app.post('/api/delete-account', authenticate, async (req, res) => {
    try {
      const userId = req.user.id;
      
      // Soft delete user account by updating status
      const updated = await storage.updateUser(userId, {
        status: 'deleted',
        lastActivityDate: new Date()
      });
      
      if (updated) {
        // Clear authentication tokens
        res.clearCookie('jwt');
        return res.status(200).json({ message: 'Account successfully deleted' });
      }
      
      return res.status(400).json({ message: 'Failed to delete account' });
    } catch (error) {
      console.error('Account deletion error:', error);
      return res.status(500).json({ message: 'Server error during account deletion' });
    }
  });
  ```

**Date of Fix:** May 22, 2025

## Backend Issues

### Missing Error Handling for Database Operations

**Error Message/Behavior:**  
- Application would crash with "Cannot read property of undefined" errors
- Generic 500 errors returned to clients without specific error information
- Console showing unhandled promise rejections
- Database operations failing silently without proper error logging

**Cause:**  
1. Insufficient error handling in database operations
2. Missing try/catch blocks around critical operations
3. Generic error responses without specific details for debugging
4. No fallback strategies when database operations fail

**Fix:**  
1. Added comprehensive try/catch blocks around all database operations
2. Implemented specific error messages with proper error codes
3. Added detailed logging for easier debugging
4. Set appropriate HTTP status codes for different error types
5. Added fallback strategies for critical operations

**Files/Lines Modified:**
- `/server/storage.ts` - Added try/catch blocks with specific error messages for all database methods:
  ```typescript
  async getTransactions(userId: number): Promise<Transaction[]> {
    try {
      const result = await db
        .select()
        .from(transactions)
        .where(eq(transactions.userId, userId))
        .orderBy(desc(transactions.date));
      
      return result;
    } catch (error) {
      console.error('Error fetching transactions:', error);
      // Return empty array instead of throwing to prevent app crashes
      return [];
    }
  }
  ```

- `/server/routes.ts` - Improved error handling in route handlers:
  ```typescript
  app.get('/api/transactions', authenticate, async (req, res) => {
    try {
      const userId = req.user.id;
      const userTransactions = await storage.getTransactions(userId);
      return res.status(200).json(userTransactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return res.status(500).json({ 
        message: 'Failed to retrieve transactions', 
        error: error.message 
      });
    }
  });
  ```

**Date of Fix:** May 22, 2025

### Missing PostgreSQL Table Columns

**Error Message/Behavior:**  
- Errors like: "column 'last_budget_review_date' of relation 'users' does not exist" 
- Features not working because expected database columns were missing
- Database queries failing with column reference errors

**Cause:**  
1. Schema updates in code were not reflected in the database tables
2. No automatic migration system to add new columns when schema changes
3. Inconsistent column naming between code and database
4. Missing column existence checks before database operations

**Fix:**  
1. Enhanced migration system to check for and add missing columns
2. Implemented column existence verification before running operations
3. Added automatic migrations on application startup
4. Updated schema to use consistent column naming
5. Implemented "IF NOT EXISTS" pattern for all column additions

**Files/Lines Modified:**
- `/server/migrations/add-user-status-fields.ts` - Added column existence checks:
  ```typescript
  // Check if the last_activity_date column exists
  const lastActivityResult = await db.execute(sql`
    SELECT EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'users' 
      AND column_name = 'last_activity_date'
    );
  `);
  
  if (!lastActivityExists) {
    console.log('Adding last_activity_date field to users table...');
    await db.execute(sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS last_activity_date TIMESTAMP;
    `);
  }
  ```
- `/server/migrate.ts` - Improved migration process with sequential execution and error handling
- `/server/index.ts` - Added migration execution during application startup

**Date of Fix:** May 22, 2025

## Additional Fixes

### PostgreSQL Connection Pool Configuration

**Error Message/Behavior:**  
- Database connection errors under load
- Intermittent "too many clients" errors
- Connection timeout issues

**Cause:**  
1. Improper PostgreSQL connection pool configuration
2. Missing connection error handling
3. No connection retry mechanism

**Fix:**  
1. Optimized PostgreSQL connection pool settings
2. Added proper connection error handling
3. Implemented connection retry mechanism
4. Added connection pool monitoring

**Files/Lines Modified:**
- `/server/db.ts` - Updated PostgreSQL connection pool configuration:
  ```typescript
  const poolConfig: PoolConfig = {
    connectionString: process.env.DATABASE_URL,
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
    maxUses: 7500, // Close a connection after it has been used 7500 times (prevents memory leaks)
  };
  ```

**Date of Fix:** May 22, 2025

### Registration failed – fetch error due to localhost URL in production

**Error Message/Behavior:**  
Users on the production site (tryrivu.com) were unable to register and received "Registration failed: failed to fetch" errors because the API URL was incorrectly set to localhost.

**Cause:**  
1. Frontend was calling localhost in production, which failed outside dev
2. CORS settings in the backend weren't properly configured to accept requests from the production domain
3. Missing environment detection to use different API URLs based on context

**Fix:**  
1. Updated the getApiBaseUrl function with environment-aware configuration
2. Enhanced CORS settings in the backend to accept requests from production domains
3. Added proper production backend URL (https://rivu-app.onrender.com)
4. Implemented environment detection for proper API URL selection

**Files/Lines Modified:**
- `/client/src/lib/queryClient.ts` - Updated getApiBaseUrl function with environment detection:
  ```typescript
  export const getApiBaseUrl = (): string => {
    // If VITE_API_URL is explicitly set, use it as highest priority
    if (import.meta.env.VITE_API_URL) {
      return import.meta.env.VITE_API_URL;
    }

    // Production environment detection
    const isProduction = 
      window.location.hostname === 'tryrivu.com' || 
      window.location.hostname.endsWith('.vercel.app') || 
      window.location.hostname.endsWith('.render.com') || 
      window.location.hostname.endsWith('.replit.app');

    // Determine the appropriate base URL based on environment
    if (isProduction) {
      // In production (tryrivu.com or other production domains)
      return 'https://rivu-app.onrender.com';
    } else {
      // In development environment
      return 'http://localhost:8080';
    }
  };
  ```
- `/server/index.ts` - Updated CORS configuration to include all necessary origins:
  ```typescript
  const corsOptions = {
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.ALLOWED_ORIGINS?.split(',') || ['https://tryrivu.com', 'https://www.tryrivu.com', 'https://rivu-app.onrender.com']
      : ['http://localhost:3000', 'http://localhost:5000', 'http://localhost:5173'],
    credentials: true,
    // ... other CORS settings
  };
  ```

**Date of Fix:** May 22, 2025
**Commit:** 68fd2a9bc

### Registration failed – failed to fetch

**Error Message/Behavior:**  
Users received "Registration failed: failed to fetch" error when attempting to sign up on the Rivu app.

**Cause:**  
1. Frontend API configuration wasn't correctly set up to connect to the backend server
2. CORS settings in the backend were too restrictive and blocked requests from the frontend
3. Development environment was running backend and frontend separately without proper proxying
4. The API base URL in the frontend was not correctly configured for the development environment

**Fix:**  
1. Updated the API base URL configuration in queryClient.ts to properly connect to the backend server
2. Enhanced CORS configuration in the backend to accept requests from frontend origins
3. Enabled the development proxy to better connect the frontend with the backend
4. Added proper environment detection for development vs. production API URLs

**Files/Lines Modified:**
- `/client/src/lib/queryClient.ts` - Updated getApiBaseUrl function to use the correct backend URL in development:
  ```typescript
  export const getApiBaseUrl = (): string => {
    return import.meta.env.VITE_API_URL || 
      (window.location.hostname === 'tryrivu.com' || 
       window.location.hostname.endsWith('.vercel.app') || 
       window.location.hostname.endsWith('.render.com') || 
       window.location.hostname.endsWith('.replit.app')
        ? '' // Use relative URLs for all production deployments
        : 'http://localhost:8080'); // Use backend server URL for local development
  };
  ```
- `/server/index.ts` - Updated CORS configuration to accept requests from frontend origins:
  ```typescript
  const corsOptions = {
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.ALLOWED_ORIGINS?.split(',') || 'https://tryrivu.com' 
      : ['http://localhost:5000', 'https://localhost:5000', 'http://localhost:5173', 
         'https://localhost:5173', 'https://' + process.env.REPL_SLUG + '.' + process.env.REPL_OWNER + '.repl.co'],
    credentials: true,
    // ... other CORS settings
  };
  ```
- `/server/index.ts` - Enabled the development proxy for better frontend/backend connection:
  ```typescript
  // In development mode
  configureStaticFileServing(app);
  // Set up the development proxy to connect to Vite dev server
  configureDevelopmentProxy(app);
  ```

**Date of Fix:** May 22, 2025