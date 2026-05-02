import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = "/mnt/d/PlayRepo/UsrahMedic/apps/platform/src";

function read(relativePath: string) {
  return readFileSync(resolve(root, relativePath), "utf8");
}

describe("public site cleanup", () => {
  it("removes prototype homepage messaging and orphan navigation links", () => {
    const homepage = read("app/page.tsx");
    const language = read("components/language.tsx");

    expect(homepage).not.toContain("Cloudflare Demo");
    expect(homepage).not.toContain("Laman Awam + Sistem Klinik");
    expect(homepage).not.toContain("demo baharu ini");
    expect(homepage).not.toContain("Homepage ini akan menjadi sambungan tema yang sama");

    expect(language).not.toContain('href: "/#sertai-kami"');
    expect(language).not.toContain('href: "/#kerjaya"');
    expect(language).not.toContain('href: "/#doktor"');
    expect(language).not.toContain('href: "/#info-kesihatan"');
  });

  it("turns patient booking into an appointment request instead of fake payment flow", () => {
    const actions = read("components/actions.tsx");
    const patientPage = read("app/patient/page.tsx");
    const language = read("components/language.tsx");

    expect(actions).not.toContain("Deposit RM10");
    expect(actions).not.toContain("FPX online banking");
    expect(actions).not.toContain("eWallet / DuitNow");
    expect(actions).not.toContain('title: "Menghantar tempahan"');
    expect(actions).not.toContain("Nur Aina Binti Abdullah");
    expect(patientPage).not.toContain("Deposit RM10");
    expect(language).not.toContain("RM10");
    expect(language).not.toContain("订金");
    expect(language).not.toContain("前缴");
  });

  it("keeps the patient flow compact and step-based instead of one long admin form", () => {
    const actions = read("components/actions.tsx");
    const patientPage = read("app/patient/page.tsx");

    expect(actions).toContain("const [currentStep, setCurrentStep]");
    expect(actions).not.toContain('className="booking-progress"');
    expect(patientPage).not.toContain("branch-band");
  });
});
