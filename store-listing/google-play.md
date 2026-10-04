# Google Play Console

Field by field. Text in code blocks is ready to paste. **Confirm** marks a choice or declaration
that is yours to make.

Bundle to upload: `apps/mobile/release/LegalFinder-2.0.0-build10.aab` (version code 10), also in
`play-upload-build10/`. It adds reporting and blocking. Play has already seen version codes 8
and 9, so those are refused.

## Main store listing

| Field                  | Value                                                                             |
| ---------------------- | --------------------------------------------------------------------------------- |
| App name (30)          | `LegalFinder` (or `LegalFinder: Legal Help Uganda`, exactly 30)                   |
| Short description (80) | `Find an advocate, follow your case and get plain-language legal help in Uganda.` |
| App icon               | `../platforms/mobile/store-assets/play-app-icon.png` (512 × 512)                  |
| Feature graphic        | `../platforms/mobile/store-assets/play-feature-graphic.png` (1024 × 500)          |
| Phone screenshots      | `screenshots/android-phone/` — all eight, in file-name order                      |
| Category               | Suggested: **Business**. There is no legal category. **Confirm**                  |
| Tags                   | **Confirm** in the console (the list changes); "Legal" or "Law" if offered        |
| Email                  | `support@legalfinder.co`                                                          |
| Website                | `https://www.legalfinder.co`                                                      |
| Privacy policy         | `https://www.legalfinder.co/privacy-policy`                                       |

**Full description (4000)**

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
• Two-step verification on every account, and an optional app lock with your fingerprint or face.
• Your matters, messages and documents are visible only to you and the people on the matter.
• Delete your account at any time from Settings.

FOR PROFESSIONALS
Advocates get a practice workspace with their matters, appointments, documents and practice analytics. Police, judiciary and administrator workspaces are available to verified officials.

IMPORTANT
LegalFinder is an independent, privately operated platform. It is not a government entity and is not affiliated with, endorsed by, or operated on behalf of the Government of Uganda, the Judiciary of Uganda, the Uganda Police Force or any other government body. Government information in the app can be checked at its sources: the Judiciary of Uganda (https://judiciary.go.ug), the Uganda Legal Information Institute (https://ulii.org) and the Uganda Police Force (https://upf.go.ug). Information in the app is general guidance and not a substitute for advice from a qualified advocate. In an emergency, call 999 or 112.
```

The last paragraph matters on Play: an app that shows government information must say it is not
a government app and link to its sources, in the description as well as in the app.

## App content

**Privacy policy:** `https://www.legalfinder.co/privacy-policy`

**App access:** "All or some functionality is restricted". Add the client demo account from
`reviewer-credentials.local`, with its instructions for the backup code step (run
`node scripts/reviewer-accounts.mjs codes` first for fresh codes).

**Ads:** No, the app contains no ads.

**Content rating:** answer the questionnaire from these facts. **Confirm** each.

- Category: reference or utility, not a game or a social network.
- No violence, sexual content, profanity, gambling or drug content. Wanted notices and legal guides
  mention crimes in plain text, without graphic detail.
- Users can communicate: private one-to-one messages between a client and an advocate, and public
  reviews of advocates. Users can report messages, reviews and people, and block other users.
- The app does not share a user's location, and has no purchases of digital goods.

**Target audience:** 18 and over (the privacy policy says the service is not directed at anyone
under 18). **Confirm**

**News app:** No. It carries legal news items but is not a news app.

**Government apps:** No, LegalFinder is not published by or on behalf of a government.

**Financial features:** "My app doesn't provide any financial features". Paying an advocate's
consultation fee through Pesapal is a payment for a service, not a financial product. **Confirm**

**Health:** No health features.

**Data safety**

Drafted from what the code collects. It is a legal declaration: **Confirm** before publishing.

- Does the app collect or share any of the required user data types? **Yes**
- Is all of the data encrypted in transit? **Yes** (HTTPS only)
- Do you provide a way for users to request that their data is deleted? **Yes**
  - Account deletion URL: `https://www.legalfinder.co/delete-account`
  - Also in the app: More → Settings → Danger zone → Delete my account

Data types. "Collected" means sent off the device to LegalFinder or its service providers. Play
does not count a transfer to a service provider working on your behalf as "sharing", nor one the
user starts themselves (a message to their advocate), so **Shared** is "No" throughout —
**Confirm** that your agreements with the providers named in the privacy policy fit that.

| Play's data type                                                                    | Collected | Required or optional                                                                                                   | Purpose                                                                          |
| ----------------------------------------------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Personal info → Name                                                                | Yes       | Required                                                                                                               | App functionality, Account management                                            |
| Personal info → Email address                                                       | Yes       | Required                                                                                                               | App functionality, Account management                                            |
| Personal info → User IDs                                                            | Yes       | Required                                                                                                               | App functionality, Account management                                            |
| Personal info → Phone number                                                        | Yes       | Optional (advocates, for payouts)                                                                                      | App functionality                                                                |
| Financial info → User payment info                                                  | Yes       | Optional (advocates' payout bank or mobile-money details)                                                              | App functionality                                                                |
| Financial info → Purchase history                                                   | Yes       | Optional (records of consultation fees paid)                                                                           | App functionality                                                                |
| Messages → Other in-app messages                                                    | Yes       | Optional                                                                                                               | App functionality                                                                |
| Photos and videos → Photos                                                          | Yes       | Optional (profile photo)                                                                                               | App functionality                                                                |
| Files and docs → Files and docs                                                     | Yes       | Optional (documents added to a matter)                                                                                 | App functionality                                                                |
| App activity → Other user-generated content                                         | Yes       | Optional (matter notes, incident reports, reviews, reports of other users' content, what is typed to the AI assistant) | App functionality                                                                |
| Device or other IDs                                                                 | No        |                                                                                                                        | Push notifications are off in this build. Change to Yes when push is switched on |
| Location, Contacts, Calendar, Health, Audio, Web browsing, App info and performance | No        |                                                                                                                        | No location permission, and no analytics or crash-reporting library              |

A client's card or mobile-money details are entered on Pesapal's own page in the browser and never
reach the app, so they are not collected by it.

Is the data processed ephemerally? No — it is stored so the user can come back to it. What is typed
to the AI assistant is the exception: it is passed to Anthropic to write the answer and LegalFinder
does not store the conversation.

## Release notes for this build (500)

```
A complete rebuild as a native app: faster, works with your phone's fingerprint or face unlock, and adds practice analytics for advocates, payout details, and document generation from templates or with AI assistance. The AI features now ask your permission before first use. You can report or block another user from a conversation.
```

## Testing track

The earlier wrapper app went to closed testing up to version code 4; this bundle (code 9) is an
update to the same listing. Promote it through internal or closed testing before production, and
try it once on a real phone: this build has not yet been run on a device.
