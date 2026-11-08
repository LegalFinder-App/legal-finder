import { describe, expect, it } from "vitest";
import type { ApplicationDocument, RoleApplicationRow } from "@/lib/onboarding";
import {
  certificateExpiry,
  checklistComplete,
  isUgandanPhone,
  runAutomaticChecks,
  worstStatus,
} from "@/lib/verification";

const today = new Date("2026-11-09T10:00:00Z");

const app = (over: Partial<RoleApplicationRow> = {}): RoleApplicationRow => ({
  id: "a1",
  user_id: "user_1",
  role: "lawyer",
  status: "submitted",
  details: {
    full_name: "Amina Nakato",
    roll_number: "UG 1234",
    practising_certificate_number: "PC-77",
    practising_certificate_expiry: "2027-03-01",
    firm: "Nakato & Co",
    district: "Kampala",
    phone: "+256 772 123456",
  },
  review_note: null,
  submitted_at: "2026-11-08T08:00:00Z",
  reviewed_by: null,
  reviewed_at: null,
  review_checks: {},
  created_at: "2026-11-08T07:00:00Z",
  updated_at: "2026-11-08T08:00:00Z",
  ...over,
});

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

const allDocs = docs(["practising_certificate", "enrolment_certificate", "national_id"]);
const byKey = (checks: ReturnType<typeof runAutomaticChecks>, key: string) =>
  checks.find((c) => c.key === key);

describe("practising certificate expiry (expires 1 March of the following year)", () => {
  it("passes a certificate running to next 1 March", () => {
    expect(certificateExpiry("2027-03-01", today).status).toBe("pass");
  });
  it("fails an expired certificate", () => {
    const c = certificateExpiry("2026-03-01", today);
    expect(c.status).toBe("fail");
    expect(c.detail).toMatch(/Expired 253 days ago/);
  });
  it("fails a date beyond 1 March next year", () => {
    expect(certificateExpiry("2028-03-01", today).status).toBe("fail");
  });
  it("warns when it expires within 30 days", () => {
    expect(certificateExpiry("2026-11-20", today).status).toBe("warn");
  });
  it("warns on an unusual expiry day", () => {
    expect(certificateExpiry("2027-01-15", today).status).toBe("warn");
  });
  it("fails a missing or malformed date", () => {
    expect(certificateExpiry(undefined, today).status).toBe("fail");
    expect(certificateExpiry("01/03/2027", today).status).toBe("fail");
  });
});

describe("automatic checks", () => {
  const base = { applications: [], listings: [], email: "amina@example.com", today };

  it("passes a complete, unique application", () => {
    const checks = runAutomaticChecks({ ...base, app: app(), documents: allDocs });
    expect(worstStatus(checks)).toBe("pass");
  });

  it("flags missing documents and details", () => {
    const a = app({ details: { ...app().details, firm: "" } });
    const checks = runAutomaticChecks({ ...base, app: a, documents: docs(["national_id"]) });
    expect(byKey(checks, "fields")?.status).toBe("fail");
    expect(byKey(checks, "documents")?.detail).toMatch(/Current practising certificate/);
  });

  it("fails a Roll number a verified listing already holds, ignoring spaces and case", () => {
    const checks = runAutomaticChecks({
      ...base,
      app: app(),
      documents: allDocs,
      listings: [{ user_id: "user_2", bar_number: "ug1234", verified: true }],
    });
    expect(byKey(checks, "roll_unique")?.status).toBe("fail");
  });

  it("ignores the applicant's own listing and unverified ones", () => {
    const checks = runAutomaticChecks({
      ...base,
      app: app(),
      documents: allDocs,
      listings: [
        { user_id: "user_1", bar_number: "UG 1234", verified: true },
        { user_id: "user_3", bar_number: "UG 1234", verified: false },
      ],
    });
    expect(byKey(checks, "roll_unique")?.status).toBe("pass");
  });

  it("warns when another application uses the same Roll number, fails on a reused certificate", () => {
    const other = app({
      id: "a2",
      user_id: "user_9",
      details: { ...app().details, full_name: "Someone Else" },
    });
    const checks = runAutomaticChecks({
      ...base,
      app: app(),
      documents: allDocs,
      applications: [other],
    });
    expect(byKey(checks, "roll_unique")?.status).toBe("warn");
    expect(byKey(checks, "certificate_unique")?.status).toBe("fail");
  });

  it("warns on the same name from another account", () => {
    const other = app({
      id: "a3",
      user_id: "user_8",
      details: { full_name: "amina  nakato", roll_number: "X9" },
    });
    const checks = runAutomaticChecks({
      ...base,
      app: app(),
      documents: allDocs,
      applications: [other],
    });
    expect(byKey(checks, "name_duplicate")?.status).toBe("warn");
  });

  it("only runs advocate checks for advocates", () => {
    const police = app({
      role: "police",
      details: {
        full_name: "Okello",
        force_number: "1",
        rank: "Inspector",
        station: "CPS",
        district: "Kampala",
        phone: "0772123456",
      },
    });
    const checks = runAutomaticChecks({
      ...base,
      app: police,
      documents: docs(["police_id", "authorisation_letter", "national_id"]),
    });
    expect(byKey(checks, "certificate_expiry")).toBeUndefined();
    expect(worstStatus(checks)).toBe("pass");
  });
});

describe("helpers", () => {
  it("recognises Ugandan phone numbers", () => {
    expect(isUgandanPhone("+256 772 123456")).toBe(true);
    expect(isUgandanPhone("0772-123-456")).toBe(true);
    expect(isUgandanPhone("+254 712 345678")).toBe(false);
    expect(isUgandanPhone("")).toBe(false);
  });
  it("requires every required checklist item before approval", () => {
    expect(
      checklistComplete("lawyer", {
        identity: true,
        certificate: true,
        enrolment: true,
        documents_genuine: true,
      }),
    ).toBe(true);
    expect(checklistComplete("lawyer", { identity: true, certificate: true })).toBe(false);
  });
});
