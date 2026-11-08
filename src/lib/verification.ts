// The checks behind an application review (Admin → Applications). Pure functions, unit-tested
// in __tests__/verification.test.ts. The database enforces the hard rules on its own
// (20261109090000_onboarding_verification_hardening.sql); these explain them to the reviewer
// and catch softer problems early.
import type { ApplicationDocument, ApplicationRole, RoleApplicationRow } from "@/lib/onboarding";
import { REQUIREMENTS } from "@/lib/onboarding";

export type CheckStatus = "pass" | "warn" | "fail";
export type AutoCheck = { key: string; label: string; status: CheckStatus; detail: string };
export type ChecklistItem = { key: string; label: string; hint: string; required: boolean };

/** Who confirms an advocate's enrolment and certificate (judiciary.go.ug, Licensed Advocates). */
export const CHIEF_REGISTRAR = {
  office: "Chief Registrar, Courts of Judicature",
  email: "info@judicature.go.ug",
  phone: "+256 414 233420 (ext. 2069)",
  source: "https://judiciary.go.ug/data/ladvocates/111/1/Licensed%20Advocates.html",
} as const;

/** What a reviewer confirms by hand, per role. Required items gate the Approve button. */
export const REVIEW_CHECKLISTS: Record<ApplicationRole, ChecklistItem[]> = {
  lawyer: [
    {
      key: "identity",
      label: "Identity matches",
      hint: "The name and photo on the ID match the name on the Roll and the certificates.",
      required: true,
    },
    {
      key: "certificate",
      label: "Practising certificate is current",
      hint: "This year's certificate; its number and expiry match what was entered.",
      required: true,
    },
    {
      key: "enrolment",
      label: "Enrolment matches the Roll number",
      hint: "The certificate of enrolment carries the Roll number given.",
      required: true,
    },
    {
      key: "documents_genuine",
      label: "Documents look genuine and legible",
      hint: "No signs of editing; stamps and signatures present.",
      required: true,
    },
    {
      key: "registrar_confirmed",
      label: "Confirmed with the Chief Registrar",
      hint: "Recommended whenever anything looks doubtful.",
      required: false,
    },
  ],
  police: [
    {
      key: "identity",
      label: "Identity matches",
      hint: "The National ID matches the name and photo on the police ID.",
      required: true,
    },
    {
      key: "service_id",
      label: "Police ID is valid",
      hint: "Force number and rank match what was entered.",
      required: true,
    },
    {
      key: "authorisation",
      label: "Authorisation letter is signed",
      hint: "From the officer in charge or commander of the station or unit given.",
      required: true,
    },
    {
      key: "station_confirmed",
      label: "Confirmed with the station",
      hint: "Recommended: call the station on its official line.",
      required: false,
    },
  ],
  judiciary: [
    {
      key: "identity",
      label: "Identity matches",
      hint: "The National ID matches the name and photo on the staff ID.",
      required: true,
    },
    {
      key: "service_id",
      label: "Staff ID is valid",
      hint: "Staff number and position match what was entered.",
      required: true,
    },
    {
      key: "appointment",
      label: "Appointment letter checks out",
      hint: "Issued for the court and position given.",
      required: true,
    },
    {
      key: "court_confirmed",
      label: "Confirmed with the court registry",
      hint: "Recommended: call the court on its official line.",
      required: false,
    },
  ],
};

export function checklistComplete(role: ApplicationRole, checks: Record<string, unknown>) {
  return REVIEW_CHECKLISTS[role].every((c) => !c.required || checks[c.key] === true);
}

const DAY = 86_400_000;
const isoDate = (d: Date) => d.toISOString().slice(0, 10);

/**
 * A practising certificate is renewed every year and expires on 1 March of the following year
 * (Judiciary of Uganda). So the latest plausible expiry is 1 March next year.
 */
export function certificateExpiry(expiry: string | undefined, today: Date): AutoCheck {
  const base = { key: "certificate_expiry", label: "Practising certificate expiry" };
  if (!expiry || !/^\d{4}-\d{2}-\d{2}$/.test(expiry)) {
    return { ...base, status: "fail", detail: "No valid expiry date was entered." };
  }
  const todayIso = isoDate(today);
  const days = Math.round((Date.parse(expiry) - Date.parse(todayIso)) / DAY);
  if (days < 0) {
    return {
      ...base,
      status: "fail",
      detail: `Expired ${-days} day${days === -1 ? "" : "s"} ago.`,
    };
  }
  const latest = `${today.getUTCFullYear() + 1}-03-01`;
  if (expiry > latest) {
    return {
      ...base,
      status: "fail",
      detail: `Later than 1 March ${today.getUTCFullYear() + 1}: certificates don't run that long.`,
    };
  }
  const usual = /-(03-01|02-28|02-29)$/.test(expiry);
  if (days <= 30) {
    return { ...base, status: "warn", detail: `Expires in ${days} day${days === 1 ? "" : "s"}.` };
  }
  return usual
    ? { ...base, status: "pass", detail: `Valid for ${days} more days.` }
    : {
        ...base,
        status: "warn",
        detail: `Valid for ${days} more days, but certificates normally expire on 1 March — check the certificate.`,
      };
}

const normalise = (v: string | undefined) => (v ?? "").replace(/\s+/g, "").toLowerCase();

/** Ugandan numbers: +256 or 0, then 9 digits (spaces and dashes allowed). */
export const isUgandanPhone = (v: string | undefined) =>
  /^(\+?256|0)\d{9}$/.test((v ?? "").replace(/[\s-]/g, ""));

export function runAutomaticChecks(input: {
  app: RoleApplicationRow;
  documents: ApplicationDocument[];
  /** Every application the reviewer can see, to spot reused numbers. */
  applications: RoleApplicationRow[];
  /** Directory listings, to spot a Roll number already in use. */
  listings: { user_id: string | null; bar_number: string | null; verified: boolean }[];
  email: string | null;
  today: Date;
}): AutoCheck[] {
  const { app, documents, applications, listings, email, today } = input;
  const req = REQUIREMENTS[app.role];
  const checks: AutoCheck[] = [];

  const missingFields = req.fields.filter((f) => !f.optional && !app.details[f.key]?.trim());
  checks.push({
    key: "fields",
    label: "Required details",
    status: missingFields.length ? "fail" : "pass",
    detail: missingFields.length
      ? `Missing: ${missingFields.map((f) => f.label).join(", ")}.`
      : `All ${req.fields.filter((f) => !f.optional).length} provided.`,
  });

  const missingDocs = req.documents.filter((d) => !documents.some((x) => x.kind === d.kind));
  checks.push({
    key: "documents",
    label: "Required documents",
    status: missingDocs.length ? "fail" : "pass",
    detail: missingDocs.length
      ? `Missing: ${missingDocs.map((d) => d.label).join(", ")}.`
      : `${documents.length} file${documents.length === 1 ? "" : "s"} uploaded.`,
  });

  if (app.role === "lawyer") {
    checks.push(certificateExpiry(app.details.practising_certificate_expiry, today));

    const roll = normalise(app.details.roll_number);
    const listed = roll
      ? listings.find(
          (l) => l.verified && l.user_id !== app.user_id && normalise(l.bar_number ?? "") === roll,
        )
      : undefined;
    const otherApps = roll
      ? applications.filter(
          (a) =>
            a.id !== app.id &&
            a.user_id !== app.user_id &&
            a.role === "lawyer" &&
            a.status !== "rejected" &&
            normalise(a.details.roll_number) === roll,
        )
      : [];
    checks.push({
      key: "roll_unique",
      label: "Roll number not already in use",
      status: listed ? "fail" : otherApps.length ? "warn" : "pass",
      detail: listed
        ? "A verified advocate in the directory already holds this Roll number."
        : otherApps.length
          ? `${otherApps.length} other application${otherApps.length === 1 ? " uses" : "s use"} this Roll number.`
          : "No other advocate or application uses it.",
    });

    const cert = normalise(app.details.practising_certificate_number);
    const certReused =
      cert &&
      applications.some(
        (a) =>
          a.id !== app.id &&
          a.user_id !== app.user_id &&
          normalise(a.details.practising_certificate_number) === cert,
      );
    checks.push({
      key: "certificate_unique",
      label: "Certificate number not reused",
      status: certReused ? "fail" : "pass",
      detail: certReused
        ? "Another applicant entered the same practising certificate number."
        : "Unique among applications.",
    });
  }

  checks.push({
    key: "phone",
    label: "Phone number",
    status: isUgandanPhone(app.details.phone) ? "pass" : "warn",
    detail: isUgandanPhone(app.details.phone)
      ? "A Ugandan number."
      : "Not a Ugandan number (+256 or 07…). Check before calling.",
  });

  checks.push({
    key: "email",
    label: "Account email",
    status: email ? "pass" : "warn",
    detail: email ?? "No email on the account.",
  });

  const name = normalise(app.details.full_name);
  const sameName = applications.filter(
    (a) => a.user_id !== app.user_id && name && normalise(a.details.full_name) === name,
  );
  if (sameName.length) {
    checks.push({
      key: "name_duplicate",
      label: "Same name on another account",
      status: "warn",
      detail: `${sameName.length} other account${sameName.length === 1 ? "" : "s"} applied under this name — make sure it isn't the same person twice.`,
    });
  }

  return checks;
}

/** Overall verdict for the list view: the worst status among the checks. */
export function worstStatus(checks: AutoCheck[]): CheckStatus {
  if (checks.some((c) => c.status === "fail")) return "fail";
  if (checks.some((c) => c.status === "warn")) return "warn";
  return "pass";
}
