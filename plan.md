# Malaysia Multi-Branch Clinic Management System Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to execute this plan only after the plan and architecture docs are approved.

**Goal:** Build a production-capable clinic management system for Usrah Medic, currently 3 branches in Malaysia and growing, balancing cost discipline with correctness, auditability, branch-safe operations, and a clean growth path.

**Architecture:** Use **Cloudflare as the frontend, edge, preview, and security platform**, and use a **lower-cost managed PostgreSQL provider** as the canonical production data platform for PHI, financial records, inventory, and audit data. Use **Cloudflare R2** for documents, exports, invoices, and attachments. Keep the current D1/Pages Functions foundation as a development and transition layer, but do not treat D1 as the final source of truth for live production clinical and billing data.

**Tech Stack:** Next.js, React, TypeScript, Cloudflare Pages, Cloudflare Workers/Pages Functions, Cloudflare WAF/Turnstile/Rate Limiting, managed PostgreSQL (non-AWS), Cloudflare R2, Billplz, MyInvois API, Microsoft Entra ID or a simpler staff auth option if the clinic prefers lower operational overhead, Sentry, GitHub Actions.

---

## 1. Executive decision

### Final architecture truth
For the actual target now in scope — **Usrah Medic, currently 3 branches in Malaysia and growing** — the canonical production write model should be:

- **Cloudflare** for frontend hosting, edge security, preview deployments, public booking, and lightweight edge orchestration
- **Managed PostgreSQL (non-AWS)** for canonical patient, clinical, billing, inventory, panel, and audit data
- **Cloudflare R2** for documents, invoice PDFs, exports, attachments, and backup bundles

### Why this is the chosen direction
A growing 3-branch clinic needs:
- lower recurring infrastructure cost than an AWS-heavy setup
- stronger transactional reliability than D1-only for live clinical and billing data
- a growth path toward more branches without rebuilding the system
- clear backup, restore, and audit boundaries
- simpler operations than a full enterprise cloud footprint from day one

### What D1 is now
D1 remains valuable for:
- current foundation and local/preview workflows
- low-risk edge-side support data
- transition and prototyping support

D1 is **not** the final canonical production store for live production clinical and billing workflows.

---

## 2. Product scope boundaries

### In scope
- multi-branch private outpatient clinic operations
- patient registration and intake
- appointments and queue
- consultation records
- prescribing and dispensing
- inventory/pharmacy controls
- billing, payments, receipts, invoices
- panel/company/TPA workflows
- reports and exports
- security, audit, compliance, backup, and onboarding

### Explicitly out of scope for v1
- hospital HIS workflows
- inpatient/ward/bed management
- operating theatre scheduling
- heavy enterprise analytics warehouse
- public FHIR platform/API program
- teleconsult/chat-care/e-prescription delivery until policy gates are passed

---

## 3. Delivery tiers

## Tier A: Pilot Core
Build this first for one controlled branch pilot.

1. staff authentication and branch-aware authorization
2. patient registry and duplicate detection
3. appointment scheduling and walk-in queue
4. visit opening and consultation basics
5. prescription to dispensing workflow
6. billing, receipts, payments, refunds/void rules
7. medical certificate and referral basics
8. branch-safe audit baseline
9. backup/export minimum viable safety controls
10. one-branch runbooks and support process

## Tier B: Commercial Launch Core
Build after Pilot Core is proven.

1. guardian/dependent model hardening unless the pilot branch requires it earlier
2. multi-branch doctor access and locum workflow
3. richer consultation templates and document management
4. full inventory legal-operational controls
5. panel/company/TPA claim lifecycle
6. MyInvois submission and reconciliation
7. branch and finance reporting
8. onboarding toolkit and support escalation flows
9. restore drills, DR evidence, release gating

### Pilot rule for minors and dependents
If the chosen pilot branch serves minors or dependents in normal daily operations, guardian/dependent workflow moves into **Pilot Core** and is not deferred.

## Tier C: Later Expansion
1. richer patient portal/PWA
2. advanced BI and scheduled analytics
3. broader TPA adapters and lab/radiology integrations
4. AI note assistance
5. staged patient self-service features

---

## 4. Production principles

1. **One canonical source of truth** for PHI, finance, and inventory movements.
2. **Branch isolation first** — cross-branch access must be deliberate and auditable.
3. **No hard delete of medical records**.
4. **Corrections preserve original content, actor, timestamp, and reason**.
5. **Fast front-desk workflows** must still remain safe and traceable.
6. **Compliance is built into workflow design**, not bolted on later.
7. **Pilot one branch first** before scaling beyond the current 3 branches.
8. **Keep Cloudflare in front permanently**, even though canonical production data lives outside D1.

---

## 5. Repository-aware implementation stance

### Current repository reality
The repo already contains:
- `apps/platform` Next.js app
- `functions/api/*` backend route foundation
- `functions/_lib/*` shared backend helpers
- `migrations/0001..0005`
- domain contracts in `packages/domain`

### What this means for implementation
- Do **not** start by creating a duplicate greenfield API stack.
- Extend the existing `functions/` backend first.
- Introduce `apps/api` only if a deliberate migration away from Pages Functions is later approved.
- Treat new packages like `packages/integrations` or `packages/ui` as optional extractions when duplication appears, not as mandatory first moves.

---

## 6. Target production topology

## Layer 1: Cloudflare experience and perimeter
Use Cloudflare for:
- public website
- admin/staff web surfaces
- patient booking surface
- CDN and asset delivery
- WAF, rate limiting, Turnstile, bot control
- preview deployments
- host-based routing
- lightweight webhook ingress
- edge-safe orchestration and feature flags

### Suggested surfaces
- `www.<domain>` public site
- `admin.<domain>` operations shell
- `medicine.<domain>` pharmacy workflows
- `insight.<domain>` reporting dashboards
- `patient.<domain>` patient booking/PWA later

## Layer 2: Canonical backend and storage
Use the canonical data platform for:
- patient master
- visits and consultations
- invoices and payments
- inventory transactions and stock ledger
- panel/company/TPA claim records
- audit ledger
- clinical documents metadata
- reporting snapshots
- backup/restore and recovery evidence

### Canonical runtime decision
For production authenticated writes, the target runtime is a **dedicated canonical application API/BFF backed by managed PostgreSQL (non-AWS) and Cloudflare R2**, with Cloudflare remaining in front for routing, security, previews, and low-risk edge orchestration.

The current `functions/` foundation should be extended where practical during transition, but the production write path should not depend on D1 as the canonical store.

### Core services
- authenticated application API / BFF
- background jobs for claims, invoicing, export, reconciliation, and report generation
- PostgreSQL as canonical relational store
- R2 for documents, signed PDFs, attachments, exports, and backup bundles

## Layer 3: Transition and edge-side support
Keep or adapt current Cloudflare foundation for:
- local and preview development
- public booking intake
- lightweight low-risk edge workflows
- future caching and orchestration concerns

---

## 7. Data classification and placement

### Canonical production database only
- patient demographics
- patient identifiers and contact info
- clinical notes and diagnoses
- prescriptions and dispensing records
- invoices, payments, refunds, reversals
- branch stock ledger and adjustments
- panel/company balances and claims state
- privileged staff mapping and branch assignment
- audit events and access evidence

### Object storage only with metadata in canonical DB
- invoices and receipt PDFs
- referrals and medical certificates
- consent documents
- attachments and scans
- export files
- backup bundles

### Never casually log or send to third-party analytics
- patient names
- NRIC/passport numbers
- diagnosis text
- prescription text
- financial identifiers
- secrets or raw tokens

---

## 8. Compliance work that must be planned before coding broad features

## PDPA
Must build explicit support for:
- versioned privacy notices
- consent history
- access/correction/export requests
- withdrawal workflow where applicable
- breach workflow and evidence capture
- processor/vendor register support
- cross-border transfer basis tracking
- vendor-by-vendor data-flow review before PHI-adjacent workflows are enabled

## MMC / medical records
Must build explicit support for:
- no hard delete
- corrections ledger
- access/export/print audit
- medical report request workflow later in Commercial Launch Core

## CKAPS / clinic governance
Must support:
- branch registration evidence
- OYB/person-in-charge mapping
- incident/complaint workflows
- APC/credential/indemnity tracking in the broader rollout

## OHS / telehealth gating
Keep these disabled until separately approved:
- teleconsult
- chat-based care
- e-prescription/delivery workflows that cross policy gates

## Pharmacy and medicine governance
Medication master must eventually include:
- MAL/NPRA status
- active ingredient
- poison group
- dangerous/psychotropic flags
- cold-chain and recall status
- barcode
- LASA/high-alert markers

Must support separate legal-operational records:
- stock ledger
- correction ledger
- dangerous/psychotropic register or explicit exclusion decision
- dispensing state progression

---

## 9. Pilot class guardrails

The initial rollout is for **one branch pilot** inside a growing 3-branch clinic group.

### Pilot assumptions
- one branch only
- controlled number of staff users
- controlled patient migration set
- limited integration count
- paper/spreadsheet fallback available during pilot
- daily backup and export verification required
- branch-level sign-off before expansion
- if the branch handles minors/dependents routinely, guardian workflow is included in Pilot Core

### Pilot exclusions unless explicitly approved
- no telehealth/chat-care rollout
- no broad cross-branch break-glass usage outside approved policy
- no expansion to additional branches until restore, audit, and core workflow gates pass

### Do not expand pilot until
- auth and branch isolation are proven
- audit baseline is proven
- restore test is proven
- registration → consultation → dispense → payment workflow works reliably
- print and document outputs are stable

## 9A. Records retention matrix (design baseline)

This is implementation guidance and still requires legal/compliance confirmation.

- Medical records: retain under clinic legal/medical records policy; no hard delete; archive and correction controls only.
- Billing and payment records: retain under finance/tax policy with immutable audit linkage.
- MyInvois/e-invoice artefacts: retain according to tax and reconciliation requirements with signed reference preservation.
- Audit logs: retain long enough to support investigations, complaints, access review, and branch-level governance.
- Consent/privacy records: retain versioned notice and consent evidence for the life of the related patient relationship and any required post-relationship audit period.
- Support and onboarding evidence: retain according to operational and vendor-governance need, excluding unnecessary PHI.

A detailed retention schedule with exact durations must be approved before production go-live.

## 9B. Break-glass and emergency cross-branch access baseline

For a growing multi-branch clinic group, break-glass access cannot remain a placeholder.

Minimum requirements:
- explicit trigger categories
- authorized requester and approver roles
- reason capture
- time-bounded elevated access
- branch and patient scope recorded
- post-event review and audit reporting
- incident linkage where applicable

Break-glass workflow must be designed before multi-branch rollout, even if rarely used in pilot.

---

## 10. Implementation phases

## Phase 0: Architecture alignment and plan cleanup

### Task 1: Align architecture docs
**Objective:** Make all core docs say the same thing.

**Files:**
- Modify: `plan.md`
- Modify: `README.md`
- Modify: `docs/architecture.md`
- Modify: `docs/production-capability-plan.md`
- Modify: `docs/cloudflare-deployment.md`
- Modify: `docs/rollout.md`

**Steps:**
1. State clearly that Cloudflare stays the frontend/perimeter platform.
2. State clearly that managed PostgreSQL + R2 is canonical for production rollout.
3. Clarify D1 as foundation/transition only.
4. Remove contradictory architecture wording.
5. State that `plan.md` is the master execution sequence until implementation begins.

**Verification:**
- No architecture or rollout document contradicts another.

### Task 2: Cut scope into tiers
**Objective:** Prevent accidental overbuilding.

**Files:**
- Modify: `plan.md`
- Modify: `docs/production-capability-plan.md`

**Steps:**
1. Mark Pilot Core features.
2. Mark Commercial Launch Core features.
3. Mark Later Expansion features.

**Verification:**
- There is one explicit pilot scope list.

---

## Phase 1: Verification and repository readiness

### Task 3: Restore reliable verification
**Objective:** Make test/build loops trustworthy before broad implementation.

**Files:**
- Modify: `package.json` if needed
- Modify: lockfile/dependency configuration as needed
- Create: `docs/runbooks/dev-verification.md`

**Steps:**
1. Fix the Rollup optional dependency issue blocking `npm run test`.
2. Re-run `npm run lint`, `npm run test`, `npm run typecheck`, `npm run build`.
3. Document the expected verification commands.

**Verification:**
- Project-native verification succeeds reliably.

### Task 4: Audit existing backend and migration foundation
**Objective:** Use what already exists instead of duplicating it.

**Files:**
- Modify: `docs/architecture.md`
- Create: `docs/current-backend-audit.md`

**Steps:**
1. Inventory all `functions/api/*` routes.
2. Audit `migrations/0001..0005` and map covered domains.
3. List missing production tables/columns/indexes.
4. Confirm what remains in D1 only for foundation purposes.

**Verification:**
- Team has a gap report instead of guessing.

---

## Phase 2: Security, auth, branch isolation, and audit baseline

### Task 5: Staff auth and session model
**Objective:** Remove trust in temporary role headers for production workflows.

**Files:**
- Modify: `functions/api/auth/*` or replacement production API layer
- Modify: auth middleware/helpers
- Create: auth session tests

**Steps:**
1. Implement Microsoft Entra ID integration path.
2. Add BFF session handling and CSRF protection.
3. Map staff accounts to branches and roles.
4. Add remote logout and session audit.

**Verification:**
- No sensitive production path trusts fake headers.

### Task 6: Branch-aware authorization
**Objective:** Enforce least privilege across a growing multi-branch environment.

**Files:**
- Modify: shared access helpers
- Modify: patient, visit, billing, inventory, report routes
- Test: authorization tests

**Steps:**
1. Centralize branch and role checks.
2. Add cross-branch denial tests.
3. Add owner and approved cross-branch doctor access rules.
4. Design and document break-glass workflow requirements: trigger, approver, scope, time limit, reason, and review.

**Verification:**
- Cross-branch access fails unless explicitly allowed.
- Break-glass events, when used, would be auditable and bounded.

### Task 7: Audit baseline and record integrity
**Objective:** Make sensitive actions attributable from the start.

**Files:**
- Modify: audit helpers and mutating services
- Create: audit coverage tests

**Steps:**
1. Audit create/update/view/export/print events where required.
2. Add no-hard-delete rule for medical records.
3. Add corrections ledger behavior.
4. Redact PHI from inappropriate metadata.

**Verification:**
- Patient, billing, inventory, and admin mutations all emit auditable events.

---

## Phase 3: Schema and storage gap closure

### Task 8: Incremental migration plan from existing migrations
**Objective:** Add only missing schema changes.

**Files:**
- Modify/Create: new migrations after `0005_*`
- Create: schema smoke tests

**Steps:**
1. Review `0001..0005`.
2. Create new migrations only for missing patient/visit/billing/inventory/document/audit details.
3. Add indexes for branch-scoped lookups and reconciliation-heavy paths.
4. Validate migration chain end to end.

**Verification:**
- Migration chain applies cleanly in controlled environments.

### Task 9: Object storage and document metadata contract
**Objective:** Keep binary files and metadata controlled.

**Files:**
- Modify/create: storage abstraction layer
- Modify: document routes and metadata models

**Steps:**
1. Define metadata model in canonical DB.
2. Define signed upload/download behavior.
3. Keep document linkage auditable.

**Verification:**
- Documents are retrievable and traceable without losing metadata integrity.

---

## Phase 4: Pilot Core operational workflows

### Task 10: Patient registry and duplicate control
**Objective:** Support safe patient creation and search.

**Files:**
- Modify: patient routes/UI
- Test: patient create/search/duplicate tests

**Verification target:**
- Front desk can find or create patient records quickly and safely.

### Task 11: Appointments, walk-ins, and queue
**Objective:** Make one branch operationally usable.

**Files:**
- Modify: appointment and queue routes/UI
- Test: scheduling and queue state tests

**Verification target:**
- Branch can manage walk-ins and appointments through discharge.

### Task 12: Consultation basics
**Objective:** Enable doctor workflow without overbuilding.

**Files:**
- Modify: visit/consultation/document routes/UI
- Test: consultation lifecycle tests

**Verification target:**
- Doctor can open visit, record note, and hand off to dispense/billing.

### Task 13: Dispensing basics and billing core
**Objective:** Close the loop on clinical and revenue workflow.

**Files:**
- Modify: dispensing, invoice, payment, document routes/UI
- Test: dispense/bill/pay tests

**Verification target:**
- One branch can complete registration → consultation → dispense → payment with receipt.

---

## Phase 5: Backup, restore, export, and pilot runbooks

### Task 14: Backup and restore design
**Objective:** Make business continuity real before expansion.

**Files:**
- Create: `docs/runbooks/backup-restore.md`
- Create: `docs/runbooks/restore-test.md`
- Modify: deployment and operations docs
- Modify: `docs/compliance-matrix.md`

**Steps:**
1. Define backup schedule, retention classes, and storage targets.
2. Define restore environment and drill process.
3. Define export routine for clinic continuity.
4. Record RPO/RTO expectations.
5. Tie retention and restore assumptions back to medical, billing, consent, audit, and e-invoice records.

**Verification:**
- Restore drill succeeds in an isolated environment.
- Retention and export assumptions are documented and reviewable.

### Task 15: Pilot runbooks and go-live checklist
**Objective:** Prevent uncontrolled branch rollout.

**Files:**
- Create: `docs/pilot-readiness.md`
- Create: `docs/branch-go-live-checklist.md`
- Create: `docs/support-escalation.md`

**Verification:**
- One-branch pilot checklist is complete and executable.

---

## Phase 6: Commercial Launch Core

After Pilot Core proves stable, expand into:
- richer patient history and attachments
- guardian/dependent model
- doctor multi-branch roster and locum support
- stronger inventory and legal registers
- panel/company/TPA claim lifecycle
- MyInvois submission and reconciliation
- branch and finance dashboards
- onboarding/support toolkit
- release gating and operational maturity

---

## 11. Required go-live criteria for first branch

Before pilot go-live:
- auth/session model is real, not header-based
- branch isolation tests pass
- test/build/typecheck pipeline passes
- migration chain is verified
- no-hard-delete behavior is verified
- audit baseline is verified
- registration → consult → dispense → pay works end to end
- backup/export path is verified
- restore drill has been executed
- print tests pass for receipt, label, MC, referral
- branch staff training and support path are ready

---

## 12. Validation commands

Use project-native checks before each milestone review:

```bash
npm run lint
npm run test
npm run typecheck
npm run build
```

For database and deployment checks, use the repo’s actual migration/deployment paths rather than introducing duplicate greenfield flows.

---

## 13. Final implementation recommendation

Do **not** start broad feature implementation until:
1. architecture docs are aligned,
2. pilot scope is cut clearly,
3. test reliability is fixed,
4. auth/audit/compliance foundation is moved earlier,
5. migration work is rebased on the existing repo reality.

Once those are done, implement in this order:
1. architecture + scope alignment
2. verification reliability
3. auth/branch isolation/audit
4. incremental schema changes
5. Pilot Core workflow build-out
6. backup/restore/runbooks
7. one-branch pilot validation
8. broader commercial rollout features

This is the safest path for Usrah Medic’s current size and growth trajectory.