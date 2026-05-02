# Plan Consensus Review

Date: 2026-05-02
Scope: `/mnt/d/PlayRepo/UsrahMedic/plan.md` and related repository docs
Method: 3 independent subagent reviews plus controller verification of repository state

## Consensus Verdict

The plan **needs changes before implementation**.

All reviewers agreed the product direction is good, but the current plan is **not solid enough to implement as-is** because it has unresolved architecture contradictions, too much v1 scope, incomplete translation of compliance requirements into build tasks, and implementation steps that do not fully match the current repository structure.

## Verified Repository Facts

- `npm run test` currently fails due to missing optional dependency `@rollup/rollup-linux-x64-gnu`.
- The repository already contains substantial backend surface under `functions/api/*`.
- Existing migrations already include:
  - `0001_usrahmedic_foundation.sql`
  - `0002_booking_deposits.sql`
  - `0003_production_clinic_foundation.sql`
  - `0004_insurance_claims.sql`
  - `0005_demo_claim_seed.sql`

## Consensus Changes Required Before Implementation

1. **Choose one canonical architecture truth and align all docs**
   - Resolve the contradiction between:
     - Cloudflare-first with D1/R2 as primary v1 persistence in `plan.md`
     - AWS Malaysia PostgreSQL/S3 as canonical production storage in `README.md` and `docs/architecture.md`
   - Make one clear statement and apply it consistently.

2. **Cut scope into Pilot Core / Commercial Launch / Later**
   - Current v1 is too broad.
   - Pilot Core should focus on:
     - patient registration/master
     - appointments and queue
     - consultation basics
     - dispensing basics
     - billing/payments
     - minimal document generation
     - audit baseline
     - minimal backup/export capability

3. **Make the plan repository-aware**
   - Extend the existing `functions/` backend instead of planning a duplicate greenfield API layer.
   - Treat `apps/api` as optional future refactor, not the immediate destination.

4. **Make migration work incremental from existing migrations**
   - Do not assume the core schema is missing.
   - Start by auditing `0001..0005`, then add only the missing incremental migrations.

5. **Move security, audit, and compliance earlier**
   - Add explicit implementation tasks for:
     - consent/versioned notice capture
     - no-hard-delete / correction ledger model
     - audit logging for read/write/export/print
     - branch-scoped access enforcement
     - feature gates for restricted telehealth/e-prescription/chat workflows
     - pharmacy/legal register design

6. **Define backup, restore, and export strategy before build-out**
   - Specify:
     - what is backed up
     - how often
     - retention
     - restore environment
     - restore drill cadence
     - exportability/business continuity process

7. **Revisit provider decisions for low-cost pilot realism**
   - Keep enterprise-grade options available, but do not lock expensive/heavy providers too early if they conflict with first-pilot economics.

8. **Add pilot guardrails and implementation prerequisites**
   - Define target pilot class and volume limits.
   - Add prerequisite work to fix test reliability before broad feature implementation.

## Areas of Nuance

- Reviewers agreed on the blockers.
- Main nuance was how far D1 can safely go:
  - one review was open to D1-first if scope is tightly controlled,
  - one was more skeptical of D1 as canonical storage for the full currently-described v1,
  - one focused on matching the plan to the repo regardless of final platform choice.

## Recommended Implementation Order After Plan Fixes

1. Resolve architecture and scope in writing
2. Stabilize verification and test harness
3. Implement auth/authorization/audit/compliance foundation
4. Audit existing migrations and add only missing schema changes
5. Build Pilot Core workflows
6. Add backup/restore/export and runbooks
7. Validate one-branch pilot readiness before broader features

## Final Recommendation

**Revise the plan first. Do not start full implementation yet.**

The repo is strong enough to continue soon, but only after the plan is tightened around:
- one architecture truth
- smaller pilot-core scope
- repo-realistic backend and migration tasks
- earlier compliance/security work
- backup/restore/export strategy
- pilot guardrails
