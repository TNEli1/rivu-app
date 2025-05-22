# Rivu App Troubleshooting Guide

## Content Security Policy (CSP) Configuration Updates (Updated May 22, 2025)

**Error Message/Behavior:**  
Users on the production site were unable to register due to conflicting Content Security Policy (CSP) configurations that prevented connections to external services like PostHog and Plaid.

The specific error was:
```
Refused to connect to https://rivu-app.onrender.com/api/register because it violates the document's Content Security Policy: "connect-src 'self'"
```

**Cause:**  
1. Conflicting CSP configurations between client-side meta tag and server-side HTTP header
2. Insufficient allowances for external services like PostHog, Plaid, and the backend API
3. Redundant CSP rules causing browsers to apply the most restrictive policies

**Fix:**  
1. Removed redundant CSP meta tag from client/index.html to eliminate conflicts with server-side CSP
2. Updated server-side CSP header in server/index.ts with comprehensive allowances:
   ```
   default-src 'self'; 
   script-src 'self' 'unsafe-inline' https://cdn.plaid.com https://posthog.com https://replit.com https://replit.app https://render.com; 
   style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; 
   font-src 'self' https://fonts.gstatic.com; 
   img-src 'self' data: https:; 
   connect-src 'self' https://rivu-app.onrender.com https://api.tryrivu.com https://cdn.plaid.com https://production.plaid.com https://posthog.com; 
   frame-src 'self' https://cdn.plaid.com; 
   object-src 'none';
   ```
3. Implemented a cleaner, more maintainable CSP configuration structure

**Files/Lines Modified:**
- `client/index.html` - Removed redundant CSP meta tag to avoid conflicts
- `server/index.ts` - Updated server-side CSP header with comprehensive configuration

**Verification Process:**
1. Clear browser cache or hard reload (Cmd+Shift+R or Ctrl+Shift+R) to force fresh CSP
2. Confirm registration works without "Load failed" errors
3. Check browser DevTools console for absence of CSP violations
4. Verify successful requests to PostHog analytics and backend APIs

**Date Applied:** May 22, 2025

## PostHog API Key Missing in Production (Fixed May 22, 2025)

**Error Message/Behavior:**  
Browser logs showed:
```
PostHog API key is missing. Analytics will not be tracked.
```

**Cause:**  
1. The PostHog API key environment variable wasn't being properly accessed in the production environment
2. Lack of fallback mechanism and proper debugging information when the key is missing

**Fix:**  
1. Updated PostHog initialization in the analytics module to provide better fallback:
   ```javascript
   const posthogKey = apiKey || import.meta.env.VITE_POSTHOG_API_KEY;
   ```
2. Added enhanced logging to diagnose issues with environment variables:
   ```javascript
   console.log('Available environment variables:', Object.keys(import.meta.env).filter(...));
   ```
3. Used the same initialization mechanism across all code paths, ensuring consistent API key handling
4. Added logging that indicates when PostHog is successfully initialized

**Files/Lines Modified:**
- `client/src/main.tsx` - Added enhanced environment variable debugging and logging
- `client/src/lib/analytics.ts` - Improved API key handling with fallback mechanism

**Note:** Ensure VITE_POSTHOG_API_KEY environment variable is set in both Replit and Render deployment environments.

**Date Applied:** May 22, 2025

## Email opt-in implementation

**Feature Added:**  
Added email opt-in checkbox to registration form to collect user consent for marketing emails.

**Changes Made:**
1. Added emailOptIn checkbox to the registration form
2. Updated backend to store this preference in the database
3. Used existing marketingConsentGiven field to store the opt-in status
4. Ensured proper handling and validation of this field

**Files/Lines Modified:**
- `client/src/pages/auth-page.tsx` - Added emailOptIn checkbox and state
- `client/src/hooks/use-auth.tsx` - Updated RegisterData type to include emailOptIn
- `server/controllers-ts/userController.ts` - Updated to process and store the opt-in preference

**Date Applied:** May 22, 2025

## SEO optimization and mobile compatibility

**Changes Made:**
1. Added meta tags for:
   - Title and description
   - Open Graph (og:title, og:description, og:image)
   - Twitter Card support
   - Proper viewport configuration
   - Robots directive (index, follow)
2. Ensured responsive design using proper viewport meta tag

**Files/Lines Modified:**
- `client/index.html` - Added SEO and mobile optimization meta tags

**Date Applied:** May 22, 2025

## Recommendations for future improvement

1. **Proxy API requests:** Consider implementing a proxy setup where frontend API calls to /api/* are automatically forwarded to the backend. This would eliminate cross-origin issues.

2. **Environment-aware configuration:** Enhance API URL detection to dynamically use the correct endpoint based on the deployment environment.

3. **Comprehensive error handling:** Add more detailed error logging and user-friendly error messages, especially for network-related failures.

4. **Improved monitoring:** Set up alerts for cross-origin failures and registration issues to catch problems early.