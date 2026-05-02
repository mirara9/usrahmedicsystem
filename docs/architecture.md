# Architecture

Execution note:
- `plan.md` is the master execution sequence until implementation begins.
- This document defines the target architecture and must stay aligned to that sequence.

## Decision

Use separate app surfaces with one shared business domain, while splitting delivery and canonical persistence responsibilities appropriately for **Usrah Medic’s current size: 3 branches and growing**.

- Public demo: `https://usrahmedic-cms.pages.dev`
- Future production cutover: `usrahmedic.com`
- Future operations: `admin.usrahmedic.com`
- Future medicine: `medicine.usrahmedic.com`
- Future owner dashboards: `insight.usrahmedic.com`
- Patient and staff mobile surfaces start as PWA-style web screens, with native apps later.

## Current Implementation

- `apps/platform`: Next.js app with host-aware routing and all initial surfaces.
- `packages/domain`: shared TypeScript domain model, seeded data, workflow rules, permissions, compliance controls, and medicine safety logic.
- `functions/`: Cloudflare Pages Functions backend foundation.
- `migrations/0001..0005`: current D1-backed schema foundation and claims foundation.

## Production Architecture Truth

For the target deployment class now in scope — **Usrah Medic, currently 3 branches in Malaysia and growing** — production responsibilities are:

### Cloudflare responsibilities
- frontend hosting via Cloudflare Pages
- edge security, WAF, rate limiting, and bot control
- preview deployments and static asset delivery
- public booking ingress and lightweight webhook/orchestration concerns
- edge routing and environment-safe request handling

### Canonical data platform responsibilities
- canonical patient, visit, consultation, billing, inventory, panel, and audit data
- canonical clinical document metadata and signed PDF/storage linkage
- reporting snapshots, backup, restore, and recovery evidence
- production-grade transactional consistency as the clinic grows beyond its current 3 branches

## Cloudflare Foundation Role

The current Cloudflare Pages Functions + D1 foundation remains valuable for:
- local and preview development
- prototype and controlled non-production workflows
- low-risk edge-side support workflows
- transition support while the canonical production backend is introduced

It should **not** be treated as the final canonical source of truth for live production clinical and billing workflows.

## Backend API Foundation

The current Cloudflare Pages Functions backend already exposes foundational endpoints for the production domains:

- `/api/auth/staff`
- `/api/auth/sessions`
- `/api/patients`
- `/api/visits`
- `/api/consultations`
- `/api/documents`
- `/api/billing/invoices`
- `/api/billing/payments`
- `/api/panels`
- `/api/claims/*`
- `/api/inventory/*`
- `/api/reports/snapshots`
- `/api/support/tickets`
- `/api/onboarding/tasks`

## Implementation Rule

Do not start by creating a duplicate greenfield backend if the current `functions/` foundation can be extended safely.

- Extend the current foundation where practical.
- Introduce a dedicated canonical application API/BFF only when the production rollout requires the separation.
- Keep route contracts and domain logic portable so the frontend does not need a rewrite.

## Canonical Production Target

- Keep a modular monolith backend first.
- Use a **managed PostgreSQL provider outside AWS** as the canonical write model for PHI, financial records, inventory movements, and audit data.
- Use **Cloudflare R2** for reports, scans, consent forms, referral documents, invoices, exports, and backup bundles.
- Use queued integration events only for audit-critical and integration-critical workflows in v1.
- Keep Cloudflare in front permanently for delivery, edge security, and previews.

## Locked Provider Decisions

- Staff auth/MFA: Microsoft Entra ID OIDC with Microsoft Authenticator MFA/passkey and Conditional Access, unless the clinic later chooses a lower-overhead staff auth path.
- Staff web session model: BFF session with CSRF protection.
- Mobile auth: Authorization Code + PKCE, secure token storage, remote logout.
- Authorization: service-layer RBAC and ABAC, with database RLS only as defense in depth.
- Audit: append-only and tamper-evident audit events for patient record access, edits, exports, printing, billing, stock movement, and admin actions.
- Data classification: PHI, PII, financial, operational, marketing, and audit.
- Payments: Billplz for RM10 booking deposits, payment links, webhooks, refunds, and reconciliation.
- Tax: direct LHDN MyInvois API for TIN validation, signed document submission, cancellation/rejection, UUID/QR storage, and reconciliation.
- Panel/TPA: MiCare first adapter, then PMCare and HealthMetrics adapters where contracts/API access exist.
- Communications: Twilio SMS for low-PHI appointment notifications and SendGrid Email API for transactional email.
- Support: Freshdesk for support tickets, SLA policies, knowledge base, priority support, and assisted onboarding.
- Operations: GitHub Actions for checks and protected promotion, Cloudflare Pages for web deployment, Sentry for error tracking, and backup controls tied to the chosen managed PostgreSQL + R2 architecture.

## Avoid In V1

- Full microservices.
- Kafka or heavy analytics warehouse.
- Full public FHIR API.
- Public medicine commerce.
- Kubernetes unless deployment scale requires it.
- Broad telehealth/chat-care rollout before compliance gates are passed.
