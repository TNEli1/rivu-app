# Registration failed – fetch error due to localhost URL in production

**Error Message/Behavior:**  
Users on the production site (tryrivu.com) were unable to register and received "Registration failed: failed to fetch" errors because the API URL was incorrectly set to localhost.

**Cause:**  
1. Frontend was calling localhost in production, which failed outside the development environment
2. CORS settings in the backend weren't properly configured to accept requests from the production domain
3. The API base URL in the frontend was not correctly configured for production environments
4. Missing environment detection to use different API endpoints based on context

**Fix:**  
1. Updated the getApiBaseUrl function with environment-aware configuration
2. Added proper production backend URL (https://rivu-app.onrender.com)
3. Enhanced CORS configuration in the backend to accept requests from both production domains and localhost for development
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