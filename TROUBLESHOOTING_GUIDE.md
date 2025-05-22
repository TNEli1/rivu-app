# Rivu Troubleshooting Guide

## Email verification routing and branding

### Tasks Completed

- **Enhanced login security**: Updated login controller to enforce email verification before allowing access
- **Email verification endpoints**: Added routes for email verification and resend functionality
- **Email branding**: Verified that email templates use correct Rivu branding
  - Teal color (#00C2A8)
  - Sent from support@tryrivu.com
  - Clearly identifies as "Rivu"
  - Does not reference "Rivu Finance"
- **Security**: Verification links expire after 24 hours
- **Routing**: Users are redirected to login page after successful verification
- **User experience**: Unverified users receive a clear message to check their email

### Files Modified

- `server/controllers-ts/userController.ts` - Modified login flow to enforce email verification
- `server/routes.ts` - Added email verification endpoints
- `server/services/emailService.ts` - Verified Postmark integration and email templates

### Confirmation

Email verification, login gating, and branding are now live in production on tryrivu.com. The system:

1. Prevents login for unverified users
2. Provides clear messaging when verification is needed
3. Uses proper Rivu branding in all communications
4. Securely handles verification tokens with proper expiration
5. Properly integrates with Postmark for reliable email delivery

### Troubleshooting Email Issues

If users report not receiving verification emails:

1. Check that POSTMARK_API_KEY is properly set in the environment
2. Verify the user's email address for typos
3. Check spam/junk folders
4. Use the resend verification endpoint:
   ```
   POST /api/send-verification
   { "email": "user@example.com" }
   ```