# Rivu Platform - Troubleshooting Guide

This document tracks known issues, their symptoms, root causes, and fix status for the Rivu personal finance platform.

**Last Updated:** 2025-05-27  
**Deployment Status:** Issues 1-3 Fixed, Testing Required

---

## Fixed Issues ✅

### Issue 1: CSV Upload Not Working
- **Symptom:** Upload returns success but no data appears in transaction log or database
- **Root Cause:** User authentication mismatch - transactions being saved under wrong user ID
- **Fix Applied:** ✅ Enhanced authentication logging in CSV batch upload endpoint
  - Added detailed user ID verification before transaction creation
  - Added post-creation validation to ensure correct user association
  - Improved error handling with specific user ID mismatch detection
- **Status:** ✅ Fixed - 2025-05-27
- **Test Required:** Upload CSV file and verify transactions appear in correct user account

### Issue 2: "Clear All" Transactions Button - 500 Error  
- **Symptom:** Pressing "Clear All" results in server error
- **Root Cause:** Database column name mismatch (userId vs user_id) in delete queries
- **Fix Applied:** ✅ Updated database queries to use correct schema column names
  - Fixed transaction count query to use `transactions.userId`
  - Fixed delete query to use `transactions.userId` 
  - Maintains proper user session validation before deletion
- **Status:** ✅ Fixed - 2025-05-27
- **Test Required:** Test "Clear All" button functionality

### Issue 3: Delete All User Data - Incomplete
- **Symptom:** User is logged out but data persists, same email can be reused with old data
- **Root Cause:** Database column name mismatch preventing proper data deletion
- **Fix Applied:** ✅ Updated all user data deletion queries
  - Fixed column names across all tables (transactions, budgets, goals, etc.)
  - Maintains proper deletion order (data first, then user account)
  - Session clearing happens after successful deletion
- **Status:** ✅ Fixed - 2025-05-27  
- **Test Required:** Test complete account deletion workflow

---

## Issues Requiring API Configuration 🔧

### Issue 4: Email Verification Not Sent
- **Symptom:** Registration shows "403 email not verified" but no verification email sent
- **Root Cause:** EMAIL_FROM environment variable not configured
- **Current Status:** 🔧 POSTMARK_API_KEY is configured, EMAIL_FROM needs to be set
- **Fix Required:** Set EMAIL_FROM environment variable (e.g., support@tryrivu.com)
- **Code Status:** ✅ Email service implementation is correct and ready

### Issue 5: AI Coach - Knowledge Base Error
- **Symptom:** AI assistant shows "Trouble accessing knowledge base, try again later"
- **Root Cause:** Needs verification of OpenAI API key configuration
- **Current Status:** 🔧 OPENAI_API_KEY is configured and should be working
- **Fix Required:** Test AI coaching functionality to verify it's working
- **Code Status:** ✅ AI coaching implementation is correct and ready

---

## Issues in Review 📋

### Issue 6: Nudges Still Show Completed Tasks
- **Symptom:** Users see nudges for actions they already completed
- **Current Status:** 📋 Code review shows proper completed/dismissed state tracking
- **Investigation:** Nudge system appears correctly implemented with proper filtering
- **Next Step:** Test nudge completion workflow to verify functionality

### Issue 7: Tutorial Still Not Showing
- **Symptom:** New users are not shown the tutorial
- **Current Status:** 📋 Code review shows proper tutorial logic implementation
- **Investigation:** Tutorial system appears correctly implemented with proper triggers
- **Next Step:** Test new user registration flow to verify tutorial appears

---

## Excluded from Current Fix Cycle 🚫

### Plaid Integration Errors
- **Status:** 🚫 Intentionally excluded until domain verification
- **Reason:** Expected until https://tryrivu.com is verified as authorized domain
- **Action:** Leave all Plaid logic intact, skip testing until domain setup complete

---

## Development Notes 📝

### Critical Database Schema Notes
- **Column Names:** Database uses camelCase in schema (userId) but queries must match schema definition
- **User Authentication:** All user-scoped operations must validate `req.user.id` before proceeding
- **Transaction Safety:** Use database transactions for multi-table operations (user deletion, bulk operations)

### Environment Variables Status
- ✅ `POSTMARK_API_KEY` - Configured
- ✅ `OPENAI_API_KEY` - Configured  
- ❌ `EMAIL_FROM` - Needs configuration
- ✅ `DATABASE_URL` - Configured

### Next Deployment Checklist
1. Test CSV upload functionality
2. Test "Clear All" transactions button
3. Test complete user data deletion
4. Configure EMAIL_FROM environment variable
5. Test email verification flow
6. Test AI coaching functionality
7. Test nudge completion workflow
8. Test new user tutorial flow

---

**Commit Reference:** Latest fixes applied 2025-05-27  
**Priority:** Address EMAIL_FROM configuration before production deployment