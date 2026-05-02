"use client";

import { Clock3, MapPin, ShieldCheck, Sparkles } from "lucide-react";
import { branches } from "@usrahmedic/domain";
import { PatientBookingAction } from "../../components/actions";
import { PublicTopbar } from "../../components/chrome";
import { usePatientPageCopy } from "../../components/language";

export default function PatientPage() {
  const copy = usePatientPageCopy();

  return (
    <div className="app-shell patient-page">
      <PublicTopbar active="booking" />
      <main>
        <section className="patient-hero patient-hero-simple patient-hero-compact">
          <div className="patient-hero-copy patient-hero-copy-simple">
            <span className="pill brand-pill">
              <Sparkles size={15} aria-hidden="true" />
              {copy.badge}
            </span>
            <h1>{copy.heroTitle}</h1>
            <p>{copy.heroText}</p>
            <div className="patient-trust-row" aria-label="Booking highlights">
              <span><Clock3 size={17} aria-hidden="true" /> {copy.open24}</span>
              <span><ShieldCheck size={17} aria-hidden="true" /> {copy.requestOnly}</span>
              <span><MapPin size={17} aria-hidden="true" /> {branches.length} {copy.branchCount}</span>
            </div>
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
