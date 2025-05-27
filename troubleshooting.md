# Rivu Production Troubleshooting Log

This file tracks all known bugs, symptoms, root causes, and fixes for the Rivu platform.

## Issue: Clear All Transactions - 500 Error
- **Symptom:** Pressing "Clear All" button returns 500 internal server error
- **Root Cause:** Trying to delete transactions after user/session is revoked
- **Fix:** ✅ Fixed transaction deletion order with proper DB transactions and validation
- **Status:** ✅ Fixed - 2025-05-27

## Issue: Plaid Connection Initialization Error
- **Symptom:** Plaid Connect button fails with initialization error
- **Root Cause:** Plaid OAuth redirect URI not whitelisted for tryrivu.com
- **Fix:** Need to update Plaid dashboard redirect URIs
- **Status:** 🔄 Pending - 2025-05-27

## Issue: CSV Upload - No Data Saved
- **Symptom:** Upload UI shows success but no transactions appear in DB
- **Root Cause:** Backend not properly saving parsed CSV rows
- **Fix:** ✅ Enhanced CSV batch upload with explicit user ID mapping and error logging
- **Status:** ✅ Fixed - 2025-05-27

## Issue: Account Deletion - Data Remains
- **Symptom:** Account deletion triggers logout but user data persists
- **Root Cause:** Wrong deletion order - user deleted before related data
- **Fix:** ✅ Fixed deletion sequence with proper transaction handling and verification
- **Status:** ✅ Fixed - 2025-05-27

## Issue: Tutorial Not Showing for New Users
- **Symptom:** New accounts skip onboarding/tutorial
- **Root Cause:** Missing tutorialCompleted field in database schema
- **Fix:** ✅ Added tutorialCompleted field to users table with default false
- **Status:** ✅ Fixed - 2025-05-27

## Issue: Email Verification Not Sent
- **Symptom:** Users never receive verification emails
- **Root Cause:** Using Postmark templates instead of direct email service
- **Fix:** ✅ Updated to use emailService with proper HTML templates and error logging
- **Status:** ✅ Fixed - 2025-05-27

---

*Last Updated: 2025-05-27*