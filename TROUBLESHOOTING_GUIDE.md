# Rivu App Troubleshooting Guide

This document contains solutions to common issues encountered in the Rivu application, along with their resolutions.

## Registration Issues

### Load failed – Frontend used relative URL in production

**Error Message/Behavior:**  
Users on the production site (tryrivu.com) were unable to register and received "Registration failed: Load failed" errors because the API URL was incorrectly configured.

**Date:** May 22, 2025

**Cause:**  
1. The `getApiBaseUrl()` function in the deployed build returned an empty string (`''`) for production domains
2. This caused the frontend to use relative URLs for API requests
3. Since the backend is hosted on a different domain (rivu-app.onrender.com), these relative URL requests failed
4. The development and production code had different implementations of this function

**Fix:**  
1. Updated `getApiBaseUrl()` to consistently return the absolute backend URL for production environments
2. Fixed the logic to properly detect production domains (tryrivu.com and subdomains)
3. Enhanced error handling and retry logic in API request functions
4. Added CORS mode explicitly to all API requests
5. Improved error messages and logging for easier debugging

**Files Modified:**
- `deploy/client/src/lib/queryClient.ts` - Updated URL handling and error recovery
- Specifically updated the production URL to consistently point to `https://rivu-app.onrender.com`

**Status:** ✅ Confirmed working on tryrivu.com

## Authentication Issues

## Performance Issues

## Database Issues
