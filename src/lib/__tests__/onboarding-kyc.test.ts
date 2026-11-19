import { describe, expect, it } from "vitest";
import {
  LAWYER_RENEWAL_REQUIREMENTS,
  REQUIREMENTS,
  isRenewalApplication,
  missingItems,
  requirementsFor,
  type ApplicationDocument,
} from "@/lib/onboarding";
import { checklistComplete, checklistFor } from "@/lib/verification";

const docs = (kinds: string[]): ApplicationDocument[] =>
  kinds.map((kind, i) => ({
    id: `d${i}`,
    application_id: "a1",
    user_id: "user_1",
    kind,
    name: `${kind}.pdf`,
    storage_path: `user_1/a1/${kind}.pdf`,
    mime_type: "application/pdf",
    size_bytes: 1000,
    created_at: "2026-11-08T07:30:00Z",
  }));

describe("advocate KYC requirements", () => {
  it("requires NIN, ID back and selfie for a first-time advocate", () => {
    const kinds = REQUIREMENTS.lawyer.documents.map((d) => d.kind);
    expect(kinds).toContain("national_id_back");
    expect(kinds).toContain("selfie");
    expect(REQUIREMENTS.lawyer.fields.some((f) => f.key === "national_id_number")).toBe(true);

    const missing = missingItems(
      "lawyer",
      {
        full_name: "Amina",
        roll_number: "1",
        practising_certificate_number: "PC",
        practising_certificate_expiry: "2027-03-01",
        firm: "Firm",
        district: "Kampala",
        phone: "+256772123456",
      },
      docs(["practising_certificate", "enrolment_certificate", "national_id"]),
    );
    expect(missing).toEqual(
      expect.arrayContaining([
        "National ID (NIN) or passport number",
        "National ID (back)",
        "Selfie holding your ID",
      ]),
    );
  });

  it("uses the lighter pack for purpose=renewal", () => {
    expect(isRenewalApplication({ purpose: "renewal" })).toBe(true);
    const req = requirementsFor("lawyer", { purpose: "renewal" });
    expect(req.documents.map((d) => d.kind)).toEqual(
      LAWYER_RENEWAL_REQUIREMENTS.documents.map((d) => d.kind),
    );
    const missing = missingItems(
      "lawyer",
      {
        purpose: "renewal",
        national_id_number: "CM90",
        practising_certificate_number: "PC-2",
        practising_certificate_expiry: "2028-03-01",
      },
      docs(["practising_certificate"]),
    );
    expect(missing).toEqual(["Selfie holding your ID"]);
  });

  it("makes enrolment optional on the renewal checklist", () => {
    const items = checklistFor("lawyer", { purpose: "renewal" });
    expect(items.find((c) => c.key === "enrolment")?.required).toBe(false);
    expect(
      checklistComplete(
        "lawyer",
        {
          identity: true,
          certificate: true,
          documents_genuine: true,
          selfie: true,
        },
        { purpose: "renewal" },
      ),
    ).toBe(true);
  });
});
