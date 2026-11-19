/**
 * Twin of src/lib/verification.ts — checklist keys must match the DB gate in
 * review_role_application (20261119240000_advocate_kyc_renewal.sql).
 */
import type { ApplicationRole } from "@/lib/onboarding";

export type ChecklistItem = { key: string; label: string; hint: string; required: boolean };

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
      key: "selfie",
      label: "Selfie matches the ID photo",
      hint: "Same person as the National ID / passport; face and ID both clear.",
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

export function checklistFor(
  role: ApplicationRole,
  details?: Record<string, string> | null,
): ChecklistItem[] {
  const items = REVIEW_CHECKLISTS[role];
  if (role === "lawyer" && details?.purpose === "renewal") {
    return items.map((c) => (c.key === "enrolment" ? { ...c, required: false } : c));
  }
  return items;
}

export function checklistComplete(
  role: ApplicationRole,
  checks: Record<string, unknown>,
  details?: Record<string, string> | null,
) {
  return checklistFor(role, details).every((c) => !c.required || checks[c.key] === true);
}
