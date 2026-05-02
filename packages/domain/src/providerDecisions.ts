export type ProviderDecisionStatus =
  | "selected"
  | "selectedRequiresCredentials"
  | "selectedRequiresContract"
  | "secondaryOption";

export type ProviderDecisionCategory =
  | "auth"
  | "payments"
  | "tax"
  | "panel"
  | "communications"
  | "data"
  | "support"
  | "ops";

export interface ProviderDecision {
  id: string;
  category: ProviderDecisionCategory;
  title: string;
  provider: string;
  status: ProviderDecisionStatus;
  decision: string;
  rationale: string[];
  implementationNotes: string[];
  requiredConfiguration: string[];
  complianceNotes: string[];
}

export const providerDecisions = [
  {
    id: "staff-auth-microsoft-entra",
    category: "auth",
    title: "Staff authentication, MFA, and admin sign-in",
    provider: "Microsoft Entra ID with Microsoft Authenticator",
    status: "selectedRequiresCredentials",
    decision:
      "Use Microsoft Entra ID OIDC for staff login and require Microsoft Authenticator MFA/passkey policies, matching the admin.caricite.com-style Microsoft authentication experience.",
    rationale: [
      "Microsoft Authenticator supports MFA with push notifications and verification codes, plus passwordless and passkey sign-in.",
      "A managed IdP removes password storage from UsrahMedic and gives clinic admins a familiar enterprise account recovery path.",
      "Conditional Access can enforce MFA, device, location, and admin-risk policies outside application code."
    ],
    implementationNotes: [
      "Register UsrahMedic Admin as an Entra application with Authorization Code + PKCE/OIDC.",
      "Terminate OIDC in a backend-for-frontend session and replace temporary role headers with signed server sessions.",
      "Map Entra users and groups to staff_accounts, staff_branch_assignments, and role based permissions.",
      "Store MFA enrollment state and recovery events as audit evidence, but keep the MFA challenge itself in Entra."
    ],
    requiredConfiguration: [
      "MICROSOFT_ENTRA_TENANT_ID",
      "MICROSOFT_ENTRA_CLIENT_ID",
      "MICROSOFT_ENTRA_CLIENT_SECRET",
      "MICROSOFT_ENTRA_REDIRECT_URI",
      "AUTH_SESSION_SECRET",
      "AUTH_ALLOWED_GROUP_IDS"
    ],
    complianceNotes: [
      "Require named staff accounts; shared logins are not acceptable for PHI access.",
      "Keep emergency break-glass accounts separately approved, monitored, and reviewed."
    ]
  },
  {
    id: "payments-billplz",
    category: "payments",
    title: "RM10 booking deposit and clinic payment gateway",
    provider: "Billplz",
    status: "selectedRequiresContract",
    decision:
      "Use Billplz as the primary Malaysia payment gateway for RM10 appointment deposits, payment links, FPX-led payments, webhooks, refunds, and reconciliation.",
    rationale: [
      "Billplz is Malaysia-focused and supports REST API integration and webhooks for real-time payment status updates.",
      "FPX pricing and settlement are a good fit for low-value deposits such as RM10 bookings.",
      "A local gateway reduces the first production payment scope compared with building multiple direct bank/e-wallet integrations."
    ],
    implementationNotes: [
      "Create a payment intent when a patient submits a booking that requires a deposit.",
      "Verify Billplz webhook signatures before marking deposits or invoices as paid.",
      "Keep payment ledger, invoice settlement, refund, void, and reconciliation records immutable.",
      "Use a secondary card gateway only if the clinic later requires direct card-present/card-not-present workflows."
    ],
    requiredConfiguration: [
      "BILLPLZ_API_KEY",
      "BILLPLZ_COLLECTION_ID",
      "BILLPLZ_X_SIGNATURE_KEY",
      "BILLPLZ_CALLBACK_URL",
      "BILLPLZ_REDIRECT_URL"
    ],
    complianceNotes: [
      "Do not store card data in UsrahMedic.",
      "Finance must approve refund, cancellation, and deposit-forfeiture rules before go-live."
    ]
  },
  {
    id: "tax-lhdn-myinvois-direct",
    category: "tax",
    title: "LHDN MyInvois e-invoicing",
    provider: "LHDN MyInvois API",
    status: "selectedRequiresCredentials",
    decision:
      "Integrate directly with the official LHDN MyInvois API for validation, signed document submission, status retrieval, cancellation, rejection, QR/UUID storage, and reconciliation.",
    rationale: [
      "The official MyInvois SDK/API covers taxpayer TIN validation, document submission, cancellation, rejection, document lookup, and search flows.",
      "Direct integration keeps invoice state and retry behavior inside the clinic billing ledger.",
      "A middleware can remain a later fallback if certification, signing, or support burden becomes too high."
    ],
    implementationNotes: [
      "Build sandbox/pre-production first with deterministic payload fixtures.",
      "Persist submission UUID, long ID, QR link, validation errors, cancellation/rejection reasons, and retry attempts.",
      "Separate consolidated invoice handling from individual patient-requested e-invoices.",
      "Require tax advisor review before enabling production submission."
    ],
    requiredConfiguration: [
      "MYINVOIS_ENVIRONMENT",
      "MYINVOIS_CLIENT_ID",
      "MYINVOIS_CLIENT_SECRET",
      "MYINVOIS_TAXPAYER_TIN",
      "MYINVOIS_CERTIFICATE_REF"
    ],
    complianceNotes: [
      "LHDN production access, taxpayer profile, document type mapping, and cancellation policy are owner/tax-advisor gates.",
      "Audit logs must preserve invoice submission, rejection, cancellation, and resubmission evidence."
    ]
  },
  {
    id: "panel-tpa-micare-first",
    category: "panel",
    title: "Panel, insurance, and TPA integration sequence",
    provider: "MiCare first adapter, then PMCare and HealthMetrics adapters by contract",
    status: "selectedRequiresContract",
    decision:
      "Use a multi-adapter TPA model. Build MiCare first because it is a Malaysia TPA/e-claims provider, then add PMCare and HealthMetrics based on the clinic's signed panel contracts.",
    rationale: [
      "No single TPA covers every employer/panel requirement, so the billing model must stay provider-neutral.",
      "MiCare has an explicit TPA/e-claims role connecting doctors, patients, government organizations, corporates, and insurers.",
      "PMCare and HealthMetrics should be enabled as separate adapters instead of hard-coding one panel workflow."
    ],
    implementationNotes: [
      "Keep panel providers, employer plans, eligibility checks, GL references, claim states, and price schedules in normalized tables.",
      "Implement adapter contracts for eligibility, GL lookup, claim submission, claim status, rejection, rework, and statement reconciliation.",
      "Start with manual portal-assisted workflows where an API contract is not available.",
      "Never let panel-specific pricing bypass bill approval and audit rules."
    ],
    requiredConfiguration: [
      "TPA_PRIMARY_PROVIDER",
      "MICARE_CLIENT_ID",
      "MICARE_CLIENT_SECRET",
      "PMCARE_CLIENT_ID",
      "PMCARE_CLIENT_SECRET",
      "HEALTHMETRICS_CLIENT_ID",
      "HEALTHMETRICS_CLIENT_SECRET"
    ],
    complianceNotes: [
      "Each TPA requires a data-sharing basis, processor register entry, and signed commercial terms.",
      "Patient consent and employer benefit eligibility must be visible in the billing workflow."
    ]
  },
  {
    id: "communications-twilio-sendgrid",
    category: "communications",
    title: "SMS and email notifications",
    provider: "Twilio SMS and Twilio SendGrid Email API",
    status: "selectedRequiresCredentials",
    decision:
      "Use Twilio SMS for appointment reminders/status notifications and SendGrid Email API for transactional email, with Microsoft Authenticator handling staff MFA instead of SMS OTP.",
    rationale: [
      "Twilio publishes Malaysia-specific SMS delivery and compliance guidance, including A2P restrictions.",
      "SendGrid provides a REST mail-send API suitable for appointment, invoice, support, and onboarding email.",
      "Keeping staff MFA in Microsoft Authenticator avoids relying on SMS OTP for privileged clinic access."
    ],
    implementationNotes: [
      "Send only low-PHI appointment and operational notifications by SMS.",
      "Malaysia SMS content must include the required no-charge header, brand name, and avoid URLs or personal data requests.",
      "Use authenticated SendGrid domains and templates for receipts, onboarding, support, and appointment email.",
      "Track notification consent, delivery status, suppression, and opt-out."
    ],
    requiredConfiguration: [
      "TWILIO_ACCOUNT_SID",
      "TWILIO_AUTH_TOKEN",
      "TWILIO_MESSAGING_SERVICE_SID",
      "SENDGRID_API_KEY",
      "SENDGRID_FROM_EMAIL",
      "SENDGRID_TEMPLATE_NAMESPACE"
    ],
    complianceNotes: [
      "Do not send diagnosis, medication, lab results, or detailed PHI in SMS.",
      "Marketing messages need separate consent and local time-window controls."
    ]
  },
  {
    id: "data-aws-malaysia-postgres-s3",
    category: "data",
    title: "Malaysian-hosted production data platform",
    provider: "AWS Asia Pacific (Malaysia) Region, Aurora/RDS PostgreSQL, and S3",
    status: "selectedRequiresCredentials",
    decision:
      "Use AWS ap-southeast-5 as the Malaysia production data region, with Aurora PostgreSQL or RDS PostgreSQL as the canonical PHI/financial write model and S3 in the same region for documents.",
    rationale: [
      "AWS lists Asia Pacific (Malaysia), ap-southeast-5, for Aurora PostgreSQL/RDS endpoints.",
      "AWS S3 also has a Malaysia regional endpoint, allowing documents and backups to stay in the same country target.",
      "PostgreSQL is a better fit than D1 for transaction integrity, reporting joins, audit volume, and future healthcare integrations."
    ],
    implementationNotes: [
      "Keep Cloudflare Pages for web delivery but move production PHI/financial writes to Malaysia-hosted PostgreSQL.",
      "Use D1 only for non-PHI edge foundation data unless the owner explicitly accepts its residency profile.",
      "Enable encryption at rest, PITR/backups, read replicas or DR plan, audit retention, and least-privilege database roles.",
      "Store scans, signed PDFs, invoices, exports, and attachments in S3 buckets scoped by environment and branch policy."
    ],
    requiredConfiguration: [
      "DATABASE_URL",
      "DATABASE_REGION",
      "AWS_REGION",
      "AWS_ACCESS_KEY_ID",
      "AWS_SECRET_ACCESS_KEY",
      "AWS_S3_DOCUMENT_BUCKET",
      "AWS_KMS_KEY_ID"
    ],
    complianceNotes: [
      "Complete PDPA vendor register, cross-border review for Cloudflare/communications providers, and backup restore evidence.",
      "Run migration rehearsal before any real patient data import."
    ]
  },
  {
    id: "support-freshdesk",
    category: "support",
    title: "Standard support, priority support, and assisted onboarding",
    provider: "Freshdesk",
    status: "selectedRequiresContract",
    decision:
      "Use Freshdesk for support tickets, SLA policies, escalation queues, knowledge base, onboarding requests, and priority support routing.",
    rationale: [
      "Freshdesk supports SLA policies with first response, every response, and resolution time targets.",
      "A dedicated support desk separates product support from clinical records and keeps ticket access auditable.",
      "Freshdesk can support standard support, priority support, and onboarding workflows without building a full helpdesk first."
    ],
    implementationNotes: [
      "Create ticket categories for incident, billing, onboarding, training, printer, integration, data import, and enhancement requests.",
      "Map Standard and Priority support plans to SLA policies and escalation groups.",
      "Keep PHI out of ticket titles and require redaction for attachments.",
      "Sync support ticket references back into onboarding_tasks/support_tickets records."
    ],
    requiredConfiguration: [
      "FRESHDESK_DOMAIN",
      "FRESHDESK_API_KEY",
      "FRESHDESK_WEBHOOK_SECRET",
      "SUPPORT_STANDARD_SLA_ID",
      "SUPPORT_PRIORITY_SLA_ID"
    ],
    complianceNotes: [
      "Support access to PHI requires a named staff account, approval reason, time limit, and audit event.",
      "Vendor processor terms must be accepted before real patient information appears in support tickets."
    ]
  },
  {
    id: "ops-github-cloudflare-sentry",
    category: "ops",
    title: "CI/CD, deployments, monitoring, and error tracking",
    provider: "GitHub Actions, Cloudflare Pages, Sentry, AWS backup controls",
    status: "selectedRequiresCredentials",
    decision:
      "Use GitHub Actions for checks and protected promotion, Cloudflare Pages for web deployment, Sentry for application errors, and AWS backup/PITR controls for production data.",
    rationale: [
      "The project already deploys to Cloudflare Pages and builds cleanly with npm scripts.",
      "GitHub Actions is the shortest path to enforce lint, test, typecheck, build, and migration checks before release.",
      "Sentry and provider-native backup alerts cover the first production monitoring layer without adding a heavy observability platform."
    ],
    implementationNotes: [
      "Require pull request checks before production promotion.",
      "Add preview deployment, migration dry-run, release notes, rollback instructions, and maintenance notices.",
      "Capture API failures, webhook failures, queue failures, and frontend exceptions with PHI-safe scrubbing.",
      "Run scheduled backup restore drills and record evidence."
    ],
    requiredConfiguration: [
      "GITHUB_ACTIONS_DEPLOY_TOKEN",
      "CLOUDFLARE_API_TOKEN",
      "CLOUDFLARE_ACCOUNT_ID",
      "SENTRY_DSN",
      "SENTRY_AUTH_TOKEN",
      "BACKUP_ALERT_EMAIL"
    ],
    complianceNotes: [
      "CI logs must not print secrets or patient data.",
      "Incident response and rollback evidence must be kept for production changes."
    ]
  }
] as const satisfies readonly ProviderDecision[];

export type ProviderDecisionId = (typeof providerDecisions)[number]["id"];

export const requiredProviderDecisionIds = [
  "staff-auth-microsoft-entra",
  "payments-billplz",
  "tax-lhdn-myinvois-direct",
  "panel-tpa-micare-first",
  "communications-twilio-sendgrid",
  "data-aws-malaysia-postgres-s3",
  "support-freshdesk",
  "ops-github-cloudflare-sentry"
] as const satisfies readonly ProviderDecisionId[];

export function getProviderDecisionById(id: ProviderDecisionId): ProviderDecision {
  const decision = providerDecisions.find((item) => item.id === id);

  if (!decision) {
    throw new Error(`Unknown provider decision: ${id}`);
  }

  return decision;
}

export function getProviderDecisionsByCategory(category: ProviderDecisionCategory): ProviderDecision[] {
  return providerDecisions.filter((decision) => decision.category === category);
}
