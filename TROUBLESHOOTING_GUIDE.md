# Troubleshooting Guide: Rivu Application

## Registration failed – Load failed (API unreachable)

**Error Message/Behavior:**  
Users on the production site (tryrivu.com) were unable to register and received "Load failed" errors during registration attempts. This indicated the frontend was unable to communicate successfully with the backend API.

**Cause:**  
1. Network connectivity issues between the frontend (tryrivu.com) and backend (rivu-app.onrender.com)
2. Insufficient error handling and diagnostic information in the network request functions
3. CORS might be blocking requests in some circumstances, especially in production
4. No client-side validation of API availability before attempting registration

**Fix:**  
1. Enhanced debugging and error reporting in API request functions:
   - Added detailed logging of request/response details
   - Improved error message clarity for network failures
   - Implemented connectivity testing before registration attempts

2. Improved error handling in registration flow:
   - Added server health check before registration
   - Enhanced error parsing from failed registration attempts
   - Provided more user-friendly error messages

3. Updated queryClient.ts to ensure proper API URL resolution:
   - Added more detailed logging of hostname detection
   - Verified production URL (https://rivu-app.onrender.com) is used correctly
   - Improved error context in network failure scenarios

4. Ensured proper CORS settings in both the client and server code:
   - Verified CORS allows requests from tryrivu.com domain
   - Added explicit CORS mode to all fetch requests
   - Enhanced error reporting for CORS-related failures

**Files/Lines Modified:**
- `client/src/lib/queryClient.ts`: Enhanced API URL detection with better logging
- `client/src/lib/queryClient.ts`: Improved apiRequest function with detailed error handling
- `client/src/hooks/use-auth.tsx`: Enhanced registration mutation with connectivity testing
- `client/src/lib/queryClient.ts`: Updated query function with better error reporting

**Testing:**
The fix can be verified by:
1. Opening https://tryrivu.com in a browser
2. Opening browser developer tools (F12) and going to the Network tab
3. Attempting to register a new user account
4. Confirming the API requests to rivu-app.onrender.com are properly formed and completed successfully

**Prevention:**
To prevent similar issues in the future:
1. Implement health checks in critical API endpoints
2. Add more comprehensive error logging in frontend API calls
3. Develop automated tests that validate API connectivity in production
4. Enhance monitoring for cross-origin request failures