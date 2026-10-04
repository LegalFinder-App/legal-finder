# Reply to App Review: Guideline 2.1, Information Needed

Apple held build **2.0.0 (3)** on 4 October 2026 and asked for six things. This page has the
recording to make, the reply to paste, and the order to do it in. **Confirm** marks a statement
that is yours to make; check those before sending.

## In this order

1. **Get build 2.0.0 (5) onto your iPhone.** It has the reporting and blocking Apple's message asks
   to see, and opens reliably on a weak connection (build 4 could stay on its splash screen). When the EAS build finishes, send it to App Store Connect from `apps/mobile`:
   `npx eas-cli submit -p ios --latest` (it asks for your Apple ID). Once it has processed,
   install it with TestFlight. Don't record build 3: it can't report or block.
2. **Get fresh backup codes** for the demo accounts: `node scripts/reviewer-accounts.mjs codes`,
   then paste the new notes from `reviewer-credentials.local` into App Review Information.
3. **Record the screen** on the iPhone, following the script below.
4. **Swap the build**: on the version page, remove build 3 and add build 5.
5. **Reply** in App Review (the message thread under the rejected submission). Paste the reply
   below and attach the recording, then resubmit.

## The recording

Use the iPhone's own screen recorder (Control Centre → Screen Recording). Record in one take, at
an unhurried pace. It takes about four minutes. You need an email address you can open on the
phone for step 2, one the app hasn't seen before.

1. **Launch.** Start on the iPhone home screen and tap the LegalFinder icon. The welcome screen
   opens.
2. **Registration.** Tap **Create account**. Enter a name, the new email address and a password.
   Tick the agreement: it says there is no tolerance for objectionable content or abusive users.
   Tap **Create account** and enter the code from the email. Set up two-step verification with an
   authenticator app (the app requires it for every account). You arrive on the home screen.
3. **Account deletion.** Tap **More**, then **Settings**. Scroll to the bottom and tap **Delete my
   account**, then **Delete permanently**. The app returns to the welcome screen. The account is
   gone and can't sign in again.
4. **Login.** Tap **Sign in**. Enter the demo client's email and password. On the code screen, tap
   **Use a backup code instead** and enter one backup code. You arrive on "Your matters".
5. **User-generated content: reporting.** Tap **Messages**, then **Consultation with James
   Okello**. Press and hold one of James's messages and choose **Report message**. Choose a reason
   and tap **Send report**. "Report sent" appears.
6. **Reporting the person.** Tap **⋮** at the top right and choose **Report James Okello**. Show
   the same reasons, then close the sheet.
7. **Blocking.** Tap **⋮** again and choose **Block James Okello**, then **Block**. The message box
   is replaced by "You blocked James Okello. Neither of you can send messages to the other." Tap
   **Unblock** to show it can be undone.
8. **Filtering.** Tap **Advocates**, open **Michael Okello**, and scroll to **Leave a review**.
   Type a review with a swear word in it and tap **Post review**. The app refuses it: "Please
   remove offensive language from your review before posting it." Don't post a real review.
9. **Paid content.** Tap **More**, then **Payments**. Show that it is empty. The app sells nothing
   in the app (see item 1 of the reply).

## The reply

Paste the text below and fill in the two **[brackets]** first.

```
Hello,

Thank you for reviewing LegalFinder. Build 2.0.0 (5), now attached to this version, adds the content reporting and blocking your message mentions. Our answers, in the order you asked:

1. Screen recording
Attached. It was recorded on a physical iPhone running build 2.0.0 (5). It shows: launching the app; registration (sign-up, email verification and the two-step verification every account must set up); deleting that account in Settings; signing in with the demo account; reporting a message and a person from a conversation; blocking and unblocking that person; and a public review being refused for abusive language. The app has no paid digital content and no in-app purchases (see below), so there is no purchase to show.

2. Purpose and audience
LegalFinder helps people in Uganda with a legal problem. A member of the public can find an advocate (a lawyer) checked against the roll of advocates, message them, and follow their legal matter: hearing dates, updates from the advocate, and a private document vault shared only with the people on the matter. Everyone can read plain-language guides to the law, court judgements and statutes, find police stations, and report an incident to the police. An optional AI assistant answers general legal questions in plain language; it gives general information, not legal advice, and asks permission before it is first used. Advocates get a workspace for their matters and appointments, and verified police, judiciary and administrator accounts get workspaces for their own work. The audience is adults in Uganda: members of the public, advocates, and justice-sector officials.

3. Review access
Use the demo accounts in App Review Information. Every account must use two-step verification, so after the password tap "Use a backup code instead" and enter one of the backup codes listed in the notes (each works once). The client account already has sample matters, documents and a conversation with an advocate. Reporting: in a conversation, press and hold a message, or tap the ⋮ menu at the top right. Blocking: the same ⋮ menu. Reviews on an advocate's profile have a "Report" link. Account deletion: More > Settings > Delete my account.

4. External services
- Clerk: sign-in, two-step verification, and Sign in with Apple, Google and LinkedIn.
- Supabase: the database and document storage.
- ImageKit: profile photos and images.
- Anthropic (Claude): the AI assistant and AI-assisted document drafting, only after the user allows it.
- Pesapal: payment of an advocate's consultation fee (not yet switched on).
- Flutterwave: paying advocates their fees (not yet switched on).
- Vercel: hosts the LegalFinder server the app talks to.

5. Regional differences
The app works the same way in every country where it is available. Its content (advocates, laws, courts and police stations) is about Uganda, and fees are shown in Ugandan shillings.

6. Regulated industry
LegalFinder is not a law firm and does not provide legal services or legal advice. It is a directory of advocates and a tool for clients and their advocates to communicate and keep their case documents. Advocates are independent professionals. An administrator checks each one against the roll of advocates before their profile is shown, and the app says so on the directory. [Describe any registration or authorisation LegalFinder holds, or say that none is required, and attach it.]

User-generated content: users agree to our Terms of Service when they register. The Terms state that there is no tolerance for objectionable content or abusive users. Users can report messages, reviews and people, and block anyone from messaging them. Public reviews are screened automatically for abusive language. Every report notifies our moderators, who review reports within 24 hours, remove content that breaks the Terms, and remove the accounts responsible. Contact: [support email], https://www.legalfinder.co/contact.

Regards,
[Your name]
```

**Confirm** before sending:

- **The 24-hour promise.** The Terms of Service now say reports are reviewed within 24 hours.
  App Review expects exactly that for apps with user content. You are the only administrator, so
  it is your commitment: reports appear under Admin → Reports in the app and on the website, and
  each one notifies every administrator.
- **Item 6.** Name the credentials only if LegalFinder really has them (a company registration,
  for example). Apple may also say that an app like this must come from an Organization developer
  account rather than an Individual one (guideline 5.1.1(ix)). That is a choice about your
  business, not something the app can fix.
- **Item 4.** Pesapal and Flutterwave have no keys yet, so payments are off. If you switch them on
  before review, delete "(not yet switched on)" from those two lines.
