# UsrahMedic Platform

Execution note:
- `plan.md` is the master execution sequence until implementation begins.
- This README summarizes the current repo state and target direction, but should not override the implementation order defined in `plan.md`.

Cloudflare-ready implementation foundation for the UsrahMedic clinic management platform.

## What Exists

- A TypeScript monorepo with a runnable Next.js platform app.
- Shared domain logic for clinic workflow states, permissions, compliance controls, seeded branches, medicine safety, and owner KPIs.
- Initial web surfaces for the public site, admin clinic operations, medicine operations, owner insights, patient PWA, and staff app.
- Cloudflare-oriented client actions for registration, stock receiving, owner export, patient booking, and staff stock scan.
- Static Next.js export for Cloudflare Pages, with Pages Functions and D1 as the edge API/data target.
- Architecture, compliance, and rollout documentation aligned to the reviewed plan.

## Run Locally

```powershell
npm install
npm run dev
```

Open `http://localhost:3000`.

## Cloudflare Foundation Target

Current foundation deployment:

- `https://usrahmedic-cms.pages.dev`

```powershell
npm run build:cloudflare
npm run preview:cloudflare
```

This section describes the **current Cloudflare foundation deployment only**.
It is useful for preview, prototype, and transition environments.
It is **not** the final canonical production data architecture for Usrah Medic's live clinic records.
The public production domain cutover to `usrahmedic.com` happens later, after the new platform is ready.

The current foundation deployment uses Cloudflare Pages with `apps/platform/out` as the build output and Pages Functions under `functions/` for `/api/*` routes. D1 migrations live under `migrations/`.

After creating the real foundation D1 database and updating `wrangler.toml` with the Cloudflare-provided IDs:

```powershell
npm run db:migrate:remote
npm run deploy:cloudflare
```

Key routes:

- `/` public website
- `/admin` clinic operations
- `/medicine` pharmacy and inventory
- `/insight` owner dashboards
- `/patient` patient PWA
- `/staff` staff mobile surface

The app also includes host-based rewrites for future deployment:

- `admin.usrahmedic.com` -> `/admin`
- `medicine.usrahmedic.com` -> `/medicine`
- `insight.usrahmedic.com` -> `/insight`

## Verification

```powershell
npm run lint
npm run test
npm run typecheck
npm run build
```

## Implementation Boundary

This is not yet the final clinic management system. It is the first executable Cloudflare foundation.

For the target deployment now in scope — **Usrah Medic, currently 3 branches and growing** — the production architecture is:
- Cloudflare for frontend hosting, previews, WAF, bot protection, and edge orchestration.
- A lower-cost managed PostgreSQL provider for canonical production PHI, financial records, inventory, and audit data.
- Cloudflare R2 for documents, reporting snapshots, exports, and backup bundles.
- D1 remains a foundation and transition layer, not the final canonical production data store.

Production provider decisions are now selected:

- Staff auth/MFA: Microsoft Entra ID with Microsoft Authenticator.
- Payment gateway: Billplz.
- LHDN e-Invoicing: direct MyInvois API.
- Panel/TPA: MiCare first adapter, then PMCare and HealthMetrics by contract.
- SMS/email: Twilio SMS and Twilio SendGrid Email API.
- Malaysia data platform: managed PostgreSQL + Cloudflare R2.
- Support/onboarding: Freshdesk.
- CI/CD and monitoring: GitHub Actions, Cloudflare Pages, Sentry, and backup controls for the chosen managed database + R2 stack.

Production still needs the actual credentials, contracts, policies, and implementation work:

- Microsoft Entra tenant/app registration, BFF sessions, staff account mapping, and MFA enforcement.
- Managed PostgreSQL provisioning, R2 storage policy, migration from D1 foundation storage, and audit hardening.
- Billplz, MyInvois, panel/TPA, SMS/email, lab/radiology, and accounting integrations.
- Legal review for PDPA, CKAPS, MMC, MAB, OHS, prescribing, and dispensing workflows.
- Migration of real branch, panel, patient, service, price, and stock data.
- Security testing, backup/DR drills, and pilot branch rollout.
