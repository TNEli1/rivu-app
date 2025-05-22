# Rivu Finance - Troubleshooting Guide

## Initial international privacy compliance (GDPR-lite)

### Features added

- **Explicit consent checkboxes** during signup 
  - Data processing consent (required)
  - Marketing consent (optional)
  - Terms of service and privacy policy acceptance

- **Privacy management in user settings**
  - Data export functionality (JSON and CSV formats)
  - Account deletion with confirmation (right to be forgotten)
  - Privacy contact information display

- **Database privacy tracking**
  - User consent logging with timestamps and IP addresses
  - Privacy policy acceptance tracking
  - Country code detection and storage

- **Backend compliance routes**
  - Data export endpoints (JSON/CSV)
  - Account deletion endpoint
  - Privacy consent logging
  - Country detection capability

### Routes created/modified

- Added 5 new privacy-related API endpoints:
  - `GET /api/privacy/export-data` - Export all user data in JSON format
  - `GET /api/privacy/export-data/csv` - Export transaction data in CSV format
  - `DELETE /api/privacy/delete-account` - Delete user account and all associated data
  - `POST /api/privacy/consent` - Log user's privacy consent choices
  - `POST /api/privacy/detect-country` - Detect and store user's country

### Files impacted

#### Database schema
- `shared/schema.ts` - Added privacy fields to user schema and created user_consents table
- `server/migrations/privacy-compliance-migration.ts` - Migration to add privacy-related database columns

#### Frontend
- `client/src/pages/auth-page.tsx` - Added explicit consent checkboxes during signup
- `client/src/components/settings/PrivacySettingsSection.tsx` - New component for privacy controls
- `client/src/pages/settings-page.tsx` - Integrated new privacy settings component
- `client/src/hooks/use-auth.tsx` - Updated User and RegisterData types to include privacy fields

#### Backend
- `server/controllers-ts/privacyController.ts` - Added controller for privacy-related endpoints
- `server/routes.ts` - Added routes for privacy endpoints

## Implementation notes

- The implementation follows a "GDPR-lite" approach that covers the basic requirements for international privacy compliance
- Export functionality includes both complete data export (JSON) and transactions-only export (CSV)
- Account deletion fully removes all user data through cascading database deletes
- All consent actions are logged with timestamps and IP addresses for compliance purposes
- International users receive a notice that Rivu currently only supports US bank accounts