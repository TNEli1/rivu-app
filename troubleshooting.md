# Rivu Production Troubleshooting Log

This file tracks all known bugs, symptoms, root causes, and fixes for the Rivu platform.

## Issue: Clear All Transactions - 500 Error
- **Symptom:** Pressing "Clear All" button returns 500 internal server error
- **Root Cause:** Likely trying to delete transactions after user/session is revoked
- **Fix:** Updated transaction deletion order and error handling
- **Status:** 🔄 In Progress - 2025-05-27

## Issue: Plaid Connection Initialization Error
- **Symptom:** Plaid Connect button fails with initialization error
- **Root Cause:** Plaid OAuth redirect URI not whitelisted for tryrivu.com
- **Fix:** Need to update Plaid dashboard redirect URIs
- **Status:** 🔄 Pending - 2025-05-27

## Issue: CSV Upload - No Data Saved
- **Symptom:** Upload UI shows success but no transactions appear in DB
- **Root Cause:** Backend not properly saving parsed CSV rows
- **Fix:** Enhanced CSV batch upload endpoint with proper error handling
- **Status:** 🔄 In Progress - 2025-05-27

## Issue: Account Deletion - Data Remains
- **Symptom:** Account deletion triggers logout but user data persists
- **Root Cause:** Wrong deletion order - user deleted before related data
- **Fix:** Fixed deletion sequence and added proper transaction handling
- **Status:** 🔄 In Progress - 2025-05-27

## Issue: Tutorial Not Showing for New Users
- **Symptom:** New accounts skip onboarding/tutorial
- **Root Cause:** hasSeenTutorial flag defaulting to true or not checked
- **Fix:** Update DB schema and frontend tutorial trigger logic
- **Status:** 🔄 Pending - 2025-05-27

## Issue: Email Verification Not Sent
- **Symptom:** Users never receive verification emails
- **Root Cause:** Postmark API not triggered or incorrect sender
- **Fix:** Verify Postmark configuration and sender domain
- **Status:** 🔄 Pending - 2025-05-27

---

*Last Updated: 2025-05-27*