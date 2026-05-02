# Rollout Plan

Implementation sequencing note:
- `plan.md` is the master execution sequence.
- This rollout file summarizes the branch rollout path and must stay aligned to Pilot Core / Commercial Launch / Later.

## Phase 0: Discovery and branch selection

- Observe the chosen pilot branch for one full operating day.
- Map reception, triage, doctor, procedure, dispensary, cashier, branch manager, and owner workflows.
- Collect current patient, panel, stock, service, price, doctor, and branch data sources.
- Confirm whether the pilot branch routinely handles minors/dependents; if yes, guardian workflow becomes Pilot Core.
- Confirm MyInvois, accounting, payment, panel/TPA, messaging, and lab/radiology integration requirements.

## Phase 1: Architecture and verification readiness

- Align architecture docs on Cloudflare frontend/perimeter + managed PostgreSQL canonical production data platform + Cloudflare R2 document storage.
- Use `https://usrahmedic-cms.pages.dev` as the demo/public preview domain until production cutover to `usrahmedic.com` is approved.
- Fix verification reliability so lint/test/typecheck/build are trustworthy.
- Audit current backend routes and migrations before adding new schema or services.
- Define backup/export/restore baseline and pilot support process.

## Phase 2: Security, compliance, and branch-safe foundation

- Implement staff auth/session path, branch-aware authorization, audit baseline, correction/no-hard-delete rules, and compliance feature gates.
- Define break-glass emergency access policy.
- Translate compliance controls into buildable workflows and runbooks.

## Phase 3: Pilot Core operations

- Patient registry, duplicate detection, appointment scheduling, queue, visit opening, consultation basics, dispensing basics, billing/payments, and core documents.
- Pilot one branch with controlled paper/spreadsheet fallback.

## Phase 4: Commercial Launch Core

- Guardian/dependent model if not already required in pilot.
- Multi-branch doctor roster and locum workflow.
- Panel/company/TPA workflows, MyInvois reconciliation, fuller inventory legal controls, and branch/finance reporting.
- Expand only after one-branch pilot gates are passed.

## Phase 5: Broader rollout

- Add further branches in waves.
- Use onboarding checklist, support path, restore proof, and branch sign-off for each wave.
- Add richer patient PWA and later-stage integrations only after operational stability is proven.

## Go-Live Criteria for the first branch

- One branch can run a full day from registration to close without spreadsheets for Pilot Core flows.
- Cash drawer, receipts, payments, and billing reconcile.
- Dispensing and stock movements reconcile for Pilot Core scope.
- Audit logs prove patient record access, edits, exports, prints, and stock changes.
- Staff can complete core workflows on slow network.
- Backup/export path is verified.
- Restore drill has been executed successfully.
- Branch sign-off, support path, and rollback plan are ready.
