/** Presentation-only placeholders shown when a signed-in workspace has no live rows yet. */

export const DEMO_DOCUMENTS = [
  {
    id: "demo-doc-1",
    name: "Retainer agreement (demo).pdf",
    category: "contracts",
    size_bytes: 48_000,
    created_at: "2026-08-20T09:15:00.000Z",
    href: "/docs/demo/retainer-agreement-demo.pdf",
  },
  {
    id: "demo-doc-2",
    name: "National ID copy (demo).pdf",
    category: "identity",
    size_bytes: 32_000,
    created_at: "2026-08-18T14:40:00.000Z",
    href: "/docs/demo/national-id-copy-demo.pdf",
  },
  {
    id: "demo-doc-3",
    name: "Hearing notice — HC/CIV/104 (demo).pdf",
    category: "court",
    size_bytes: 41_000,
    created_at: "2026-08-22T11:05:00.000Z",
    href: "/docs/demo/hearing-notice-demo.pdf",
  },
  {
    id: "demo-doc-4",
    name: "Supporting affidavit (demo).pdf",
    category: "evidence",
    size_bytes: 55_000,
    created_at: "2026-08-23T16:20:00.000Z",
    href: "/docs/demo/affidavit-demo.pdf",
  },
] as const;

export const DEMO_CASES = [
  {
    id: "demo-case-1",
    title: "Nabirye v. Metro Estates — rent dispute",
    case_number: "HC/CIV/104/26",
    status: "active",
    court: "High Court of Uganda — Civil Division",
    updated_at: "2026-08-24T10:00:00.000Z",
  },
  {
    id: "demo-case-2",
    title: "Okello Trading — contract claim",
    case_number: "SCC/KLA/55/26",
    status: "hearing",
    court: "Small Claims Court — Kampala",
    updated_at: "2026-08-21T08:30:00.000Z",
  },
] as const;

export const DEMO_APPOINTMENTS = [
  {
    id: "demo-appt-1",
    title: "Consultation with Nabirye Kato",
    scheduled_at: "2026-08-28T10:00:00.000Z",
    mode: "in-person",
    status: "confirmed",
  },
  {
    id: "demo-appt-2",
    title: "Case review — HC/CIV/104/26",
    scheduled_at: "2026-09-02T15:30:00.000Z",
    mode: "video",
    status: "pending",
  },
] as const;
