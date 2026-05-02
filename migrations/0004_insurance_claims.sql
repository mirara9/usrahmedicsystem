PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS payer_providers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  provider_kind TEXT NOT NULL CHECK (provider_kind IN ('insurer', 'takaful', 'tpa', 'corporate', 'other')),
  adapter_kind TEXT NOT NULL DEFAULT 'mock' CHECK (adapter_kind IN ('mock', 'portal_manual', 'api')),
  payer_code TEXT,
  supported_claim_modes_json TEXT NOT NULL DEFAULT '[]',
  contact_json TEXT NOT NULL DEFAULT '{}',
  portal_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payer_providers_code
  ON payer_providers(payer_code)
  WHERE payer_code IS NOT NULL;

CREATE TABLE IF NOT EXISTS payer_plans (
  id TEXT PRIMARY KEY,
  payer_provider_id TEXT NOT NULL REFERENCES payer_providers(id) ON DELETE CASCADE,
  plan_code TEXT NOT NULL,
  name TEXT NOT NULL,
  plan_type TEXT NOT NULL DEFAULT 'corporate_outpatient' CHECK (plan_type IN ('individual', 'corporate_outpatient', 'corporate_inpatient', 'takaful_certificate', 'other')),
  outpatient_cashless_enabled INTEGER NOT NULL DEFAULT 1 CHECK (outpatient_cashless_enabled IN (0, 1)),
  guarantee_letter_required INTEGER NOT NULL DEFAULT 0 CHECK (guarantee_letter_required IN (0, 1)),
  default_copay_cents INTEGER NOT NULL DEFAULT 0,
  annual_limit_cents INTEGER,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  rules_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (payer_provider_id, plan_code)
);

CREATE TABLE IF NOT EXISTS branch_payer_contracts (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  payer_provider_id TEXT NOT NULL REFERENCES payer_providers(id) ON DELETE CASCADE,
  contract_code TEXT,
  claim_mode TEXT NOT NULL CHECK (claim_mode IN ('cashless_panel', 'guarantee_letter', 'reimbursement', 'self_pay_fallback')),
  portal_submission_required INTEGER NOT NULL DEFAULT 0 CHECK (portal_submission_required IN (0, 1)),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  effective_from TEXT NOT NULL,
  effective_to TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (branch_id, payer_provider_id, claim_mode)
);

CREATE TABLE IF NOT EXISTS payer_code_mappings (
  id TEXT PRIMARY KEY,
  branch_id TEXT REFERENCES branches(id) ON DELETE RESTRICT,
  payer_provider_id TEXT NOT NULL REFERENCES payer_providers(id) ON DELETE CASCADE,
  local_code TEXT NOT NULL,
  payer_code TEXT NOT NULL,
  mapping_type TEXT NOT NULL CHECK (mapping_type IN ('service', 'medicine', 'diagnosis', 'procedure')),
  price_cents INTEGER,
  currency TEXT NOT NULL DEFAULT 'MYR',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payer_code_mappings_lookup
  ON payer_code_mappings(payer_provider_id, branch_id, mapping_type, local_code, status);

CREATE TABLE IF NOT EXISTS patient_payer_memberships (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  payer_provider_id TEXT NOT NULL REFERENCES payer_providers(id) ON DELETE RESTRICT,
  payer_plan_id TEXT REFERENCES payer_plans(id) ON DELETE SET NULL,
  member_id_hash TEXT NOT NULL,
  member_display TEXT,
  member_category TEXT NOT NULL DEFAULT 'employee' CHECK (member_category IN ('employee', 'dependent', 'individual')),
  employer_name TEXT,
  policy_or_certificate_ref TEXT,
  dependent_ref TEXT,
  starts_on TEXT,
  ends_on TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired')),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_patient_payer_memberships_patient
  ON patient_payer_memberships(patient_id, status, payer_provider_id);

CREATE TABLE IF NOT EXISTS payer_eligibility_checks (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  patient_id TEXT REFERENCES patients(id) ON DELETE SET NULL,
  patient_payer_membership_id TEXT REFERENCES patient_payer_memberships(id) ON DELETE SET NULL,
  payer_provider_id TEXT NOT NULL REFERENCES payer_providers(id) ON DELETE RESTRICT,
  payer_plan_id TEXT REFERENCES payer_plans(id) ON DELETE SET NULL,
  invoice_id TEXT REFERENCES invoices(id) ON DELETE SET NULL,
  appointment_id TEXT REFERENCES appointments(id) ON DELETE SET NULL,
  visit_id TEXT REFERENCES patient_visit_records(id) ON DELETE SET NULL,
  requested_claim_mode TEXT NOT NULL CHECK (requested_claim_mode IN ('cashless_panel', 'guarantee_letter', 'reimbursement', 'self_pay_fallback')),
  status TEXT NOT NULL CHECK (status IN ('eligible', 'preauth_required', 'rejected')),
  resolved_claim_mode TEXT NOT NULL CHECK (resolved_claim_mode IN ('cashless_panel', 'guarantee_letter', 'reimbursement', 'self_pay_fallback')),
  payer_payable_cents INTEGER NOT NULL DEFAULT 0,
  patient_payable_cents INTEGER NOT NULL DEFAULT 0,
  reason_code TEXT NOT NULL,
  response_json TEXT NOT NULL DEFAULT '{}',
  checked_by_hash TEXT,
  checked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payer_eligibility_checks_lookup
  ON payer_eligibility_checks(branch_id, patient_id, payer_provider_id, checked_at);

CREATE TABLE IF NOT EXISTS payer_preauth_requests (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  eligibility_check_id TEXT REFERENCES payer_eligibility_checks(id) ON DELETE SET NULL,
  patient_id TEXT REFERENCES patients(id) ON DELETE SET NULL,
  payer_provider_id TEXT NOT NULL REFERENCES payer_providers(id) ON DELETE RESTRICT,
  invoice_id TEXT REFERENCES invoices(id) ON DELETE SET NULL,
  visit_id TEXT REFERENCES patient_visit_records(id) ON DELETE SET NULL,
  requested_amount_cents INTEGER NOT NULL,
  approved_amount_cents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('gl_requested', 'gl_approved', 'gl_rejected')),
  external_reference TEXT,
  diagnosis_code TEXT,
  reason_code TEXT NOT NULL,
  attachment_count INTEGER NOT NULL DEFAULT 0,
  response_json TEXT NOT NULL DEFAULT '{}',
  requested_by_hash TEXT,
  requested_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_payer_preauth_requests_lookup
  ON payer_preauth_requests(branch_id, payer_provider_id, status, requested_at);

CREATE TABLE IF NOT EXISTS claim_submissions (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  payer_provider_id TEXT NOT NULL REFERENCES payer_providers(id) ON DELETE RESTRICT,
  patient_id TEXT REFERENCES patients(id) ON DELETE SET NULL,
  invoice_id TEXT REFERENCES invoices(id) ON DELETE SET NULL,
  visit_id TEXT REFERENCES patient_visit_records(id) ON DELETE SET NULL,
  eligibility_check_id TEXT REFERENCES payer_eligibility_checks(id) ON DELETE SET NULL,
  preauth_request_id TEXT REFERENCES payer_preauth_requests(id) ON DELETE SET NULL,
  claim_mode TEXT NOT NULL CHECK (claim_mode IN ('cashless_panel', 'guarantee_letter', 'reimbursement', 'self_pay_fallback')),
  status TEXT NOT NULL CHECK (status IN ('draft', 'submitted', 'queried', 'approved', 'partially_approved', 'rejected', 'paid', 'reconciled', 'voided')),
  external_reference TEXT,
  requested_amount_cents INTEGER NOT NULL,
  approved_amount_cents INTEGER NOT NULL DEFAULT 0,
  patient_balance_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'MYR',
  reason_code TEXT,
  rejection_reason_id TEXT REFERENCES claim_rejection_reasons(id) ON DELETE SET NULL,
  response_json TEXT NOT NULL DEFAULT '{}',
  submitted_by_hash TEXT,
  submitted_at TEXT,
  resolved_at TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_claim_submissions_lookup
  ON claim_submissions(branch_id, payer_provider_id, status, created_at);

CREATE TABLE IF NOT EXISTS claim_submission_lines (
  id TEXT PRIMARY KEY,
  claim_submission_id TEXT NOT NULL REFERENCES claim_submissions(id) ON DELETE CASCADE,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  invoice_line_id TEXT REFERENCES invoice_lines(id) ON DELETE SET NULL,
  local_code TEXT,
  payer_code TEXT,
  description TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 1,
  requested_amount_cents INTEGER NOT NULL DEFAULT 0,
  approved_amount_cents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'approved', 'partially_approved', 'rejected', 'voided')),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS claim_attachments (
  id TEXT PRIMARY KEY,
  claim_submission_id TEXT REFERENCES claim_submissions(id) ON DELETE CASCADE,
  preauth_request_id TEXT REFERENCES payer_preauth_requests(id) ON DELETE CASCADE,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  attachment_type TEXT NOT NULL CHECK (attachment_type IN ('invoice', 'receipt', 'clinical_note', 'referral', 'medical_certificate', 'lab_result', 'other')),
  storage_uri TEXT,
  content_hash TEXT,
  status TEXT NOT NULL DEFAULT 'attached' CHECK (status IN ('attached', 'sent', 'voided')),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS claim_rejection_reasons (
  id TEXT PRIMARY KEY,
  payer_provider_id TEXT REFERENCES payer_providers(id) ON DELETE CASCADE,
  reason_code TEXT NOT NULL,
  title TEXT NOT NULL,
  patient_billable INTEGER NOT NULL DEFAULT 1 CHECK (patient_billable IN (0, 1)),
  rework_allowed INTEGER NOT NULL DEFAULT 1 CHECK (rework_allowed IN (0, 1)),
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (payer_provider_id, reason_code)
);

CREATE TABLE IF NOT EXISTS payer_reconciliation_batches (
  id TEXT PRIMARY KEY,
  branch_id TEXT REFERENCES branches(id) ON DELETE SET NULL,
  payer_provider_id TEXT NOT NULL REFERENCES payer_providers(id) ON DELETE RESTRICT,
  batch_reference TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'matched', 'reconciled', 'voided')),
  expected_amount_cents INTEGER NOT NULL DEFAULT 0,
  received_amount_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'MYR',
  received_at TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (payer_provider_id, batch_reference)
);

CREATE TABLE IF NOT EXISTS payer_remittances (
  id TEXT PRIMARY KEY,
  branch_id TEXT REFERENCES branches(id) ON DELETE SET NULL,
  payer_provider_id TEXT NOT NULL REFERENCES payer_providers(id) ON DELETE RESTRICT,
  claim_submission_id TEXT REFERENCES claim_submissions(id) ON DELETE SET NULL,
  reconciliation_batch_id TEXT REFERENCES payer_reconciliation_batches(id) ON DELETE SET NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'MYR',
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'matched', 'reconciled', 'reversed')),
  external_reference TEXT,
  received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO payer_providers (
  id, name, provider_kind, adapter_kind, payer_code, supported_claim_modes_json, portal_url, metadata_json
) VALUES
  ('payer-aia', 'AIA Malaysia', 'insurer', 'mock', 'AIA', '["cashless_panel","guarantee_letter","reimbursement"]', 'https://www.aia.com.my/', '{"demo":true}'),
  ('payer-aia-takaful', 'AIA PUBLIC Takaful', 'takaful', 'mock', 'AIA-TAKAFUL', '["guarantee_letter","reimbursement"]', 'https://www.aia.com.my/', '{"demo":true}'),
  ('payer-pmcare', 'PMCare', 'tpa', 'portal_manual', 'PMCARE', '["cashless_panel","guarantee_letter"]', 'https://www.pmcare.com.my/', '{"demo":true}'),
  ('payer-micare', 'MiCare', 'tpa', 'portal_manual', 'MICARE', '["cashless_panel","guarantee_letter","reimbursement"]', 'https://eclaims.micaresvc.com/', '{"demo":true}'),
  ('payer-healthmetrics', 'HealthMetrics', 'tpa', 'portal_manual', 'HEALTHMETRICS', '["cashless_panel","guarantee_letter","reimbursement"]', 'https://portal.healthmetrics.com/clinic', '{"demo":true}'),
  ('payer-compumed', 'CompuMed', 'tpa', 'portal_manual', 'COMPUMED', '["cashless_panel","guarantee_letter","reimbursement"]', 'https://provider.compumed.com.my/site/login', '{"demo":true}');

INSERT OR IGNORE INTO payer_plans (
  id, payer_provider_id, plan_code, name, plan_type, outpatient_cashless_enabled,
  guarantee_letter_required, default_copay_cents, annual_limit_cents, rules_json
) VALUES
  ('plan-aia-corp-outpatient', 'payer-aia', 'AIA-CORP-OP', 'AIA Corporate Outpatient Demo', 'corporate_outpatient', 0, 0, 0, 500000, '{"demo":true}'),
  ('plan-pmcare-open-panel', 'payer-pmcare', 'PMCARE-OPEN', 'PMCare Open Panel Demo', 'corporate_outpatient', 1, 1, 500, 300000, '{"demo":true}'),
  ('plan-takaful-gl', 'payer-aia-takaful', 'TAKAFUL-GL', 'Takaful GL Demo', 'takaful_certificate', 0, 1, 0, 1000000, '{"demo":true}');

INSERT OR IGNORE INTO branch_payer_contracts (
  id, branch_id, payer_provider_id, contract_code, claim_mode, portal_submission_required,
  effective_from, metadata_json
) VALUES
  ('contract-pa-aia-reimbursement', 'puncak-alam', 'payer-aia', 'AIA-DEMO-PA', 'reimbursement', 1, '2026-05-01', '{"demo":true}'),
  ('contract-pa-pmcare-cashless', 'puncak-alam', 'payer-pmcare', 'PMCARE-DEMO-PA', 'cashless_panel', 1, '2026-05-01', '{"demo":true}'),
  ('contract-pa-takaful-gl', 'puncak-alam', 'payer-aia-takaful', 'TAKAFUL-DEMO-PA', 'guarantee_letter', 1, '2026-05-01', '{"demo":true}');

INSERT OR IGNORE INTO claim_rejection_reasons (
  id, payer_provider_id, reason_code, title, patient_billable, rework_allowed
) VALUES
  ('reject-benefit-not-covered', NULL, 'BENEFIT_NOT_COVERED', 'Benefit is not covered by the member plan', 1, 1),
  ('reject-missing-documents', NULL, 'PAYER_REQUESTED_DOCUMENTS', 'Payer requested additional documents', 0, 1),
  ('reject-panel-not-available', NULL, 'PANEL_NOT_AVAILABLE', 'Branch is not panel-enabled for this payer', 1, 0);
