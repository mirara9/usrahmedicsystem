# Current Backend And Migration Audit

Execution note:
- `plan.md` is the master execution sequence until implementation begins.
- This audit records what already exists in the repo so implementation extends the current foundation instead of duplicating it.

## Summary

The repository already contains a meaningful Cloudflare-based application foundation:
- `apps/platform` for the current Next.js UI surfaces
- `functions/api/*` for Pages Functions backend routes
- `functions/_lib/*` for shared backend helpers
- `migrations/0001..0005` for current D1-backed schema foundation
- `packages/domain/src/*` for domain rules, workflow contracts, permissions, and provider/capability metadata

This means the next implementation phases should extend the existing foundation rather than start a greenfield backend rewrite.

## Current route inventory

### Platform / foundation
- `GET /api/health`
- `GET|POST /api/bootstrap`
- `GET|POST /api/branches`
- `GET|POST /api/audit/events`
- `GET|POST /api/admin/registrations`

### Auth and staff foundation
- `GET|POST /api/auth/staff`
- `GET|POST /api/auth/sessions` (admin list/create, plus bearer-authenticated current session lookup and self-revoke)

### Clinical / operational foundation
- `GET|POST /api/patients`
- `GET|POST /api/appointments`
- `GET|POST /api/visits`
- `GET|POST /api/consultations`
- `GET|POST /api/documents`

### Billing and panel foundation
- `GET|POST /api/billing/invoices`
- `GET|POST /api/billing/payments`
- `GET|POST /api/panels`

### Claims foundation
- `GET|POST /api/claims/providers`
- `GET|POST /api/claims/memberships`
- `GET|POST /api/claims/eligibility`
- `GET|POST /api/claims/preauth`
- `GET|POST /api/claims/submissions`
- `GET|POST /api/claims/remittances`

### Inventory / medicine foundation
- `POST /api/stock/receive`
- `POST /api/stock/scan`
- `GET|POST /api/inventory/imports`
- `GET|POST /api/inventory/adjustments`
- `GET|POST /api/inventory/dispense`
- `GET|POST /api/inventory/labels`

### Reporting / support / onboarding foundation
- `GET /api/owner/export`
- `GET|POST /api/reports/snapshots`
- `GET|POST /api/support/tickets`
- `GET|POST /api/onboarding/tasks`

## Shared backend helpers already present

### `functions/_lib/http.js`
Provides:
- JSON response helpers
- common endpoint execution wrapper
- actor extraction
- validation helpers
- role requirement helpers
- DB binding access

### `functions/_lib/access.js`
Provides:
- branch-scoped access enforcement using `staff_branch_assignments`
- active staff session token resolution from bearer/session headers for branch routes
- session branch mismatch protection for branch-scoped workflows
- role alias handling
- owner bypass path
- branch assignment checks

### `functions/_lib/audit.js`
Provides:
- audit event writing
- hashed actor/resource support
- PHI-safe metadata handling foundation

### `functions/_lib/claims.js`
Provides:
- claims-related helpers and adapter foundation

## Current migration inventory

### `0001_usrahmedic_foundation.sql`
Base foundation schema.

### `0002_booking_deposits.sql`
Booking deposit foundation.

### `0003_production_clinic_foundation.sql`
Adds major foundation entities including:
- staff accounts
- staff branch assignments
- MFA/session tables
- patient medical history
- visit records
- consultations
- clinical documents
- medical certificates
- service catalog
- panel providers and memberships
- invoices, invoice items, payments
- inventory structures
- support/onboarding/reporting foundations

### `0004_insurance_claims.sql`
Claims-specific schema foundation.

### `0005_demo_claim_seed.sql`
Demo claim seed data.

## Gaps still expected before Pilot Core

Even with the current foundation, production-readiness gaps still exist:
- real auth/session model still replaces temporary header assumptions
- route coverage needs deeper validation and tests
- canonical managed PostgreSQL + R2 production path is not yet implemented
- branch-safe and compliance-complete workflows still need hardening
- backup/restore/export operations still need concrete implementation
- public site modernization and content migration are still pending

## Implementation implications

1. Do not create duplicate route surfaces unless a deliberate architecture migration is approved.
2. Audit each existing route before adding a new one.
3. Reuse the existing access and audit helpers where practical.
4. Add only incremental schema changes after `0005_*`.
5. Keep the current D1 route foundation useful for preview/foundation work while the canonical production data path is introduced.

## Recommended immediate engineering focus

1. Real auth/session hardening
2. Branch-aware authorization proof
3. Audit baseline completion
4. Gap-based schema additions only
5. Pilot Core route/UI build-out
