// The demo accounts that App Store and Google Play reviewers sign in with.
//
//   node scripts/reviewer-accounts.mjs          create or refresh both accounts and their sample data
//   node scripts/reviewer-accounts.mjs codes    only issue fresh backup codes (before each submission)
//   node scripts/reviewer-accounts.mjs status   show what exists, without changing anything
//   node scripts/reviewer-accounts.mjs verify   sign in to both, as the app does, to prove they work
//   node scripts/reviewer-accounts.mjs remove   delete the accounts and everything they own
//
// Why they exist: the production Clerk instance requires two-step verification for everyone, and
// a reviewer has no authenticator for an account we hand them. Each account therefore gets a set
// of single-use backup codes, which the app's sign-in accepts ("Use a backup code instead").
//
// The sign-in details are written to store-listing/reviewer-credentials.local — git-ignored
// (*.local) and outside apps/mobile, so neither git nor an EAS upload picks it up. Nothing secret
// is printed.
//
// Two accounts: a client, which is what a reviewer needs, and a demo advocate, who is the other
// side of the client's sample matter and messages (and lets a reviewer see the advocate
// workspace if they ask). The advocate's directory listing is left unverified, so the public
// never sees it. No payments are seeded: they would show up as money owed in the payouts panel.
//
// Everything goes through the APIs the product itself uses: Clerk's Backend API for the accounts,
// Clerk's native-client Frontend API for two-step setup (no browser needed), the live site for
// the sample PDFs, and the service-role key for the rows. Reads the repo's .env.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CREDENTIALS = path.join(ROOT, "store-listing", "reviewer-credentials.local");

const env = Object.fromEntries(
  fs
    .readFileSync(path.join(ROOT, ".env"), "utf8")
    .split(/\r?\n/)
    .filter((line) => /^[A-Za-z_][A-Za-z0-9_]*=/.test(line))
    .map((line) => {
      const i = line.indexOf("=");
      return [
        line.slice(0, i),
        line
          .slice(i + 1)
          .trim()
          .replace(/^["']|["']$/g, ""),
      ];
    }),
);
for (const key of ["CLERK_SECRET_KEY", "VITE_CLERK_PUBLISHABLE_KEY", "SUPABASE_SERVICE_ROLE_KEY"]) {
  if (!env[key]) throw new Error(`${key} is missing from .env`);
}
const SUPABASE = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const SITE = (process.env.REVIEWER_SITE_URL || "https://www.legalfinder.co").replace(/\/$/, "");
// A publishable key is "pk_live_" + base64("<frontend api host>$").
const FAPI =
  "https://" +
  Buffer.from(env.VITE_CLERK_PUBLISHABLE_KEY.split("_")[2], "base64")
    .toString("utf8")
    .replace(/\$$/, "");

const ACCOUNTS = {
  client: {
    email: process.env.REVIEWER_CLIENT_EMAIL || "appreview@legalfinder.co",
    firstName: "Grace",
    lastName: "Akello",
  },
  advocate: {
    email: process.env.REVIEWER_ADVOCATE_EMAIL || "appreview-advocate@legalfinder.co",
    firstName: "James",
    lastName: "Okello",
  },
};
const fullName = (account) => `${account.firstName} ${account.lastName}`;

// ---------------------------------------------------------------------------------- plumbing

async function clerk(pathname, init = {}) {
  const res = await fetch(`https://api.clerk.com/v1${pathname}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.CLERK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

async function db(pathname, init = {}) {
  const res = await fetch(`${SUPABASE}/rest/v1${pathname}`, {
    ...init,
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text.slice(0, 200);
  }
  return { status: res.status, body };
}
/** Throws with the table and the database's own message; returns the rows. */
function rows(result, what) {
  if (result.status >= 300) {
    throw new Error(
      `${what} failed (${result.status}): ${JSON.stringify(result.body).slice(0, 200)}`,
    );
  }
  return result.body ?? [];
}

async function storage(pathname, init = {}) {
  return fetch(`${SUPABASE}/storage/v1${pathname}`, {
    ...init,
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
  });
}

function totp(secret) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const ch of secret.replace(/=+$/, "").toUpperCase()) {
    bits += alphabet.indexOf(ch).toString(2).padStart(5, "0");
  }
  const key = Buffer.from(bits.match(/.{8}/g).map((b) => parseInt(b, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const hmac = crypto.createHmac("sha1", key).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  return String((hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).padStart(6, "0");
}

/** Four groups a reviewer can type from a screen: no 0/O, 1/l/I, and always upper+lower+digit. */
function newPassword() {
  const sets = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnpqrstuvwxyz", "23456789"];
  const all = sets.join("");
  const pick = (chars) => chars[crypto.randomInt(chars.length)];
  const group = () =>
    [pick(sets[0]), pick(sets[1]), pick(sets[2]), pick(all)]
      .sort(() => crypto.randomInt(3) - 1)
      .join("");
  return [group(), group(), group(), group()].join("-");
}

// ---------------------------------------------------------------------------------- accounts

async function findUser(email) {
  const found = await clerk(`/users?email_address=${encodeURIComponent(email)}`);
  if (found.status >= 300) throw new Error(`Clerk user lookup failed (${found.status})`);
  return found.body[0] ?? null;
}

/** Creates the Clerk user, or gives an existing one the password this run will write down. */
async function ensureUser(account, password) {
  const existing = await findUser(account.email);
  const details = { first_name: account.firstName, last_name: account.lastName, password };
  // Set when the account is created; Clerk only accepts metadata on an update through its own
  // endpoint, and it doesn't change between runs.
  const metadata = {
    // The profile row takes its name from here (provisioning.server.ts).
    unsafe_metadata: { full_name: fullName(account) },
    public_metadata: { demo: true, purpose: "app store review" },
  };
  const result = existing
    ? await clerk(`/users/${existing.id}`, {
        method: "PATCH",
        body: JSON.stringify({ ...details, sign_out_of_other_sessions: true }),
      })
    : await clerk("/users", {
        method: "POST",
        body: JSON.stringify({
          ...details,
          ...metadata,
          email_address: [account.email],
          legal_accepted_at: new Date().toISOString(),
        }),
      });
  if (result.status >= 300) {
    const reason = result.body?.errors?.[0]?.long_message ?? result.body?.errors?.[0]?.message;
    throw new Error(`Clerk refused the account ${account.email} (${result.status}): ${reason}`);
  }
  return { id: result.body.id, created: !existing };
}

/**
 * A Clerk native-client conversation, as the phone app has one: no cookies, and Clerk hands the
 * client token back in the Authorization response header of each call.
 */
function nativeClient() {
  let client = null;
  return async (method, pathname, form) => {
    const url = new URL(FAPI + pathname);
    url.searchParams.set("_is_native", "1");
    const res = await fetch(url, {
      method,
      headers: {
        ...(client ? { Authorization: client } : {}),
        ...(form ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      },
      body: form ? new URLSearchParams(form).toString() : undefined,
    });
    client = res.headers.get("authorization") ?? client;
    const body = await res.json().catch(() => null);
    if (res.status >= 300) {
      const reason = body?.errors?.[0]?.long_message ?? body?.errors?.[0]?.message ?? "";
      throw new Error(`Clerk ${method} ${pathname.split("?")[0]} failed (${res.status}) ${reason}`);
    }
    return body;
  };
}

/** Waits out the last seconds of a 30-second window, where a code can expire in transit. */
async function freshTotp(secret) {
  const left = 30000 - (Date.now() % 30000);
  if (left < 5000) await new Promise((resolve) => setTimeout(resolve, left + 500));
  return totp(secret);
}

/**
 * Sets up two-step verification from scratch and returns the secret and the backup codes. Run as
 * the user, through Clerk's native-client API: a one-time sign-in ticket, then the same calls the
 * app's "Secure your account" screens make. Any earlier setup is discarded first, so this is also
 * how fresh codes are issued.
 */
async function enrolTwoStep(userId, withSession) {
  const current = await clerk(`/users/${userId}`);
  if (
    current.body?.two_factor_enabled ||
    current.body?.totp_enabled ||
    current.body?.backup_code_enabled
  ) {
    const reset = await clerk(`/users/${userId}/mfa`, { method: "DELETE" });
    if (reset.status >= 300)
      throw new Error(`Couldn't reset two-step verification (${reset.status})`);
  }
  const ticket = await clerk("/sign_in_tokens", {
    method: "POST",
    body: JSON.stringify({ user_id: userId, expires_in_seconds: 300 }),
  });
  if (ticket.status >= 300) throw new Error(`Couldn't create a sign-in ticket (${ticket.status})`);

  const fapi = nativeClient();
  const signIn = await fapi("POST", "/v1/client/sign_ins", {
    strategy: "ticket",
    ticket: ticket.body.token,
  });
  const sessionId = signIn.response?.created_session_id;
  if (!sessionId) throw new Error(`The ticket sign-in stopped at "${signIn.response?.status}"`);
  const q = `?_clerk_session_id=${sessionId}`;
  try {
    const created = await fapi("POST", `/v1/me/totp${q}`, {});
    const secret = created.response.secret;
    await fapi("POST", `/v1/me/totp/attempt_verification${q}`, {
      code: await freshTotp(secret),
    });
    const backup = await fapi("POST", `/v1/me/backup_codes${q}`, {});
    const codes = backup.response.codes;
    if (!Array.isArray(codes) || codes.length === 0)
      throw new Error("Clerk returned no backup codes");

    if (withSession) {
      // With two-step set up, the session's pending "setup-mfa" task is done and it can act as
      // the user — which is how the sample PDFs get made by the real server.
      await fapi("POST", `/v1/client/sessions/${sessionId}/touch`, {});
      const jwt = async () =>
        (await fapi("POST", `/v1/client/sessions/${sessionId}/tokens`, {})).jwt;
      await withSession(jwt);
    }
    return { secret, codes };
  } finally {
    await clerk(`/sessions/${sessionId}/revoke`, { method: "POST" });
  }
}

// ---------------------------------------------------------------------------------- rows

async function ensureProfile(userId, account, role) {
  rows(
    await db("/profiles?on_conflict=id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({ id: userId, full_name: fullName(account), email: account.email }),
    }),
    "profile",
  );
  const have = rows(await db(`/user_roles?user_id=eq.${userId}&select=role`), "roles").map(
    (r) => r.role,
  );
  for (const wanted of new Set(["user", role])) {
    if (!have.includes(wanted)) {
      rows(
        await db("/user_roles", {
          method: "POST",
          body: JSON.stringify({ user_id: userId, role: wanted }),
        }),
        `${wanted} role`,
      );
    }
  }
}

/** The demo advocate's listing: unverified, so lawyers_public_read keeps it out of the directory. */
async function ensureAdvocateListing(userId, account) {
  const existing = rows(await db(`/lawyers?user_id=eq.${userId}&select=id`), "advocate listing");
  if (existing.length) return;
  rows(
    await db("/lawyers", {
      method: "POST",
      body: JSON.stringify({
        user_id: userId,
        full_name: fullName(account),
        headline: "Demo advocate account for app review",
        firm: "LegalFinder demo",
        bio: "A sample account used to demonstrate the app to store reviewers. Not a practising advocate.",
        city: "Kampala",
        practice_areas: ["Land", "Tenancy"],
        languages: ["English"],
        verified: false,
        accepting_clients: false,
      }),
    }),
    "advocate listing",
  );
}

/** Removes the sample rows and files, leaving the accounts. Order follows the foreign keys. */
async function wipeSampleData(clientId, advocateId) {
  const ids = [clientId, advocateId].filter(Boolean);
  if (ids.length === 0) return;
  const list = ids.join(",");
  for (const userId of ids) {
    const objects = await (
      await storage("/object/list/documents", {
        method: "POST",
        body: JSON.stringify({ prefix: userId, limit: 200 }),
      })
    ).json();
    if (Array.isArray(objects) && objects.length) {
      await storage("/object/documents", {
        method: "DELETE",
        body: JSON.stringify({ prefixes: objects.map((o) => `${userId}/${o.name}`) }),
      });
    }
  }
  rows(await db(`/documents?owner_id=in.(${list})`, { method: "DELETE" }), "documents");
  const cases = rows(
    await db(`/cases?or=(client_id.in.(${list}),lawyer_id.in.(${list}))&select=id`),
    "cases",
  ).map((c) => c.id);
  if (cases.length) {
    rows(
      await db(`/case_deadlines?case_id=in.(${cases.join(",")})`, { method: "DELETE" }),
      "deadlines",
    );
    rows(
      await db(`/case_updates?case_id=in.(${cases.join(",")})`, { method: "DELETE" }),
      "updates",
    );
    rows(await db(`/cases?id=in.(${cases.join(",")})`, { method: "DELETE" }), "cases");
  }
  rows(
    await db(`/appointments?or=(client_id.in.(${list}),lawyer_id.in.(${list}))`, {
      method: "DELETE",
    }),
    "appointments",
  );
  rows(
    await db(`/conversations?or=(participant_a.in.(${list}),participant_b.in.(${list}))`, {
      method: "DELETE",
    }),
    "conversations",
  );
  rows(await db(`/notifications?user_id=in.(${list})`, { method: "DELETE" }), "notifications");
}

const DAY = 86_400_000;
const at = (days, hour = 10, minute = 0) => {
  const date = new Date(Date.now() + days * DAY);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
};

/** A small, plainly fictional file: one matter at hearing stage, one open, one closed. */
async function seedSampleData(clientId, advocateId) {
  const client = fullName(ACCOUNTS.client);
  const advocate = fullName(ACCOUNTS.advocate);
  const hearing = at(12, 9, 30);

  // Every object carries the same keys: PostgREST rejects a bulk insert otherwise.
  const matter = (fields) => ({ court: null, next_hearing: null, outcome: null, ...fields });
  const cases = rows(
    await db("/cases", {
      method: "POST",
      body: JSON.stringify([
        matter({
          title: "Boundary dispute — Plot 14, Kira",
          case_type: "Land",
          status: "hearing",
          priority: "high",
          court: "Magistrate's Court, Kira",
          description:
            "Sample matter. A neighbour's new wall crosses the surveyed boundary of the client's plot; the client seeks an order to have it moved.",
          client_id: clientId,
          lawyer_id: advocateId,
          next_hearing: hearing,
          created_at: at(-24),
          updated_at: at(-2, 16),
        }),
        matter({
          title: "Tenancy agreement review — shop on Kampala Road",
          case_type: "Tenancy",
          status: "open",
          priority: "medium",
          description:
            "Sample matter. Review of a five-year commercial lease before signing, with attention to the rent review and repair clauses.",
          client_id: clientId,
          lawyer_id: advocateId,
          created_at: at(-6),
          updated_at: at(-1, 11),
        }),
        matter({
          title: "Unpaid salary claim",
          case_type: "Employment",
          status: "closed",
          outcome: "settled",
          priority: "medium",
          description: "Sample matter. Three months' salary arrears, settled before hearing.",
          client_id: clientId,
          lawyer_id: advocateId,
          created_at: at(-120),
          updated_at: at(-60),
        }),
      ]),
    }),
    "sample cases",
  );
  const [boundary, tenancy] = cases;

  const note = (caseId, days, hour, text) => ({
    case_id: caseId,
    author_id: advocateId,
    author_name: advocate,
    note: text,
    created_at: at(days, hour),
  });
  rows(
    await db("/case_updates", {
      method: "POST",
      body: JSON.stringify([
        note(
          boundary.id,
          -21,
          11,
          "Instructions received. Requested the survey report and a certified copy of the title.",
        ),
        note(
          boundary.id,
          -9,
          15,
          "Plaint filed and the defendant served. The court has fixed a hearing date.",
        ),
        note(
          boundary.id,
          -2,
          16,
          "Survey report summary added to the documents. Please read it before the hearing.",
        ),
        note(
          tenancy.id,
          -1,
          11,
          "Draft lease received from the landlord's agent. Comments to follow this week.",
        ),
      ]),
    }),
    "sample case notes",
  );

  const deadline = (title, type, days, status) => ({
    case_id: boundary.id,
    title,
    deadline_type: type,
    due_date: at(days, 9).slice(0, 10),
    status,
    created_by: advocateId,
  });
  rows(
    await db("/case_deadlines", {
      method: "POST",
      body: JSON.stringify([
        deadline("Serve the defendant", "filing", -9, "completed"),
        deadline("File witness statements", "filing", 5, "upcoming"),
        deadline("Hearing", "hearing", 12, "upcoming"),
      ]),
    }),
    "sample deadlines",
  );

  rows(
    await db("/appointments", {
      method: "POST",
      body: JSON.stringify({
        client_id: clientId,
        lawyer_id: advocateId,
        client_name: client,
        lawyer_name: advocate,
        subject: "Pre-hearing consultation",
        notes: "Go through the witness statement and the survey report.",
        mode: "video",
        scheduled_at: at(3, 14),
        duration_minutes: 45,
        status: "confirmed",
      }),
    }),
    "sample appointment",
  );

  // Participants are stored in sorted order (one conversation per pair) — as the app does.
  const [a, b] = clientId < advocateId ? [clientId, advocateId] : [advocateId, clientId];
  const lastMessage = "That works for me. I will bring the original title.";
  const [conversation] = rows(
    await db("/conversations", {
      method: "POST",
      body: JSON.stringify({
        participant_a: a,
        participant_b: b,
        subject: `Consultation with ${advocate}`,
        last_message: lastMessage,
        last_message_at: at(-1, 9, 40),
        created_at: at(-3, 8),
      }),
    }),
    "sample conversation",
  );
  const message = (fromAdvocate, days, hour, minute, body) => ({
    conversation_id: conversation.id,
    sender_id: fromAdvocate ? advocateId : clientId,
    sender_name: fromAdvocate ? advocate : client,
    body,
    created_at: at(days, hour, minute),
    read_at: at(days, hour, minute + 5),
  });
  rows(
    await db("/messages", {
      method: "POST",
      body: JSON.stringify([
        message(
          true,
          -3,
          8,
          15,
          "Good morning Grace. The hearing date is confirmed. I have added a summary of the survey report to your documents.",
        ),
        message(
          false,
          -3,
          9,
          2,
          "Thank you. I have read it — the measurements match what the surveyor told us on site.",
        ),
        message(
          true,
          -2,
          16,
          30,
          "Good. I have booked a short call before the hearing to go through your statement.",
        ),
        message(false, -1, 9, 40, lastMessage),
      ]),
    }),
    "sample messages",
  );

  rows(
    await db("/notifications", {
      method: "POST",
      body: JSON.stringify([
        {
          user_id: clientId,
          title: "Hearing date set",
          body: `Boundary dispute — Plot 14, Kira: ${new Date(hearing).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}, 9:30 am.`,
          kind: "case",
          link: `/cases/${boundary.id}`,
          read: false,
          created_at: at(-9, 15, 5),
        },
        {
          user_id: clientId,
          title: "Appointment confirmed",
          body: `Pre-hearing consultation with ${advocate}.`,
          kind: "appointment",
          link: null,
          read: true,
          created_at: at(-2, 16, 35),
        },
      ]),
    }),
    "sample notifications",
  );

  return { boundaryCaseId: boundary.id };
}

/** Two real PDFs in the client's vault, rendered by the live server like any generated document. */
async function generateSampleDocuments(jwt, caseId) {
  const requests = [
    {
      kind: "draft",
      caseId,
      title: "Survey report summary",
      bodyText:
        "SUMMARY OF SURVEY REPORT — PLOT 14, KIRA\n\nSample document for demonstration.\n\n1. The surveyor re-opened the boundary from the mark stones shown on the deed plan.\n\n2. The eastern boundary measures 30.5 metres. The neighbouring wall stands 1.2 metres inside that line for a length of 18 metres.\n\n3. The encroached area is approximately 21.6 square metres.\n\n4. The surveyor's signed report and the deed plan are held on the advocate's file.",
    },
    {
      kind: "template",
      caseId,
      templateId: "retainer_agreement",
      values: {
        clientName: fullName(ACCOUNTS.client),
        clientAddress: "P.O. Box 1234, Kampala",
        advocateName: fullName(ACCOUNTS.advocate),
        firmName: "LegalFinder demo",
        matterDescription: "Boundary dispute concerning Plot 14, Kira (sample matter).",
        scopeOfServices:
          "Drafting and filing pleadings, attending court, and negotiating a settlement where instructed.",
        feeArrangement: "Fees as agreed in writing and billed at each stage of the matter.",
        retainerAmount: "UGX 500,000",
        effectiveDate: new Date(Date.now() - 21 * DAY).toISOString().slice(0, 10),
      },
    },
  ];
  let made = 0;
  for (const body of requests) {
    const res = await fetch(`${SITE}/api/mobile/documents/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${await jwt()}` },
      body: JSON.stringify(body),
    });
    if (res.ok) made += 1;
    else {
      const reason = (await res.json().catch(() => null))?.error ?? "";
      console.log(`  note: a sample document was not generated (${res.status} ${reason})`);
    }
  }
  return made;
}

// ---------------------------------------------------------------------------------- output

function writeCredentials(client, advocate) {
  const block = (codes) => codes.map((code) => `    ${code}`).join("\n");
  const text = `LegalFinder — sign-in details for app store reviewers
Written ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC by scripts/reviewer-accounts.mjs
This file is git-ignored. Backup codes are single-use: issue a fresh set before every submission
with   node scripts/reviewer-accounts.mjs codes   and paste the new ones in.

=====================================================================================
PASTE THIS PART into App Store Connect > App Review Information > Sign-in required,
and into Play Console > App content > App access.
=====================================================================================

User name:  ${ACCOUNTS.client.email}
Password:   ${client.password}

Notes for the reviewer

LegalFinder requires two-step verification on every account. After the password, the
app shows "Two-step verification" and asks for a code. Tap "Use a backup code instead"
and enter any one of these codes, then "Verify and continue". Each code works once;
use the next one for the next sign-in.

${block(client.codes)}

This is a client account with sample data: three matters (one with a hearing date,
notes, deadlines and two documents), a confirmed appointment, a conversation with an
advocate, and notifications. Everything in it is fictional.

The legal assistant ("Ask assistant" on the home screen, or More > AI legal
assistant) and AI-assisted drafting ask for
permission the first time they are used, because what is typed is sent to Anthropic's
Claude to write the answer. Choose "Allow and continue" to try them.

Account deletion is under More > Settings > Danger zone. Please don't delete this
account during review.

The advocate, police, judiciary and administrator workspaces are only given to
verified professionals and are not open to public sign-up. To see the advocate
workspace, sign in with the second account below in the same way:

User name:  ${ACCOUNTS.advocate.email}
Password:   ${advocate.password}
Backup codes:
${block(advocate.codes)}

=====================================================================================
KEEP PRIVATE — not for the reviewer
=====================================================================================

Authenticator secrets. Add one to an authenticator app (manual entry, time-based) to
sign in to these accounts yourself without using up a backup code:
  ${ACCOUNTS.client.email}:  ${client.secret}
  ${ACCOUNTS.advocate.email}:  ${advocate.secret}

Clerk user ids:  ${client.id}  /  ${advocate.id}
Mail sent to these two addresses (a password reset, for example) only arrives if
legalfinder.co has mailboxes or aliases for them.
`;
  fs.mkdirSync(path.dirname(CREDENTIALS), { recursive: true });
  fs.writeFileSync(CREDENTIALS, text, { mode: 0o600 });
}

/** The passwords from the last run, so "codes" can rewrite the file without changing them. */
function readPasswords() {
  if (!fs.existsSync(CREDENTIALS)) return null;
  const found = [...fs.readFileSync(CREDENTIALS, "utf8").matchAll(/^Password:\s+(\S+)$/gm)].map(
    (m) => m[1],
  );
  return found.length === 2 ? { client: found[0], advocate: found[1] } : null;
}

// ---------------------------------------------------------------------------------- commands

async function setup() {
  const passwords = { client: newPassword(), advocate: newPassword() };
  const client = await ensureUser(ACCOUNTS.client, passwords.client);
  const advocate = await ensureUser(ACCOUNTS.advocate, passwords.advocate);
  console.log(
    `accounts: client ${client.created ? "created" : "updated"}, advocate ${advocate.created ? "created" : "updated"}`,
  );

  await ensureProfile(client.id, ACCOUNTS.client, "user");
  await ensureProfile(advocate.id, ACCOUNTS.advocate, "lawyer");
  await ensureAdvocateListing(advocate.id, ACCOUNTS.advocate);

  await wipeSampleData(client.id, advocate.id);
  const { boundaryCaseId } = await seedSampleData(client.id, advocate.id);
  console.log(
    "sample data: 3 matters, notes, deadlines, an appointment, a conversation, notifications",
  );

  let documents = 0;
  const clientMfa = await enrolTwoStep(client.id, async (jwt) => {
    documents = await generateSampleDocuments(jwt, boundaryCaseId);
  });
  const advocateMfa = await enrolTwoStep(advocate.id);
  console.log(`sample documents generated by the live site: ${documents} of 2`);

  writeCredentials(
    { ...client, password: passwords.client, ...clientMfa },
    { ...advocate, password: passwords.advocate, ...advocateMfa },
  );
  console.log(
    `two-step verification on, ${clientMfa.codes.length} + ${advocateMfa.codes.length} backup codes issued`,
  );
  console.log(
    `sign-in details written to ${path.relative(ROOT, CREDENTIALS)} (not printed, not committed)`,
  );
}

async function codes() {
  const passwords = readPasswords();
  if (!passwords) {
    throw new Error(
      "No credentials file from an earlier run — run without arguments to set the accounts up.",
    );
  }
  const client = await findUser(ACCOUNTS.client.email);
  const advocate = await findUser(ACCOUNTS.advocate.email);
  if (!client || !advocate)
    throw new Error("The reviewer accounts don't exist — run without arguments first.");
  const clientMfa = await enrolTwoStep(client.id);
  const advocateMfa = await enrolTwoStep(advocate.id);
  writeCredentials(
    { id: client.id, password: passwords.client, ...clientMfa },
    { id: advocate.id, password: passwords.advocate, ...advocateMfa },
  );
  console.log(
    `fresh backup codes issued (${clientMfa.codes.length} + ${advocateMfa.codes.length}); the earlier ones no longer work`,
  );
  console.log(
    `written to ${path.relative(ROOT, CREDENTIALS)} — paste the new codes into the store consoles`,
  );
}

async function status() {
  for (const [kind, account] of Object.entries(ACCOUNTS)) {
    const user = await findUser(account.email);
    if (!user) {
      console.log(`${kind}: ${account.email} — does not exist`);
      continue;
    }
    const roles = rows(await db(`/user_roles?user_id=eq.${user.id}&select=role`), "roles");
    const cases = rows(
      await db(`/cases?or=(client_id.eq.${user.id},lawyer_id.eq.${user.id})&select=id`),
      "cases",
    );
    const documents = rows(await db(`/documents?owner_id=eq.${user.id}&select=id`), "documents");
    console.log(
      `${kind}: ${account.email} — two-step ${user.two_factor_enabled ? "on" : "OFF"}, backup codes ${user.backup_code_enabled ? "on" : "OFF"}, roles ${roles.map((r) => r.role).join("+") || "none"}, ${cases.length} matters, ${documents.length} documents`,
    );
  }
  console.log(`credentials file: ${fs.existsSync(CREDENTIALS) ? "present" : "missing"}`);
}

/**
 * Signs in to each account the way the app does — password, then the second step — to prove the
 * details in the credentials file still work. The second step uses the authenticator secret, so
 * no backup code is spent.
 */
async function verify() {
  if (!fs.existsSync(CREDENTIALS)) {
    throw new Error("No credentials file — run without arguments to set the accounts up.");
  }
  const file = fs.readFileSync(CREDENTIALS, "utf8");
  const passwords = [...file.matchAll(/^Password:\s+(\S+)$/gm)].map((m) => m[1]);
  let failures = 0;
  for (const [index, [kind, account]] of Object.entries(ACCOUNTS).entries()) {
    const secret = file.match(
      new RegExp(`^\\s+${account.email.replace(/[.+]/g, "\\$&")}:\\s+(\\S+)$`, "m"),
    )?.[1];
    try {
      if (!passwords[index] || !secret) throw new Error("its details are missing from the file");
      const fapi = nativeClient();
      const first = (
        await fapi("POST", "/v1/client/sign_ins", {
          strategy: "password",
          identifier: account.email,
          password: passwords[index],
        })
      ).response;
      if (first.status !== "needs_second_factor") {
        throw new Error(
          `after the password the sign-in was "${first.status}", not the second step`,
        );
      }
      const offered = (first.supported_second_factors ?? []).map((factor) => factor.strategy);
      if (!offered.includes("backup_code")) throw new Error("backup codes are not offered");
      const attempt = async () =>
        (
          await fapi("POST", `/v1/client/sign_ins/${first.id}/attempt_second_factor`, {
            strategy: "totp",
            code: await freshTotp(secret),
          })
        ).response;
      // Clerk refuses an authenticator code it has already seen, and "codes" or an earlier
      // "verify" may have used this half-minute's one: wait for the next and try once more.
      const second = await attempt().catch(async (error) => {
        if (!/Incorrect code/i.test(error.message)) throw error;
        await new Promise((resolve) => setTimeout(resolve, 31000 - (Date.now() % 30000)));
        return attempt();
      });
      if (second.created_session_id) {
        await clerk(`/sessions/${second.created_session_id}/revoke`, { method: "POST" });
      }
      if (second.status !== "complete") throw new Error(`the second step ended "${second.status}"`);
      console.log(
        `${kind}: ${account.email} — password accepted, second step asked for (backup codes offered), signed in`,
      );
    } catch (error) {
      failures += 1;
      console.log(`${kind}: ${account.email} — FAILED: ${error.message}`);
    }
  }
  if (failures) throw new Error(`${failures} account(s) could not sign in`);
}

async function remove() {
  const client = await findUser(ACCOUNTS.client.email);
  const advocate = await findUser(ACCOUNTS.advocate.email);
  await wipeSampleData(client?.id, advocate?.id);
  for (const user of [client, advocate]) {
    if (!user) continue;
    rows(await db(`/lawyers?user_id=eq.${user.id}`, { method: "DELETE" }), "advocate listing");
    rows(await db(`/user_roles?user_id=eq.${user.id}`, { method: "DELETE" }), "roles");
    rows(await db(`/profiles?id=eq.${user.id}`, { method: "DELETE" }), "profile");
    const gone = await clerk(`/users/${user.id}`, { method: "DELETE" });
    if (gone.status >= 300) throw new Error(`Couldn't delete the Clerk user (${gone.status})`);
  }
  fs.rmSync(CREDENTIALS, { force: true });
  console.log(
    `removed: ${[client, advocate].filter(Boolean).length} account(s), their sample data and the credentials file`,
  );
}

const command = process.argv[2] ?? "setup";
const run = { setup, codes, status, verify, remove }[command];
if (!run) {
  console.error("usage: node scripts/reviewer-accounts.mjs [setup|codes|status|verify|remove]");
  process.exit(2);
}
run().catch((error) => {
  console.error(`FAILED: ${error.message}`);
  process.exit(1);
});
