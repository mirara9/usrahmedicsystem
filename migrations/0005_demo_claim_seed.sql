PRAGMA foreign_keys = ON;

INSERT OR IGNORE INTO patients (
  id, branch_id, external_ref, full_name, preferred_name, national_id_last4,
  date_of_birth, sex, phone_e164, email, address_json, emergency_contact_json,
  consent_pdpa_at, privacy_notice_version, status, registered_source,
  medical_alerts_json
) VALUES (
  'patient-demo-claim',
  'puncak-alam',
  'DEMO-CLAIM-001',
  'Demo Panel Patient',
  'Demo',
  '0000',
  '1990-01-01',
  'unknown',
  '+60000000000',
  'demo-panel-patient@example.invalid',
  '{}',
  '{}',
  '2026-05-01T00:00:00.000Z',
  '2026-05-01',
  'active',
  'counter',
  '{}'
);

INSERT OR IGNORE INTO patient_payer_memberships (
  id, branch_id, patient_id, payer_provider_id, payer_plan_id,
  member_id_hash, member_display, member_category, employer_name,
  policy_or_certificate_ref, starts_on, status, metadata_json
) VALUES (
  'membership-demo-claim',
  'puncak-alam',
  'patient-demo-claim',
  'payer-pmcare',
  'plan-pmcare-open-panel',
  'mock-member-hash-demo-only',
  '****1234',
  'employee',
  'Demo Employer Sdn Bhd',
  'DEMO-POLICY-001',
  '2026-05-01',
  'active',
  '{"demo":true}'
);

INSERT OR IGNORE INTO invoices (
  id, branch_id, patient_id, invoice_number, status, currency,
  subtotal_cents, discount_cents, tax_cents, total_cents, balance_cents,
  issued_at, metadata_json
) VALUES (
  'invoice-demo-claim',
  'puncak-alam',
  'patient-demo-claim',
  'DEMO-CLAIM-INV-001',
  'issued',
  'MYR',
  18000,
  0,
  0,
  18000,
  18000,
  '2026-05-01T00:00:00.000Z',
  '{"demo":true}'
);

INSERT OR IGNORE INTO invoice_lines (
  id, invoice_id, branch_id, service_code, description, quantity,
  unit_price_cents, discount_cents, tax_cents, total_cents, metadata_json
) VALUES (
  'invoice-line-demo-claim',
  'invoice-demo-claim',
  'puncak-alam',
  'general-consultation',
  'Demo outpatient consultation',
  1,
  18000,
  0,
  0,
  18000,
  '{"demo":true}'
);
