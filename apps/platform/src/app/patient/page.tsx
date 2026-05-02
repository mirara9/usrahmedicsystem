"use client";

import { Sparkles } from "lucide-react";
import { PatientBookingAction } from "../../components/actions";
import { PublicTopbar } from "../../components/chrome";
import { usePatientPageCopy } from "../../components/language";

export default function PatientPage() {
  const copy = usePatientPageCopy();

  return (
    <div className="app-shell patient-page">
      <PublicTopbar active="booking" compact />
      <main>
        <section className="patient-hero patient-hero-simple patient-hero-compact">
          <div className="patient-hero-copy patient-hero-copy-simple">
            <span className="pill brand-pill">
              <Sparkles size={15} aria-hidden="true" />
              {copy.badge}
            </span>
            <h1>{copy.heroTitle}</h1>
            <p>{copy.heroText}</p>
          </div>
        </section>

        <section className="patient-request-shell patient-request-shell-compact">
          <div className="patient-request-grid">
            <PatientBookingAction />
          </div>
        </section>

      </main>
    </div>
  );
}
