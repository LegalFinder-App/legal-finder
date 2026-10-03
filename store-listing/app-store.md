# App Store Connect

Field by field, in the order App Store Connect asks. Text in code blocks is ready to paste.
**Confirm** marks a choice or declaration that is yours to make.

Build to submit: **2.0.0 (3)** — iPhone only. (Builds 1 and 2 are older: don't submit those.)

## App information

| Field              | Value                                                                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Name (30)          | `LegalFinder`                                                                                                                                          |
| Subtitle (30)      | `Advocates, cases & legal help`                                                                                                                        |
| Bundle ID          | `com.legalfinder.app`                                                                                                                                  |
| Primary language   | English (U.K.) or English (U.S.) — **Confirm**                                                                                                         |
| Category           | Suggested: primary **Reference**, secondary **Business**. There is no legal category. **Confirm**                                                      |
| Content rights     | The app shows statutes, judgements and news. **Confirm** you have the right to publish each (see "Before the app is open to the public" in the README) |
| Privacy Policy URL | `https://www.legalfinder.co/privacy-policy`                                                                                                            |
| Copyright          | `© 2026 LegalFinder` — use your registered entity's name. **Confirm**                                                                                  |

## Version information

**Promotional text (170)**

```
Find an advocate, follow your matter from filing to judgement, keep your documents in one private place and read plain-language guides to the law in Uganda.
```

**Description (4000)**

```
LegalFinder brings the people and information you need for a legal problem in Uganda into one app.

FIND AN ADVOCATE
• Browse advocates by practice area and district, and see who is accepting new clients.
• Read each profile: firm, experience, languages and consultation fee.
• Message an advocate securely or request a consultation.

FOLLOW YOUR MATTER
• Every matter has a reference you can follow, with deadlines, hearing dates and updates from your advocate.
• Keep pleadings, evidence and correspondence in a private document vault, shared only with the people on the matter.
• Generate first drafts of common documents — a retainer agreement, a power of attorney, a service contract — as PDFs.

UNDERSTAND THE LAW
• Plain-language guides on arrest, land, family property, employment and tenancy.
• Court judgements, a library of key statutes, and legal news.
• An AI legal assistant for general questions, which points you to the right guide, office or advocate. It gives general information, not legal advice, and asks your permission before it is first used.

POLICE AND SAFETY
• A directory of police stations with their contact details.
• Report an incident and follow it by reference, or file it anonymously.
• Public wanted notices and practical safety tips.

BUILT FOR PRIVACY
• Two-step verification on every account, and an optional app lock with Face ID or Touch ID.
• Your matters, messages and documents are visible only to you and the people on the matter.
• Delete your account at any time from Settings.

FOR PROFESSIONALS
Advocates get a practice workspace with their matters, appointments, documents and practice analytics. Police, judiciary and administrator workspaces are available to verified officials.

IMPORTANT
LegalFinder is an independent, privately operated platform. It is not a government entity and is not affiliated with, endorsed by, or operated on behalf of the Government of Uganda, the Judiciary of Uganda, the Uganda Police Force or any other government body. Government information in the app can be checked at its sources: the Judiciary of Uganda (judiciary.go.ug), the Uganda Legal Information Institute (ulii.org) and the Uganda Police Force (upf.go.ug). Information in the app is general guidance and not a substitute for advice from a qualified advocate. In an emergency, call 999 or 112.
```

Leave out a line the released app can't yet do: for example the wanted-notices line if you switch
that feature off before launch.

**Keywords (100)**

```
advocate,lawyer,attorney,law,court,case,judgement,police,uganda,land,tenancy,legal aid,rights
```

| Field            | Value                                                                                                                                                                                                                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Support URL      | `https://www.legalfinder.co/contact`                                                                                                                                                                                                                                                  |
| Marketing URL    | `https://www.legalfinder.co`                                                                                                                                                                                                                                                          |
| Screenshots      | One set, in the slot whose size it matches: `screenshots/iphone-6.5/` (1284 × 2778) under **iPhone 6.5" Display**, or `screenshots/iphone-6.9/` (1320 × 2868) under **iPhone 6.9" Display**. All eight, in file-name order. App Store Connect refuses a set dropped in the other slot |
| iPad screenshots | Not needed: this build is iPhone only                                                                                                                                                                                                                                                 |

## App Review Information

| Field                                       | Value                                                                                                                 |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Sign-in required                            | Yes                                                                                                                   |
| User name, password, notes                  | Paste from `reviewer-credentials.local` (run `node scripts/reviewer-accounts.mjs codes` first for fresh backup codes) |
| Contact first name, last name, phone, email | Yours. **Confirm**                                                                                                    |

## Export compliance

The app uses only standard encryption (HTTPS and the operating system's own), and the build already
declares that (`usesNonExemptEncryption: false`), so App Store Connect should not ask.

## Age rating

Apple calculates the rating from a questionnaire. The facts it asks about:

- No violence, sexual content, profanity, gambling, alcohol, tobacco or drug content.
- **Crime-related text.** Wanted notices name alleged offences, and guides discuss arrest and
  criminal procedure. No graphic detail.
- **Messaging.** Private one-to-one messages between a client and an advocate.
- **User-generated content.** Clients can review an advocate, and those reviews are public. Anyone
  can file an incident report, signed in or anonymously; a report is readable only by the person
  who filed it and by police and administrator accounts.
- **AI assistant.** A text assistant for legal questions, using Anthropic's Claude.
- No advertising. No unrestricted web access. No in-app purchases.
- The privacy policy says the service is not directed at anyone under 18.

**Confirm** each answer in the questionnaire against these.

## App Privacy

Apple asks what the app collects, whether it is linked to the person, and why. This is drafted
from what the code does. It is a legal declaration: **Confirm** before publishing.

**Tracking:** No. The app has no advertising or analytics libraries and shares nothing for
advertising.

**Data collected** — all linked to the user, all for **App Functionality** only:

| Apple's data type                                                  | Collected?          | What it is in LegalFinder                                                                                                                                                                                          |
| ------------------------------------------------------------------ | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Contact Info → Name                                                | Yes                 | The name on the account and profile                                                                                                                                                                                |
| Contact Info → Email Address                                       | Yes                 | The sign-in email                                                                                                                                                                                                  |
| Contact Info → Phone Number                                        | Yes, advocates only | The mobile-money number an advocate gives for payouts                                                                                                                                                              |
| Financial Info → Payment Info                                      | Yes, advocates only | The bank account or mobile-money details an advocate gives for payouts. A client's card or mobile-money details are entered on Pesapal's own page and never reach the app, which Apple does not count as collected |
| Financial Info → Purchase History                                  | Yes                 | Records of consultation fees paid: amount, date, status                                                                                                                                                            |
| User Content → Emails or Text Messages                             | Yes                 | Messages between a client and an advocate                                                                                                                                                                          |
| User Content → Photos or Videos                                    | Yes                 | A profile photo, and any images uploaded as documents                                                                                                                                                              |
| User Content → Other User Content                                  | Yes                 | Matter details and notes, uploaded and generated documents, appointments, incident reports, reviews, and what is typed to the AI assistant and AI drafting                                                         |
| Identifiers → User ID                                              | Yes                 | The account's ID                                                                                                                                                                                                   |
| Identifiers → Device ID                                            | No                  | Push notifications are off in this build, so no device token is stored. Change to Yes when push is switched on                                                                                                     |
| Location                                                           | No                  | The app never asks for location. An incident's place is typed as text                                                                                                                                              |
| Contacts, Health, Browsing History, Search History, Sensitive Info | No                  |                                                                                                                                                                                                                    |
| Usage Data, Diagnostics                                            | No                  | No analytics or crash-reporting library is included                                                                                                                                                                |

Face ID is used only by the phone to unlock the app; nothing biometric leaves the device.

**Third parties that process this data for LegalFinder** (they are named in the privacy policy):
Clerk (sign-in), Supabase (database and document storage), ImageKit (profile photos), Anthropic
(the AI assistant and AI drafting, only after the user allows it), Pesapal (payments), Flutterwave
(advocate payouts), Vercel (hosting).

## Things App Review commonly asks about

- **Guideline 5.1.2(i), third-party AI.** The assistant and AI drafting open on a notice that
  names Anthropic and Claude, says what is sent, and waits for "Allow and continue". The permission
  can be withdrawn under Settings → Privacy.
- **Guideline 5.1.1(v), account deletion.** Settings → Danger zone → Delete my account, inside the
  app. Also described at `https://www.legalfinder.co/delete-account`.
- **Guideline 4.8, sign-in options.** The app offers Sign in with Apple alongside Google and
  LinkedIn.
- **Guideline 3.1, payments.** Consultation fees pay for a service delivered by a person outside
  the app (a consultation with an advocate), so they go through Pesapal, not in-app purchase.
- **Government information.** The app's About screen and the description above state that
  LegalFinder is not a government body and name the sources.
