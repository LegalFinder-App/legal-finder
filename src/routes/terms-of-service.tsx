import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicLayout, PageHeader } from "@/components/site/public-layout";

export const Route = createFileRoute("/terms-of-service")({
  head: () => ({
    meta: [
      { title: "Terms of Service — LegalFinder" },
      {
        name: "description",
        content:
          "The terms governing your use of LegalFinder — the advocate directory, case management, payments, and public-interest legal information services.",
      },
      { property: "og:title", content: "Terms of Service — LegalFinder" },
      { property: "og:description", content: "The terms governing your use of LegalFinder." },
      { name: "robots", content: "index, follow" },
    ],
  }),
  component: TermsOfService,
});

const LAST_UPDATED = "October 4, 2026";

type Section = {
  id: string;
  title: string;
  body: React.ReactNode;
};

const SECTIONS: Section[] = [
  {
    id: "acceptance",
    title: "1. Acceptance of these terms",
    body: (
      <>
        <p>
          These Terms of Service ("Terms") are an agreement between you and LegalFinder
          ("LegalFinder", "we", "us", "our"), governing your access to and use of the LegalFinder
          website, desktop application, mobile applications, and related services (together, the
          "Service").
        </p>
        <p>
          By creating an account, browsing the directory, or otherwise using the Service, you agree
          to be bound by these Terms and by our{" "}
          <Link to="/privacy-policy" className="text-brass hover:underline">
            Privacy Policy
          </Link>
          . If you do not agree, do not use the Service.
        </p>
      </>
    ),
  },
  {
    id: "description",
    title: "2. What LegalFinder is",
    body: (
      <>
        <p>
          LegalFinder is a public-interest platform that connects people with verified advocates,
          courts, and police services, and publishes plain-language legal information. Depending on
          your role, the Service may let you:
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            Search and contact advocates listed in the directory, and book paid consultations;
          </li>
          <li>
            Track a case or matter, exchange messages, and share documents with an advocate or other
            party;
          </li>
          <li>
            Report an incident, or view public-interest notices such as wanted persons alerts;
          </li>
          <li>Browse court judgements, legal news, an e-library, and safety guidance;</li>
          <li>Use an AI-assisted chat feature that answers general legal questions; and</li>
          <li>
            For police, judiciary, and administrator accounts, manage records and users relevant to
            your institutional role.
          </li>
        </ul>
        <p>
          We may add, change, or remove features at any time. Some features are only available to
          specific account roles.
        </p>
      </>
    ),
  },
  {
    id: "accounts",
    title: "3. Accounts and eligibility",
    body: (
      <>
        <p>
          You must be at least 18 years old to create an account. Account authentication is handled
          by our identity provider, Clerk; your password is never stored by LegalFinder directly.
          You are responsible for maintaining the confidentiality of your credentials and for all
          activity under your account.
        </p>
        <p>
          You must provide accurate information when registering, and keep it up to date. When you
          sign up, you request a role (client, advocate, police, or judiciary). Every account starts
          as a client by default; privileged roles are only activated after review and approval by a
          LegalFinder administrator. We may refuse, suspend, or revoke a role request at our
          discretion, including after approval if we later find the request was inaccurate.
        </p>
        <p>
          One person may hold only one account. You may not share, sell, or transfer your account to
          anyone else.
        </p>
      </>
    ),
  },
  {
    id: "advocates",
    title: "4. Advocate listings and verification",
    body: (
      <>
        <p>
          Advocates who appear in the directory are independent legal professionals, not employees
          or agents of LegalFinder. A "verified" badge means the advocate's roll status was checked
          against available records at the time of listing — it is not a guarantee of an advocate's
          competence, availability, or the outcome of any matter they handle. LegalFinder is not a
          party to, and accepts no responsibility for, the professional relationship between you and
          any advocate you engage through the Service.
        </p>
        <p>
          Ratings and reviews reflect the opinions of the clients who posted them and not the view
          of LegalFinder. We may remove reviews or listings that we reasonably believe are false,
          abusive, or in breach of these Terms.
        </p>
      </>
    ),
  },
  {
    id: "not-legal-advice",
    title: "5. Not legal advice",
    body: (
      <>
        <p>
          Content on LegalFinder — including the e-library, legal news, safety guidance, court
          judgements, and responses from the AI assistant — is general information provided for
          public education. It is not legal advice, is not a substitute for advice from a qualified
          advocate who knows the specifics of your situation, and does not create an attorney-client
          relationship between you and LegalFinder or any advocate, unless and until that advocate
          expressly agrees to represent you.
        </p>
        <p>
          The AI assistant generates responses automatically and may be incorrect, incomplete, or
          out of date. Do not rely on it, or on any other content on the Service, as a substitute
          for professional legal advice in a matter that affects your rights.
        </p>
      </>
    ),
  },
  {
    id: "acceptable-use",
    title: "6. Acceptable use",
    body: (
      <>
        <p>You agree not to, and not to help anyone else:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Impersonate another person, or misrepresent your role, identity, or credentials;</li>
          <li>
            Submit a false incident report, wanted-person notice, review, or other public-interest
            content;
          </li>
          <li>
            Use the Service to harass, threaten, defame, or unlawfully discriminate against anyone;
          </li>
          <li>
            Upload malware, or attempt to gain unauthorised access to the Service or other accounts;
          </li>
          <li>
            Scrape, systematically extract, or resell data from the directory or public pages
            without our written permission;
          </li>
          <li>
            Use the Service for a purpose that is unlawful in Uganda or in your jurisdiction; or
          </li>
          <li>
            Circumvent role-based access controls or attempt to access data you are not authorised
            to see.
          </li>
        </ul>
        <p>
          We may suspend or terminate access, remove content, and where appropriate involve law
          enforcement, in response to a breach of this section.
        </p>
        <p>
          There is no tolerance for objectionable content or abusive users on LegalFinder. You can
          report a message, a review, or a person from inside the app, and block anyone from
          messaging you; public reviews are also screened automatically for abusive language. We
          review reports within 24 hours, remove content that breaches these Terms, and suspend or
          remove the accounts of the people who posted it.
        </p>
      </>
    ),
  },
  {
    id: "public-safety-content",
    title: "7. Public-interest and safety content",
    body: (
      <p>
        Incident reports and wanted-person notices are submitted by users or posted by police
        accounts for public-interest purposes. LegalFinder does not independently verify every such
        notice before publication and does not guarantee its accuracy. Everyone is presumed innocent
        unless and until proven guilty by a competent court. If you believe a notice about you is
        inaccurate or should be removed, contact us using the details in Section 16 and we will
        review it.
      </p>
    ),
  },
  {
    id: "payments",
    title: "8. Payments and fees",
    body: (
      <>
        <p>
          Consultation fees are set by individual advocates and shown to you before you pay.
          Payments are processed by our third-party payment processor, Pesapal; LegalFinder does not
          receive or store your full card or mobile-money credentials. Once a payment processor
          confirms your transaction, the booking is created.
        </p>
        <p>
          Refunds, rescheduling, and cancellation are subject to the individual advocate's own
          policy communicated to you at or before booking, and to Pesapal's own processing terms. If
          a payment fails to complete after funds were deducted, contact us with your transaction
          reference so we can investigate.
        </p>
      </>
    ),
  },
  {
    id: "content",
    title: "9. Your content",
    body: (
      <>
        <p>
          You retain ownership of the messages, documents, reviews, and other content you submit
          through the Service ("your content"). By submitting it, you grant LegalFinder a worldwide,
          non-exclusive licence to host, store, reproduce, and display it as needed to operate the
          Service — for example, to show your message to the advocate you are speaking with, or your
          review on a public listing.
        </p>
        <p>
          You are solely responsible for your content and confirm you have the right to submit it.
          Do not upload a document or message containing information you are not permitted to share
          (for example, another person's confidential records without a lawful basis to do so).
        </p>
      </>
    ),
  },
  {
    id: "third-party",
    title: "10. Third-party services",
    body: (
      <>
        <p>The Service relies on the following third-party providers to operate:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            Clerk — account authentication and sign-in, including Google and other social sign-in
            options;
          </li>
          <li>Supabase — the database that stores your account, case, and messaging data;</li>
          <li>Pesapal — payment processing for consultation fees;</li>
          <li>ImageKit — storage and delivery of images and documents you upload;</li>
          <li>Cloudflare — bot and abuse protection during sign-in;</li>
          <li>Vercel — hosting and aggregate, privacy-respecting usage analytics.</li>
        </ul>
        <p>
          Your use of features backed by these providers is also subject to their own terms. See our{" "}
          <Link to="/privacy-policy" className="text-brass hover:underline">
            Privacy Policy
          </Link>{" "}
          for how data is shared with them.
        </p>
      </>
    ),
  },
  {
    id: "intellectual-property",
    title: "11. Intellectual property",
    body: (
      <p>
        The LegalFinder name, logo, and the Service's design, code, and compiled directory data
        (excluding your own content and publicly sourced records such as court judgements) are owned
        by LegalFinder or its licensors and protected by applicable intellectual property law. You
        may not copy, modify, or create derivative works from the Service except as this Service's
        normal functionality allows.
      </p>
    ),
  },
  {
    id: "termination",
    title: "12. Suspension, termination, and account deletion",
    body: (
      <>
        <p>
          You may stop using the Service at any time. To request deletion of your account and
          associated personal data, email us at{" "}
          <a href="mailto:support@legalfinder.co" className="text-brass hover:underline">
            support@legalfinder.co
          </a>
          . An administrator can also delete an account directly, which permanently removes your
          ability to sign in; records that form part of a case, audit, or legal file may be retained
          as described in our{" "}
          <Link to="/privacy-policy" className="text-brass hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
        <p>
          We may suspend or terminate your account if we reasonably believe you have breached these
          Terms, misused the Service, or created a risk to other users, advocates, or LegalFinder.
        </p>
      </>
    ),
  },
  {
    id: "disclaimers",
    title: "13. Disclaimers and limitation of liability",
    body: (
      <>
        <p>
          The Service is provided "as is" and "as available", without warranties of any kind,
          express or implied, including as to accuracy, availability, or fitness for a particular
          purpose. We do not warrant that the Service will be uninterrupted, error-free, or free of
          harmful components.
        </p>
        <p>
          To the fullest extent permitted by law, LegalFinder will not be liable for any indirect,
          incidental, special, or consequential damages, or for any loss of data, revenue, or
          opportunity, arising from your use of the Service, an advocate's conduct or advice, or
          reliance on any content published on the Service. Nothing in these Terms limits liability
          that cannot lawfully be limited.
        </p>
      </>
    ),
  },
  {
    id: "indemnity",
    title: "14. Indemnification",
    body: (
      <p>
        You agree to indemnify and hold LegalFinder harmless from any claim, loss, or expense
        (including reasonable legal fees) arising from your breach of these Terms, your content, or
        your misuse of the Service.
      </p>
    ),
  },
  {
    id: "governing-law",
    title: "15. Governing law",
    body: (
      <p>
        These Terms are governed by the laws of the Republic of Uganda. Any dispute arising from
        these Terms or your use of the Service will be subject to the exclusive jurisdiction of the
        courts of Uganda, without prejudice to any mandatory consumer-protection rights you may have
        where you live.
      </p>
    ),
  },
  {
    id: "changes",
    title: "16. Changes to these Terms",
    body: (
      <p>
        We may update these Terms from time to time. If we make material changes, we will update the
        "Last updated" date below and, where appropriate, notify you through the Service. Continuing
        to use the Service after changes take effect means you accept the updated Terms.
      </p>
    ),
  },
  {
    id: "contact",
    title: "17. Contact us",
    body: (
      <p>
        Questions about these Terms can be sent to{" "}
        <a href="mailto:support@legalfinder.co" className="text-brass hover:underline">
          support@legalfinder.co
        </a>
        .
      </p>
    ),
  },
];

function TermsOfService() {
  return (
    <PublicLayout>
      <PageHeader
        eyebrow="Legal"
        title="Terms of Service"
        description={`Last updated ${LAST_UPDATED}. Please read these terms carefully before using LegalFinder.`}
      />

      <div className="mx-auto grid max-w-5xl gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[220px_1fr] lg:px-8">
        <nav aria-label="Table of contents" className="hidden lg:block">
          <p className="eyebrow text-brass">On this page</p>
          <ul className="mt-4 space-y-2 text-sm">
            {SECTIONS.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="text-muted-foreground transition-colors hover:text-brass"
                >
                  {section.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 space-y-12">
          {SECTIONS.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-24">
              <h2 className="font-display text-xl font-semibold">{section.title}</h2>
              <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
                {section.body}
              </div>
            </section>
          ))}
        </div>
      </div>
    </PublicLayout>
  );
}
