# Store listing kit

Everything the App Store and Google Play ask for when LegalFinder is submitted, in one place.

| File                                                                   | What it is                                                                                                                                                                                                             |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [app-store.md](app-store.md)                                           | App Store Connect, field by field: name, subtitle, description, keywords, links, App Privacy answers, age-rating facts, notes for App Review                                                                           |
| [google-play.md](google-play.md)                                       | Play Console, field by field: title, descriptions, Data safety answers, App access, the content declarations                                                                                                           |
| [app-review-reply.md](app-review-reply.md)                             | App Review held build 3 for more information (4 Oct 2026): the screen recording to make on an iPhone, and the reply to paste                                                                                           |
| [screenshots/iphone-6.9/](screenshots/iphone-6.9/)                     | 8 iPhone screenshots, 1320 × 2868 (the size App Store Connect requires; it scales them for smaller iPhones)                                                                                                            |
| [screenshots/iphone-6.5/](screenshots/iphone-6.5/)                     | The same 8 iPhone screenshots at 1284 × 2778, for the **iPhone 6.5" Display** slot (each slot accepts only its own sizes)                                                                                              |
| [screenshots/android-phone/](screenshots/android-phone/)               | 8 Android phone screenshots, 1080 × 1920                                                                                                                                                                               |
| `play-upload-build11/`                                                 | **Not in git.** Everything Play Console takes as a file for Android build 11, in one place: the bundle, the icon and feature graphic, the eight screenshots. Copies, made per build — don't reuse it for a later build |
| `reviewer-credentials.local`                                           | The demo accounts' sign-in details and review notes. **Not in git** — created by the script below                                                                                                                      |
| [../platforms/mobile/store-assets/](../platforms/mobile/store-assets/) | Play's 512 × 512 icon and 1024 × 500 feature graphic (unchanged). The `screenshots/` folder beside them shows the old website wrapper — don't upload those; use the ones here                                          |

## The reviewer demo accounts

Every account must pass two-step verification, and a reviewer has no authenticator for an account
we hand them. So the demo accounts carry single-use **backup codes**, which the app accepts under
"Use a backup code instead".

```
node scripts/reviewer-accounts.mjs          # create or refresh both accounts and their sample data
node scripts/reviewer-accounts.mjs codes    # issue fresh backup codes (do this before every submission)
node scripts/reviewer-accounts.mjs status   # what exists right now
node scripts/reviewer-accounts.mjs verify   # sign in to both, as the app does (uses no backup code)
node scripts/reviewer-accounts.mjs remove   # delete the accounts and everything they own
```

- `appreview@legalfinder.co` — a client ("Grace Akello") with three sample matters, notes,
  deadlines, two PDFs, an appointment, a conversation and notifications.
- `appreview-advocate@legalfinder.co` — the advocate on those matters ("James Okello"). Its
  directory listing is unverified, so the public never sees it.

Each backup code works once and there are ten per account. Before each submission run `codes` and
paste the new set into the consoles. If a reviewer deletes the account while testing account
deletion, run the script with no arguments to bring it back.

`reviewer-credentials.local` has two halves: the part to paste into the consoles, and a private
part (authenticator secrets) for signing in yourself.

## The screenshots

They are the app's real screens, signed in as the demo client, rendered at each phone's size and
pixel density from the desktop build (which is the same code as the phone apps). They were **not**
captured on a physical phone, so they have no status bar (clock, battery). Both stores accept
that. Once the app is on a phone through TestFlight or Play testing, device captures can replace
them if you prefer.

To make them again after the app changes:

```
npm run desktop:web                  # export the current app
npm install --no-save playwright     # once; not a project dependency
node scripts/store-screenshots.mjs   # signs in as the demo client and replaces all 16
```

Everything shown is sample data: the matters are fictional, and the advocates are the eight
illustrative profiles in the directory today.

## Still yours to decide or supply

These need the business, not code. Each is marked **Confirm** in the two files.

1. **App Privacy / Data safety answers.** Drafted from what the code collects. They are legal
   declarations: read them before submitting.
2. **Category and age rating.** Suggestions and the facts the questionnaires ask about are given.
3. **App Review contact** (name, phone, email) and the **Play developer contact** details.
4. **The Apple developer account is an Individual one** ("OCHIENO DAVID (Individual)"). Apple's
   guideline 5.1.1(ix) says apps that provide services in highly regulated fields "or that require
   sensitive user information should be submitted by a legal entity that provides the services,
   and not by an individual developer". Case files are sensitive information, so App Review may
   raise this. The fix is to enrol the company as an Organization and transfer the app, which
   takes days — worth deciding before you submit.
5. **A run on a real phone.** Guideline 2.1 asks that an app be tested on a device before it is
   submitted. Neither the Android nor the iPhone build has been yet: install the iPhone build
   through TestFlight and go through sign-in, a matter, a document and the assistant once.

## Before the app is open to the public

Review can go ahead without these, but each is visible to real users.

- **The directory holds sample advocates.** The eight listed advocates are illustrative profiles,
  shown as verified, with no real person behind them: they can't be messaged or booked. Replace
  them with real, verified advocates.
- **Wanted notices, judgements and news are sample content** (3, 5 and 4 entries). Shown to the
  public they read as real police notices, real case law and real news. Replace them, or switch
  wanted notices off in Admin → Settings until a police unit posts real ones.
- **Incident reports** go to the police workspace. Until a police unit is using that workspace,
  nobody reads them; the feature can be switched off in Admin → Settings.
- **Payments.** Pesapal's keys are not configured, so paying a consultation fee fails. No listed
  advocate can be booked yet, so nobody reaches that step today. Flutterwave (advocate payouts) is
  not configured either.
- **The AI assistant** works on the live site as of 3 October 2026 (checked with a real question
  and a real draft, from the app). If it ever says "misconfigured", the `ANTHROPIC_API_KEY` in
  Vercel has been revoked or removed.
- **Sign in with Google, Apple and LinkedIn** are switched on in Clerk and were tested up to the
  hand-off to each provider, not through a full sign-in. Try each once on a phone.
