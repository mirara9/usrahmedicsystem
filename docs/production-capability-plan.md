# Production Capability Plan

This plan is the working feature matrix for moving UsrahMedic from the current Cloudflare-ready foundation into a production clinic management system. It is implementation guidance, not a legal, tax, or medical compliance sign-off.

Execution note:
- `plan.md` is the master implementation sequence.
- This capability matrix must stay aligned to the same Pilot Core / Commercial Launch / Later boundaries.

## Status Legend

- `Foundation only`: architecture, docs, sample data, or deployment shell exists, but the workflow is not production-usable.
- `Partially implemented`: a domain contract, simple UI, table, or API slice exists, but the end-to-end production workflow is incomplete.
- `Not implemented`: no meaningful production workflow exists yet.
- `Provider dependent`: code can be prepared, but go-live needs a selected external provider and credentials.
- `Decision required`: the clinic or owner must make a business, compliance, residency, or vendor decision before implementation can be finished. Current provider choices are now selected, so this status should be avoided unless a future business decision is reopened.

## Locked Provider Decisions

These are the implementation defaults unless the owner explicitly changes them later:

| Area | Selected provider | Notes |
|---|---|---|
| Staff auth and MFA | Microsoft Entra ID + Microsoft Authenticator | Current default for staff auth unless the owner explicitly approves a lower-overhead alternative before implementation begins. |
| Payment gateway | Billplz | Primary gateway for RM10 booking deposits, payment links, webhooks, refunds, and reconciliation. |
| LHDN e-Invoicing | Direct LHDN MyInvois API | Use official API states for TIN validation, signed document submission, cancellation/rejection, lookup, QR/UUID storage, and reconciliation. |
| Panel/TPA | MiCare first adapter; PMCare and HealthMetrics next by contract | Keep the billing model multi-adapter because different employers and panels use different TPAs. |
| SMS | Twilio SMS | Transactional reminders only; Malaysia SMS content must follow Twilio/MCMC restrictions, including no PHI, required free-message header, brand name, and no URLs/personal-data requests. |
| Email | Twilio SendGrid Email API | Transactional email for booking, receipt, onboarding, and support messages with authenticated sender domains. |
| Malaysian-hosted database | Managed PostgreSQL provider (non-AWS) | Canonical PHI and financial write model. If a fully Malaysia-hosted option is not chosen, cross-border and residency implications must be reviewed before go-live. Cloudflare D1 remains a foundation/edge store until migration. |
| Object storage | Cloudflare R2 | Documents, scans, signed PDFs, invoices, exports, and backups. |
| Support/onboarding | Freshdesk | Standard and priority support queues, SLA policies, knowledge base, onboarding tickets, and escalation routing. |
| CI/CD and monitoring | GitHub Actions, Cloudflare Pages, Sentry, backup controls | Enforce checks before production promotion, deploy web surfaces, monitor errors, and prove backup restore. |

## Capability Matrix

| Capability | Current status | Foundation evidence | Production work needed | Dependencies that code alone cannot solve |
|---|---|---|---|---|
| Real login/auth/MFA and staff accounts | Provider dependent | Role and permission model exists in `packages/domain/src/permissions.ts`; provider decision exists in `packages/domain/src/providerDecisions.ts`. | Microsoft Entra ID OIDC, Microsoft Authenticator MFA/passkey policy, staff invitations, activation/suspension, MFA enrollment evidence, recovery, password reset, BFF sessions, CSRF protection, remote logout, auth audit events. | Entra tenant/app registration, Conditional Access policy, SendGrid support/recovery email, staff credential policy. |
| Role based access control | Partially implemented | RBAC and branch-aware access helpers exist. | Enforce permissions at every API/service boundary, persist staff assignments, care-team membership, break-glass reason and review workflow. | Clinic approval for role matrix and break-glass policy. |
| Branch level data isolation | Partially implemented | Branch IDs exist in seeded data and workflow contracts. | Branch-scoped queries, API authorization, audit proof for cross-branch access, owner-level PHI-safe aggregation. | CKAPS branch governance, PDPA least-privilege sign-off. |
| Shared doctor accounts across branches | Partially implemented | Doctor role exists; branch data exists. | Doctor profile, APC/credential evidence, branch assignment, locum schedule, cross-branch roster, branch-safe patient access. | Doctor credential/locum policy and branch manager approval workflow. |
| Patient registration and intake | Partially implemented | Booking/intake contracts and patient booking UI exist. | Patient registry UI/API, duplicate detection, dependent/guardian model, ID vault tokenization, consent history, intake triage handoff. | Identity storage approach and PDPA consent wording. |
| Patient records management | Partially implemented | Patient table and domain registration contract exist. | Canonical patient profile, immutable timeline, attachments, alerts, allergies, corrections ledger, merge governance, access/export workflow. | Cloudflare R2 object storage policy, legal review of medical record retention. |
| Medical history and visit records | Not implemented | Encounter permissions exist only as foundation. | Visit timeline, diagnosis, procedures, prescriptions, orders/results, referrals, follow-ups, corrections, print/export audit. | MMC medical record policy and clinic SOP. |
| Consultations management | Not implemented | Workflow states include consult states; no production consultation module exists. | Doctor workbench, SOAP notes, orders, prescription, disposition, follow-up, referral, billing handoff, audit events. | Clinical template approval and doctor sign-off. |
| Rich text document editor | Not implemented | No editor exists. | Secure clinical editor with templates, autosave, versioning, corrections, print/export, PDF generation, locked final documents. | PDF/document rendering choice and storage provider. |
| Medical certificate generation | Not implemented | No MC workflow exists. | MC templates, doctor signing, serial number, QR/verification, reprint controls, amendment/cancellation workflow. | Legal/clinic wording approval. |
| Appointment scheduling | Partially implemented | Patient booking and appointment API foundation exist. | Doctor roster, slot capacity, locking, reschedule/cancel/no-show, waitlist, reminders, deposit linkage. | Billplz deposit flow, Twilio SMS, SendGrid email. |
| Queue management | Partially implemented | Queue states and seeded tickets exist. | Walk-in registration, triage priority, room call, transfer, hold, skip, discharge, SLA timers, screen display. | Branch operational SOP. |
| Consultation and service billing | Not implemented | Billing permissions exist. | Draft bill from services/procedures/medicine, discount/approval rules, cash/card/QR/e-wallet settlement, refund/void/reversal, receipt. | Billplz settlement flow and finance policy. |
| Editable bills and invoices | Not implemented | No billing ledger exists. | Draft/final states, edit reasons, approval thresholds, invoice numbering, tax handling, audit, printable receipt/invoice. | Finance approval and tax/legal sign-off. |
| Insurance and panel pricing | Partially implemented | Payer provider, membership, eligibility, GL/preauth, claim submission, rejection, remittance, and reconciliation foundation exists for insurer, takaful, TPA, and corporate panel workflows; MiCare-first multi-adapter decision is selected. | Contracted provider adapters, real payer credentials, panel-specific fee schedules, AR aging, portal/API reconciliation, rejection/rework operations, provider-specific claim forms, MiCare adapter first, PMCare/HealthMetrics adapters by contract. | Panel/TPA/insurer/takaful contracts, API access or manual portal process, data-sharing terms. |
| LHDN e-Invoicing compliance | Provider dependent | MyInvois tracking table exists; direct API provider decision is selected. | MyInvois states, validation, signed submission, UUID/QR storage, cancellation/rejection handling, retry queue, reconciliation reports. | LHDN MyInvois credentials, taxpayer profile, certificate/signing setup, tax advisor sign-off. |
| RM10 booking deposit and payments | Provider dependent | Patient booking UI references a deposit intent; payment table exists; Billplz provider decision is selected. | Billplz payment session, webhook signature verification, deposit ledger, refund/cancel rules, invoice settlement mapping, reconciliation. | Billplz merchant account, settlement bank process, finance policy. |
| Medication and inventory management | Partially implemented | Medicine safety logic, stock receive/scan contracts, and medicine UI foundation exist. | Medicine master CRUD, opening balance, receive, transfer, stocktake, adjustment, quarantine, expiry, recall, disposal, valuation, audit. | Supplier data, stock opening balance, pharmacy legal review. |
| Bulk inventory upload | Not implemented | No upload workflow exists. | CSV/XLSX parser, preview, validation, duplicate matching, approval, rollback, import audit, error report. | Source file format and stock-master ownership decision. |
| Manual stock adjustments | Partially implemented | Stock permissions and movement concepts exist. | Adjustment reasons, approval thresholds, branch stock ledger, reversal, evidence attachment, controlled-item safeguards. | Pharmacy SOP and controlled medicine policy. |
| Dispensing and medicine label printing | Partially implemented | Dispense states and label foundation concepts exist. | Prescription-linked screening, clarify/prepare/label/check/counter-check/issue/counsel/reverse; printable label templates and print audit. | Label printer/browser print strategy and legal label content review. |
| Basic clinic reports | Partially implemented | Owner KPI sample and PHI-safe export contract exist. | Daily registration, appointment, queue, consultation, cash drawer, staff productivity, medicine expiry, stock movement reports. | Report definitions from owner/branch managers, SendGrid for scheduled delivery. |
| Revenue and billing reports | Partially implemented | PHI-safe export pattern exists, but no real billing ledger exists. | Revenue, collections, refunds, AR aging, panel claims, doctor performance, branch comparison, exports, scheduled delivery. | Accounting/export target, finance definitions, SendGrid scheduled delivery. |
| Cloud-based clinic system | Foundation only | Cloudflare Pages, Functions, D1, and deployment docs exist. | Production environments, secrets, CI/CD, PostgreSQL migrations, monitoring, uptime checks, backup, DR, rollback, incident response. | GitHub Actions, Cloudflare Pages, Sentry, backup controls, production ownership. |
| Automatic system updates | Foundation only | Deployment scripts exist, but no protected release process exists. | Protected branch, preview deploys, tests before release, migration checks, feature flags, release notes, rollback and maintenance notices. | GitHub Actions access and release approval policy. |
| Ongoing platform improvements | Foundation only | Rollout docs exist. | Changelog, feature request intake, roadmap triage, staged rollout, post-release QA, product analytics without PHI leakage. | Product ownership process. |
| Canonical production database | Provider dependent | Current database target is Cloudflare D1; a lower-cost managed PostgreSQL decision is now selected. | Provision managed PostgreSQL, define backup/restore/encryption/DR, migrate PHI write model, keep D1 only for non-PHI edge foundation data. | Provider account access, PDPA cross-border transfer assessment if the chosen provider is outside Malaysia, clinic risk acceptance. |
| Standard support | Partially implemented | Support ticket API and foundation workflow exist; Freshdesk provider decision is selected. | Freshdesk intake, ticket categories, SLA, clinic contacts, knowledge base, remote support access policy. | Freshdesk account, support staffing, vendor processor terms. |
| Priority support | Partially implemented | Support ticket API and escalation fields exist; Freshdesk provider decision is selected. | Severity definitions, escalation, after-hours coverage, incident comms, status page, RCA workflow. | Support staffing and status page provider. |
| Assisted onboarding | Partially implemented | Onboarding task API exists and rollout plan has discovery/go-live criteria. | Freshdesk/onboarding queue, branch setup checklist, data import, staff setup, panel setup, stock opening balance, printer setup, training, sign-off. | Clinic data owners and branch availability. |

## Delivery Sequence

### Phase 1 - Production Foundation

1. Provision the chosen managed PostgreSQL provider and R2 storage policy, then define the target write model.
2. Implement Microsoft Entra ID or the approved lower-overhead staff auth path, plus RBAC enforcement, branch assignments, audit hardening, CI/CD, monitoring, backup, and release process.
3. Configure Billplz, LHDN MyInvois sandbox, Twilio SMS, SendGrid email, Freshdesk, and Sentry credentials in non-production first.

Exit criteria:

- No API trusts temporary role headers.
- Every staff action has a session, actor, branch scope, and audit trail.
- Database, backup, and deployment decisions are documented and tested.

### Phase 2 - Pilot Core Operations

1. Build patient registry, intake, appointment scheduling, queue, triage, consultation basics, visit timeline, medical record correction workflow, billing/payments, dispensing basics, and core document output needed for the first branch pilot.
2. Add guardian/dependent workflow here if the chosen pilot branch routinely handles minors/dependents.
3. Build doctor roster and shared doctor accounts across branches as required for the pilot.
4. Pilot one branch with paper/spreadsheet fallback.

Exit criteria:

- One branch can complete registration to consultation to dispensing/payment discharge using the system.
- Patient records cannot be hard-deleted.
- Cross-branch access is blocked unless assignment or break-glass rules allow it.

### Phase 3 - Commercial Launch Expansion

1. Expand billing depth, editable invoices, deposits, refunds, panels, claims, MyInvois, and reconciliation beyond Pilot Core.
2. Expand medicine master, stock upload, opening balance, adjustments, stocktake, dispensing controls, legal registers, and label printing beyond the pilot basics.

Exit criteria:

- Cash/card/QR/e-wallet settlement reconciles with invoices and deposits.
- Stock ledger reconciles from opening balance through dispensing and adjustments.
- Controlled medicine workflows have legal review before go-live.

### Phase 4 - Support, Onboarding, And Patient Experience

1. Implement standard/priority support workflows, onboarding checklists, knowledge base, clinic setup tools, and support access policy.
2. Expand patient PWA after clinical and billing data are real: booking, queue status, dependents, receipts, results, reminders.

Exit criteria:

- New branch onboarding can be run from checklist to sign-off.
- Support staff can help without uncontrolled PHI access.

### Phase 5 - Reporting And Continuous Improvement

1. Build operational, revenue, billing, panel, inventory, doctor, branch, and owner reports from real ledgers.
2. Add scheduled reports, PHI-safe exports, changelog, feedback intake, feature flags, and staged rollout controls.

Exit criteria:

- Owner dashboards reconcile with operational and finance ledgers.
- Export and scheduled report access is auditable and PHI-minimized.

## Provider-Dependent Work

These providers are selected, but go-live still needs credentials, contracts, sandbox validation, and policy approval:

- Microsoft Entra ID app registration, Microsoft Authenticator policy, Conditional Access, recovery policy, and branded sign-in.
- Managed PostgreSQL provider provisioning, backup/restore evidence, encryption keys or managed secret policy, and migration rehearsal.
- Billplz merchant account, collection ID, webhook signature keys, settlement bank process, refund/cancel policy, and reconciliation.
- LHDN MyInvois sandbox and production credentials, signing/certificate setup, taxpayer profile, document mapping, and tax advisor sign-off.
- MiCare TPA adapter first, then PMCare, HealthMetrics, AIA, CompuMed, and other payer adapters where signed contracts/API access or portal workflows exist.
- Twilio SMS and SendGrid email credentials, sender/domain authentication, consent, suppression, and Malaysia SMS compliance template review.
- Document/PDF rendering decision, secure storage policy, label printer and receipt printer hardware/browser print strategy.
- Freshdesk support desk, SLA policies, knowledge base, support staffing, status page, Sentry, backup alerting, and accounting export target.

## Compliance And Policy Gates

- PDPA: privacy notice, consent, access/correction/export, breach workflow, vendor register, cross-border basis.
- MMC: confidential records, no hard delete, corrections ledger, medical report release workflow.
- CKAPS: branch registration, OYB/person-in-charge, incident/complaint/assessable event evidence.
- Pharmacy/medicine: poison group handling, psychotropic/dangerous drug register decision, label content, storage/disposal/recall SOP.
- LHDN: e-invoice states, cancellation/rejection handling, taxpayer profile, audit and reconciliation.
- Support: support staff PHI access policy and vendor processor register.

## Provider Research References

- Microsoft Authenticator supports Microsoft Entra MFA, notifications, verification codes, passwordless, and passkey sign-in: https://learn.microsoft.com/en-us/entra/identity/authentication/concept-authentication-authenticator-app
- Billplz documents REST API, webhooks, FPX pricing, and payment gateway operations for Malaysian businesses: https://main.billplz.com/
- LHDN MyInvois SDK documents taxpayer TIN validation, document submission, cancellation/rejection, lookup, and search APIs: https://sdk.myinvois.hasil.gov.my/einvoicingapi/
- Managed PostgreSQL providers with regional or near-region hosting should be compared on latency, backup/restore, operational simplicity, and cross-border implications relative to clinic risk tolerance.
- Cloudflare R2 object storage documentation should be reviewed against document retention, export, and backup requirements: https://developers.cloudflare.com/r2/
- Twilio publishes Malaysia SMS delivery and content restrictions: https://www.twilio.com/en-us/guidelines/my/sms
- Twilio SendGrid Mail Send API supports transactional email over REST: https://www.twilio.com/docs/sendgrid/api-reference/mail-send/mail-send
- MiCare describes its Malaysia TPA/e-claims connectivity role: https://eclaims.micaresvc.com/
- Freshdesk documents SLA policies for first response, every response, and resolution times: https://support.freshdesk.com/support/solutions/articles/37626-understanding-sla-policies

## Source Of Truth

The current code-backed capability map is in `packages/domain/src/productCapabilities.ts`. Provider choices in code may still lag the revised planning documents while the architecture is being reworked away from AWS assumptions.

Until those code-backed provider files are updated, the planning source of truth for implementation is:
- `plan.md` for execution sequence
- `docs/architecture.md` for target architecture
- `docs/production-capability-plan.md` for capability scope and provider intent
