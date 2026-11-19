import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  ApplicationRole,
  ApplicationStatus,
  RoleApplicationDocumentRow,
  RoleApplicationRow,
} from "@/integrations/supabase/app-database";

// Professional onboarding (supabase/migrations/20261005090000_professional_onboarding.sql). An
// advocate, police or judiciary account is switched on only when an administrator approves an
// application with these details and documents. The database checks the same required lists in
// submit_role_application(); the app's copy is apps/mobile/src/lib/onboarding.ts. Change all
// three together.

export type { ApplicationRole, ApplicationStatus, RoleApplicationRow, RoleApplicationDocumentRow };
export type ApplicationDocument = RoleApplicationDocumentRow;

export interface RequirementField {
  key: string;
  label: string;
  placeholder?: string;
  hint?: string;
  kind?: "text" | "date" | "phone";
  optional?: boolean;
}
export interface RequirementDocument {
  kind: string;
  label: string;
  hint: string;
}
export interface Requirements {
  noun: string;
  title: string;
  intro: string;
  fields: RequirementField[];
  documents: RequirementDocument[];
}

const NATIONAL_ID: RequirementDocument = {
  kind: "national_id",
  label: "National ID or passport",
  hint: "Both sides of a National ID, or the photo page of a passport.",
};

/** Fresh PC + selfie pack when an approved advocate renews after expiry / near-expiry. */
export const LAWYER_RENEWAL_REQUIREMENTS: Pick<Requirements, "fields" | "documents"> = {
  fields: [
    {
      key: "national_id_number",
      label: "National ID (NIN) or passport number",
      placeholder: "e.g. CM90… or passport number",
    },
    { key: "practising_certificate_number", label: "Practising certificate number" },
    {
      key: "practising_certificate_expiry",
      label: "Practising certificate expires",
      kind: "date",
      hint: "Certificates are renewed every year and expire on 1 March.",
    },
  ],
  documents: [
    {
      kind: "practising_certificate",
      label: "Current practising certificate",
      hint: "This year's certificate.",
    },
    {
      kind: "selfie",
      label: "Selfie holding your ID",
      hint: "A clear live photo of your face while holding your National ID or passport.",
    },
  ],
};

export const REQUIREMENTS: Record<ApplicationRole, Requirements> = {
  lawyer: {
    noun: "advocate",
    title: "Advocate application",
    intro:
      "Legal right to practise: a current practising certificate, enrolment on the Roll of Advocates, a government ID, and a selfie. An administrator checks them before your advocate workspace and verified listing are switched on.",
    fields: [
      { key: "full_name", label: "Full name, as on the Roll", placeholder: "e.g. Amina Nakato" },
      { key: "roll_number", label: "Roll of Advocates number", placeholder: "Enrolment number" },
      { key: "practising_certificate_number", label: "Practising certificate number" },
      {
        key: "practising_certificate_expiry",
        label: "Practising certificate expires",
        kind: "date",
        hint: "Certificates are renewed every year and expire on 1 March.",
      },
      {
        key: "national_id_number",
        label: "National ID (NIN) or passport number",
        placeholder: "e.g. CM90… or passport number",
        hint: "Used only for identity review; deleted with your account.",
      },
      { key: "firm", label: "Law firm or chambers", placeholder: "Or “Sole practitioner”" },
      { key: "district", label: "District you practise in", placeholder: "e.g. Kampala" },
      {
        key: "phone",
        label: "Phone number",
        kind: "phone",
        placeholder: "+256…",
        hint: "Shown on your public listing once approved, so clients can reach you.",
      },
      {
        key: "practice_areas",
        label: "Practice areas",
        placeholder: "e.g. Land Law, Family Law",
        hint: "Separate them with commas.",
        optional: true,
      },
    ],
    documents: [
      {
        kind: "practising_certificate",
        label: "Current practising certificate",
        hint: "The certificate for this year.",
      },
      {
        kind: "enrolment_certificate",
        label: "Certificate of enrolment",
        hint: "Your enrolment on the Roll of Advocates.",
      },
      {
        kind: "national_id",
        label: "National ID (front) or passport photo page",
        hint: "Front of a National ID, or the photo page of a passport.",
      },
      {
        kind: "national_id_back",
        label: "National ID (back)",
        hint: "Back of the National ID. For a passport, upload the photo page again.",
      },
      {
        kind: "selfie",
        label: "Selfie holding your ID",
        hint: "A clear live photo of your face while holding your National ID or passport. Prefer the camera on a phone.",
      },
    ],
  },
  police: {
    noun: "police",
    title: "Police officer application",
    intro:
      "The police workspace handles incident reports from the public, so it is open only to serving officers authorised by their station or unit. An administrator checks your documents before it is switched on.",
    fields: [
      { key: "full_name", label: "Full name" },
      { key: "force_number", label: "Force number" },
      { key: "rank", label: "Rank", placeholder: "e.g. Inspector" },
      { key: "station", label: "Station or unit", placeholder: "e.g. Central Police Station" },
      { key: "district", label: "District", placeholder: "e.g. Kampala" },
      { key: "phone", label: "Official phone number", kind: "phone", placeholder: "+256…" },
    ],
    documents: [
      { kind: "police_id", label: "Police identity card", hint: "Both sides." },
      {
        kind: "authorisation_letter",
        label: "Letter of authorisation",
        hint: "From your officer in charge or commander, authorising you to use LegalFinder for your station or unit.",
      },
      NATIONAL_ID,
    ],
  },
  judiciary: {
    noun: "judiciary",
    title: "Judiciary application",
    intro:
      "The judiciary workspace is open only to judicial officers and court staff. An administrator checks your documents before it is switched on.",
    fields: [
      { key: "full_name", label: "Full name" },
      {
        key: "position",
        label: "Position",
        placeholder: "e.g. Magistrate Grade I, Registrar, Court clerk",
      },
      {
        key: "court",
        label: "Court or station",
        placeholder: "e.g. Mengo Chief Magistrate's Court",
      },
      { key: "staff_number", label: "Staff (PF) number" },
      { key: "phone", label: "Official phone number", kind: "phone", placeholder: "+256…" },
    ],
    documents: [
      { kind: "staff_id", label: "Judiciary staff identity card", hint: "Both sides." },
      {
        kind: "appointment_letter",
        label: "Letter of appointment or posting",
        hint: "Showing your position and court.",
      },
      NATIONAL_ID,
    ],
  },
};

export const APPLICATION_ROLES: ApplicationRole[] = ["lawyer", "police", "judiciary"];

export function isApplicationRole(value: unknown): value is ApplicationRole {
  return typeof value === "string" && (APPLICATION_ROLES as string[]).includes(value);
}

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  draft: "Not sent yet",
  submitted: "Waiting for review",
  changes_requested: "Changes requested",
  approved: "Approved",
  rejected: "Not approved",
};

export const editable = (status: ApplicationStatus) =>
  status === "draft" || status === "changes_requested";

export function isRenewalApplication(details: Record<string, string> | null | undefined): boolean {
  return details?.purpose === "renewal";
}

/** Fields/docs required for this application — renewal uses the lighter PC + selfie pack. */
export function requirementsFor(
  role: ApplicationRole,
  details?: Record<string, string> | null,
): Pick<Requirements, "fields" | "documents"> {
  if (role === "lawyer" && isRenewalApplication(details ?? undefined)) {
    return LAWYER_RENEWAL_REQUIREMENTS;
  }
  return REQUIREMENTS[role];
}

/** What is still missing before the application can be sent — the database checks the same. */
export function missingItems(
  role: ApplicationRole,
  details: Record<string, string>,
  documents: ApplicationDocument[],
): string[] {
  const req = requirementsFor(role, details);
  return [
    ...req.fields.filter((f) => !f.optional && !details[f.key]?.trim()).map((f) => f.label),
    ...req.documents
      .filter((d) => !documents.some((doc) => doc.kind === d.kind))
      .map((d) => d.label),
  ];
}

// ---------- queries ----------

export const myApplicationsQuery = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["my-applications", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("role_applications")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as RoleApplicationRow[];
    },
  });

export const applicationDocumentsQuery = (applicationId: string | undefined) =>
  queryOptions({
    queryKey: ["application-documents", applicationId],
    enabled: Boolean(applicationId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("role_application_documents")
        .select("*")
        .eq("application_id", applicationId!)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as ApplicationDocument[];
    },
  });

/** Administrators: applications in the given states, oldest sent first. */
export const applicationsQuery = (statuses: ApplicationStatus[]) =>
  queryOptions({
    queryKey: ["admin-applications", statuses.join(",")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("role_applications")
        .select("*")
        .in("status", statuses)
        .order("submitted_at", { ascending: true, nullsFirst: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as RoleApplicationRow[];
    },
  });

// ---------- applicant ----------

export async function startApplication(
  userId: string,
  role: ApplicationRole,
  details: Record<string, string>,
): Promise<RoleApplicationRow> {
  const { data, error } = await supabase
    .from("role_applications")
    .insert({ user_id: userId, role, details })
    .select()
    .single();
  if (error) throw new Error(error.message);
  // Remember the choice, as sign-up does, so the dashboard keeps leading back here.
  await supabase.from("profiles").update({ requested_role: role }).eq("id", userId);
  return data as RoleApplicationRow;
}

export async function saveApplication(id: string, details: Record<string, string>) {
  const { error } = await supabase.from("role_applications").update({ details }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function submitApplication(id: string): Promise<RoleApplicationRow> {
  // Vendor hook (noop today). Runs after docs are on disk; never blocks submit while skipped.
  try {
    const { data: app } = await supabase
      .from("role_applications")
      .select("user_id, details")
      .eq("id", id)
      .maybeSingle();
    const { data: docs } = await supabase
      .from("role_application_documents")
      .select("kind, storage_path")
      .eq("application_id", id);
    const details = (app?.details ?? {}) as Record<string, string>;
    const selfie = docs?.find((d) => d.kind === "selfie");
    const idDoc = docs?.find((d) => d.kind === "national_id");
    if (app?.user_id && details.national_id_number && selfie && idDoc) {
      const { getKycProvider } = await import("@/lib/kyc/provider");
      await getKycProvider().verifyIdentity({
        userId: app.user_id,
        nationalId: details.national_id_number,
        selfiePath: selfie.storage_path,
        idDocPath: idDoc.storage_path,
      });
    }
  } catch {
    // Vendor failures must not strand an in-house application; admin review remains the gate.
  }

  const { data, error } = await supabase.rpc("submit_role_application", { _application_id: id });
  if (error) throw new Error(error.message);
  return data as RoleApplicationRow;
}

/** Opens (or resets) a practising-certificate renewal draft for the signed-in advocate. */
export async function startAdvocateKycRenewal(): Promise<RoleApplicationRow> {
  const { data, error } = await supabase.rpc("start_advocate_kyc_renewal");
  if (error) throw new Error(error.message);
  return data as RoleApplicationRow;
}

/** Gives up a draft and stays a client. */
export async function withdrawApplication(userId: string, application: RoleApplicationRow | null) {
  if (application?.status === "draft") {
    const { data: docs } = await supabase
      .from("role_application_documents")
      .select("storage_path")
      .eq("application_id", application.id);
    if (docs?.length) await supabase.storage.from(BUCKET).remove(docs.map((d) => d.storage_path));
    const { error } = await supabase.from("role_applications").delete().eq("id", application.id);
    if (error) throw new Error(error.message);
  }
  const { error } = await supabase
    .from("profiles")
    .update({ requested_role: null })
    .eq("id", userId);
  if (error) throw new Error(error.message);
}

// ---------- documents ----------

const BUCKET = "onboarding";
const MAX_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_DOCUMENT_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

export async function addApplicationDocument(input: {
  userId: string;
  applicationId: string;
  kind: string;
  file: File;
}): Promise<ApplicationDocument> {
  const { file } = input;
  if (!ACCEPTED_DOCUMENT_TYPES.includes(file.type))
    throw new Error("Choose a PDF or a photo (JPEG, PNG or WebP).");
  if (file.size > MAX_BYTES) throw new Error("That file is larger than 10 MB.");
  const safeName = file.name.replace(/[^\w.-]+/g, "_").slice(-80);
  const storagePath = `${input.userId}/${input.applicationId}/${Date.now()}-${safeName}`;
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, { upsert: false, contentType: file.type });
  if (uploadError) throw new Error(uploadError.message || "Upload failed");

  const { data, error } = await supabase
    .from("role_application_documents")
    .insert({
      application_id: input.applicationId,
      user_id: input.userId,
      kind: input.kind,
      name: file.name.slice(0, 200),
      storage_path: storagePath,
      mime_type: file.type,
      size_bytes: file.size,
    })
    .select()
    .single();
  if (error) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    throw new Error(error.message);
  }
  return data as ApplicationDocument;
}

export async function removeApplicationDocument(doc: ApplicationDocument) {
  const { error: storageError } = await supabase.storage.from(BUCKET).remove([doc.storage_path]);
  if (storageError) throw new Error(storageError.message);
  const { error } = await supabase.from("role_application_documents").delete().eq("id", doc.id);
  if (error) throw new Error(error.message);
}

/** Identity documents: the link lasts two minutes. */
/** A short-lived link to one of an application's files (private bucket). */
export async function signedDocumentUrl(doc: ApplicationDocument, seconds = 120) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(doc.storage_path, seconds);
  if (error || !data?.signedUrl) throw new Error(error?.message ?? "Couldn't open the document.");
  return data.signedUrl;
}

/**
 * Opens a file in a new tab. The tab is opened inside the click, before the signed URL is
 * fetched, so popup blockers (Safari especially) don't swallow it.
 */
export async function openApplicationDocument(doc: ApplicationDocument) {
  const tab = window.open("about:blank", "_blank");
  try {
    const url = await signedDocumentUrl(doc);
    if (tab) {
      tab.opener = null;
      tab.location.href = url;
    } else window.location.assign(url);
  } catch (error) {
    tab?.close();
    throw error;
  }
}

// ---------- administrators ----------

export async function reviewApplication(
  id: string,
  decision: "approve" | "changes" | "reject",
  note?: string,
): Promise<RoleApplicationRow> {
  const { data, error } = await supabase.rpc("review_role_application", {
    _application_id: id,
    _decision: decision,
    _note: note?.trim() || undefined,
  });
  if (error) throw new Error(error.message);
  return data as RoleApplicationRow;
}

/** Saves the reviewer's checklist while the application waits for review. */
export async function recordApplicationChecks(
  id: string,
  checks: Record<string, boolean>,
): Promise<RoleApplicationRow> {
  const { data, error } = await supabase.rpc("record_application_checks", {
    _application_id: id,
    _checks: checks,
  });
  if (error) throw new Error(error.message);
  return data as RoleApplicationRow;
}

/** Administrators: every application, for counts and duplicate checks. */
export const allApplicationsQuery = queryOptions({
  queryKey: ["admin-applications", "all"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("role_applications")
      .select("*")
      .order("submitted_at", { ascending: true, nullsFirst: false })
      .limit(1000);
    if (error) throw error;
    return (data ?? []) as RoleApplicationRow[];
  },
});
