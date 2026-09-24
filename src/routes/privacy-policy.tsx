import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicLayout, PageHeader } from "@/components/site/public-layout";

export const Route = createFileRoute("/privacy-policy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — LegalFinder" },
      {
        name: "description",
        content:
          "How LegalFinder collects, uses, shares, and protects your personal data across the web, desktop, and mobile applications.",
      },
      { property: "og:title", content: "Privacy Policy — LegalFinder" },
      { property: "og:description", content: "How LegalFinder handles your personal data." },
      { name: "robots", content: "index, follow" },
    ],
  }),
  component: PrivacyPolicy,
});

const LAST_UPDATED = "September 9, 2026";

type Section = {
  id: string;
  title: string;
  body: React.ReactNode;
};

const SECTIONS: Section[] = [
  {
    id: "scope",
    title: "1. Who this policy covers",
    body: (
      <p>
        This Privacy Policy explains how LegalFinder ("LegalFinder", "we", "us", "our") collects,
        uses, shares, and protects personal data when you use our website, desktop application, and
        mobile applications (together, the "Service"). It applies to clients, advocates, police and
        judiciary users, and administrators alike, except where a section says otherwise. It should
        be read together with our{" "}
        <Link to="/terms-of-service" className="text-brass hover:underline">
          Terms of Service
        </Link>
        .
      </p>
    ),
  },
  {
    id: "controller",
    title: "2. Data controller",
    body: (
      <p>
        LegalFinder, based in Kampala, Uganda, is the data controller responsible for your personal
        data under this policy. You can reach us at{" "}
        <a href="mailto:support@legalfinder.co" className="text-brass hover:underline">
          support@legalfinder.co
        </a>{" "}
        for any question about this policy or how your data is handled.
      </p>
    ),
  },
  {
    id: "data-we-collect",
    title: "3. Information we collect",
    body: (
      <>
        <p>
          <span className="font-medium text-foreground">Account and identity data.</span> When you
          sign up, our authentication provider, Clerk, collects your name, email address, and
          password (your password itself is never visible to or stored by LegalFinder). If you sign
          in with Google or another social provider, we receive the basic profile information that
          provider shares with us. We store your requested and granted role (client, advocate,
          police, judiciary, or administrator).
        </p>
        <p>
          <span className="font-medium text-foreground">Profile and directory data.</span> For
          advocates, this includes headline, firm, practice areas, languages, fees, bar number, and
          licence status shown in the public directory.
        </p>
        <p>
          <span className="font-medium text-foreground">Case, messaging, and document data.</span>{" "}
          Content you create using the Service — case details, case updates, messages with another
          user, uploaded documents, appointments, reviews, and incident reports.
        </p>
        <p>
          <span className="font-medium text-foreground">Payment data.</span> When you pay a
          consultation fee, our payment processor, Pesapal, collects your card or mobile-money
          details directly. We store only the resulting transaction reference, amount, and status —
          never your full card number or mobile-money PIN.
        </p>
        <p>
          <span className="font-medium text-foreground">Assistant conversations.</span> If you use
          the AI legal assistant, the questions you send it are processed to generate a response.
          Avoid sharing information in that chat that you would not want processed to answer your
          question.
        </p>
        <p>
          <span className="font-medium text-foreground">Device and usage data.</span> We use
          privacy-respecting, aggregate analytics (Vercel Analytics) to understand which pages and
          features are used, and to keep the Service reliable. If you enable notifications, we store
          a push-notification subscription token for your device.
        </p>
      </>
    ),
  },
  {
    id: "how-we-use",
    title: "4. How we use your information",
    body: (
      <>
        <p>We use the information above to:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Create and secure your account, and authenticate you when you sign in;</li>
          <li>Operate the directory, matching, case, messaging, and booking features;</li>
          <li>Verify advocate credentials before a listing is published;</li>
          <li>Process payments and send related receipts and confirmations;</li>
          <li>Send account, case, and appointment notifications you have opted into;</li>
          <li>
            Maintain the security, integrity, and auditability of the Service, including role-based
            access control and audit logging for administrator actions;
          </li>
          <li>Respond to support requests and legal or regulatory obligations; and</li>
          <li>Understand aggregate usage so we can improve the Service.</li>
        </ul>
      </>
    ),
  },
  {
    id: "legal-basis",
    title: "5. Our legal basis for processing",
    body: (
      <p>
        We process your data because it is necessary to perform our contract with you (providing the
        Service you signed up for), because you have given consent (for example, to receive
        notifications or use the AI assistant), because we have a legitimate interest in keeping the
        Service secure and improving it, or because we are required to by law — consistent with
        Uganda's Data Protection and Privacy Act, 2019.
      </p>
    ),
  },
  {
    id: "sharing",
    title: "6. How we share your information",
    body: (
      <>
        <p>We do not sell your personal data. We share it only:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            With the advocate, client, or other user you choose to interact with, to the extent
            needed to provide that service (for example, your message content, or the details needed
            to complete a booking);
          </li>
          <li>
            With our service providers, who process data on our behalf under contract: Clerk
            (authentication), Supabase (database hosting), Pesapal (payment processing), ImageKit
            (file storage and delivery), Cloudflare (bot/abuse protection), and Vercel (hosting and
            analytics);
          </li>
          <li>
            With law enforcement or courts where required by law, to protect someone's safety, or to
            investigate misuse of the Service — including public-interest incident reports and
            wanted-person notices, which are visible to the public by design;
          </li>
          <li>
            With your consent, or as part of a merger, acquisition, or asset sale, with notice to
            you first.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "retention",
    title: "7. How long we keep your data",
    body: (
      <p>
        We keep your data for as long as your account is active, and afterwards for as long as
        needed to comply with legal, tax, or regulatory obligations, resolve disputes, and enforce
        our agreements. If your account is deleted, your profile and role records are removed; case,
        payment, and audit records that form part of a legal or financial file may be retained for a
        longer, legally required period even after account deletion.
      </p>
    ),
  },
  {
    id: "security",
    title: "8. How we protect your data",
    body: (
      <p>
        Access to your data is enforced at the database layer through row-level security, so a given
        account can only read the records its role is permitted to see. Administrator actions that
        change roles or records are written to an audit trail. No method of transmission or storage
        is completely secure, and we cannot guarantee absolute security, but we work to protect your
        data using industry-standard practices and reputable infrastructure providers.
      </p>
    ),
  },
  {
    id: "your-rights",
    title: "9. Your rights",
    body: (
      <>
        <p>Subject to applicable law, you have the right to:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Access the personal data we hold about you;</li>
          <li>
            Correct inaccurate or incomplete data — most profile fields can be edited directly in
            the app;
          </li>
          <li>Request deletion of your account and associated personal data;</li>
          <li>Object to, or ask us to restrict, certain processing;</li>
          <li>Request a portable copy of the data you provided to us; and</li>
          <li>
            Withdraw consent at any time where processing is based on consent, such as
            notifications.
          </li>
        </ul>
        <p>
          To exercise any of these rights, email{" "}
          <a href="mailto:support@legalfinder.co" className="text-brass hover:underline">
            support@legalfinder.co
          </a>
          . We may need to verify your identity before acting on a request.
        </p>
      </>
    ),
  },
  {
    id: "childrens-privacy",
    title: "10. Children's privacy",
    body: (
      <p>
        The Service is not directed at, and we do not knowingly collect personal data from, anyone
        under 18. If you believe a child has created an account or provided us data, contact us and
        we will take appropriate steps to remove it.
      </p>
    ),
  },
  {
    id: "international-transfers",
    title: "11. International data transfers",
    body: (
      <p>
        Some of our service providers process data on infrastructure located outside Uganda. Where
        that happens, we rely on providers with appropriate contractual and security safeguards for
        handling your data.
      </p>
    ),
  },
  {
    id: "cookies",
    title: "12. Cookies and similar technologies",
    body: (
      <p>
        We use essential cookies and local storage set by our authentication provider, Clerk, to
        keep you signed in, and lightweight, privacy-respecting analytics to understand aggregate
        usage of the Service. We do not use third-party advertising cookies.
      </p>
    ),
  },
  {
    id: "changes",
    title: "13. Changes to this policy",
    body: (
      <p>
        We may update this Privacy Policy from time to time. If we make material changes, we will
        update the "Last updated" date below and, where appropriate, notify you through the Service.
        Continuing to use the Service after changes take effect means you accept the updated policy.
      </p>
    ),
  },
  {
    id: "contact",
    title: "14. Contact us",
    body: (
      <p>
        Questions, concerns, or data requests relating to this policy can be sent to{" "}
        <a href="mailto:support@legalfinder.co" className="text-brass hover:underline">
          support@legalfinder.co
        </a>
        .
      </p>
    ),
  },
];

function PrivacyPolicy() {
  return (
    <PublicLayout>
      <PageHeader
        eyebrow="Legal"
        title="Privacy Policy"
        description={`Last updated ${LAST_UPDATED}. This explains what data we collect and how it is used.`}
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
