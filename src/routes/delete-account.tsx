import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicLayout, PageHeader } from "@/components/site/public-layout";

// The public "how do I delete my account" page that Google Play's Data safety form and the App
// Store listing link to — it has to be reachable without signing in. What it says is removed and
// kept mirrors deprovisionUser() (src/integrations/clerk/deprovisioning.server.ts) and section 7
// of the privacy policy: change the three together.
export const Route = createFileRoute("/delete-account")({
  head: () => ({
    meta: [
      { title: "Delete your account — LegalFinder" },
      {
        name: "description",
        content:
          "How to delete your LegalFinder account from the app or the website, what is removed, and what is kept.",
      },
      { property: "og:title", content: "Delete your account — LegalFinder" },
      {
        property: "og:description",
        content: "How to delete your LegalFinder account, what is removed, and what is kept.",
      },
      { name: "robots", content: "index, follow" },
    ],
  }),
  component: DeleteAccount,
});

const SUPPORT = "support@legalfinder.co";

function DeleteAccount() {
  return (
    <PublicLayout>
      <PageHeader
        eyebrow="Your data"
        title="Delete your account"
        description="You can delete your LegalFinder account yourself at any time, from the app or from this website. It takes effect immediately."
      />

      <div className="mx-auto max-w-3xl space-y-12 px-4 py-14 sm:px-6 lg:px-8">
        <section>
          <h2 className="font-display text-xl font-semibold">Delete it yourself</h2>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">
                In the app (Android, iPhone, Windows, macOS, Linux):
              </span>{" "}
              sign in, open <span className="text-foreground">More</span>, then{" "}
              <span className="text-foreground">Settings</span>, scroll to{" "}
              <span className="text-foreground">Danger zone</span>, and choose{" "}
              <span className="text-foreground">Delete my account</span>.
            </p>
            <p>
              <span className="font-medium text-foreground">On this website:</span> sign in, open{" "}
              <Link to="/settings" className="text-brass hover:underline">
                Settings
              </Link>
              , scroll to <span className="text-foreground">Danger zone</span>, and choose{" "}
              <span className="text-foreground">Delete my account</span>.
            </p>
            <p>You are asked to confirm once. After that the deletion cannot be undone.</p>
          </div>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">If you can't sign in</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Email{" "}
            <a href={`mailto:${SUPPORT}`} className="text-brass hover:underline">
              {SUPPORT}
            </a>{" "}
            from the email address your account uses and ask us to delete it. We may need to verify
            that the account is yours before acting on the request.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">What is deleted</h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
            <li>
              Your sign-in account: email address, password, two-step verification, and any linked
              Google, Apple, or LinkedIn sign-in;
            </li>
            <li>Your profile and your roles;</li>
            <li>The devices and browsers you registered for notifications;</li>
            <li>The people you blocked, and any blocks other people set on you;</li>
            <li>
              Any application for an advocate, police or judiciary account, with the identity and
              professional documents you sent with it;
            </li>
            <li>
              For advocates: your public directory listing with its reviews, your professional
              development records, and your payout details.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold">What is kept</h2>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              Case files, messages, documents, appointments, incident reports, reports of abuse,
              payment records, and audit entries you were part of are not removed automatically.
              They can form part of another person's legal or financial file — your advocate's or
              your client's, for example — and are kept as described in section 7 of the{" "}
              <Link to="/privacy-policy" className="text-brass hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
            <p>
              To ask us to remove those as well, or to ask what we hold about you, email{" "}
              <a href={`mailto:${SUPPORT}`} className="text-brass hover:underline">
                {SUPPORT}
              </a>
              .
            </p>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
