# Troubleshooting Guide

This document contains solutions for common issues encountered in the Rivu Finance application.

## Database Migration Issues

### Missing last_login column + inactive user tracking

**Issue**: The inactive user checking process was referencing a `last_login` column that didn't exist in the users table, causing migration errors during application startup.

**Fix Implemented**:
1. Added a migration to create the `last_login` column on the users table
2. Modified the inactive user check to be resilient to missing columns
3. Ensured the login process properly updates both `last_login` and `last_activity_date` fields

**Implementation Details**:
- Added dynamic column checking that safely handles varying database schemas
- Implemented fallback logic using available date fields when specific columns aren't present
- Added proper updating of login timestamps when users successfully authenticate

**Affected Files**:
- `/server/migrations/inactiveUsers.ts` - Added column existence check and fallback query
- `/server/migrations/add-last-login-column.ts` - New migration to add the last_login column
- `/server/migrations/index.ts` - Updated to include the new last_login column migration
- `/server/controllers-ts/userController.ts` - Already properly updates login timestamps

**Date of Fix**: May 22, 2025

## User Registration and Login Flow

### User Registration Process

**Verification Checks**:
- Registration succeeds on tryrivu.com
- Password confirmation field is properly validated with visual feedback
- Proper error handling for existing accounts
- No account duplication when the same email is used multiple times

**Implementation Details**:
- Frontend form validation displays immediate feedback to users
- Backend validation prevents duplicate accounts using the same username or email
- Comprehensive error codes provide granular feedback for different registration issues
- User data is properly sanitized and stored in PostgreSQL

## Inactive User Handling

**Feature Implementation**:
- Users who haven't logged in for 90+ days are automatically flagged as inactive
- The system checks for inactive users during application startup
- User status is tracked through the status field ('active', 'inactive', 'deleted')
- Last login timestamp and activity date are properly tracked

## Recent Fixes and Improvements

### Database Migration Reliability
- Improved migration system with proper sequence and dependency handling
- Added column existence checks to prevent errors on schema variations
- Better error handling that allows the application to start despite minor migration issues

### Security Enhancements
- Improved login tracking with comprehensive activity timestamps
- Account status tracking for improved security and management
- Automated cleanup of inactive accounts

### Performance Updates
- Optimized database queries for user activity tracking
- Improved migration performance with streamlined checks