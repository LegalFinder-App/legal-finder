import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout, PageHeader } from "@/components/site/public-layout";
import courthouse from "@/assets/courthouse.jpg";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About LegalFinder" },
      { name: "description", content: "LegalFinder is a public-interest platform connecting people with verified advocates, courts and police services." },
      { property: "og:title", content: "About LegalFinder" },
      { property: "og:description", content: "A public-interest platform for the whole justice system." },
    ],
  }),
  component: About,
});

function About() {
  return (
    <PublicLayout>
      <PageHeader
        eyebrow="Our mission"
        title="Access to justice should not depend on who you know"
        description="LegalFinder exists to shorten the distance between a person with a legal problem and the professional who can solve it."
      />
      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8">
        <img src={courthouse} alt="Courthouse" className="rounded-xl object-cover shadow-raised" />
        <div className="space-y-5 leading-relaxed text-muted-foreground">
          <p>
            Most people meet the justice system at their worst moment — an eviction, an arrest, a
            death in the family, a contract that collapsed. They rarely know which office to walk
            into, what a matter should cost, or whether the person advising them is even on the roll.
          </p>
          <p>
            LegalFinder puts verification, pricing and case history in the open. Advocates are
            checked before publication, reviews come from real clients, and every matter carries a
            reference you can follow from filing to judgement.
          </p>
          <p>
            The platform serves five constituencies — clients, advocates, police services, the
            judiciary and administrators — each with a workspace shaped around their real work, and
            permissions enforced at the database layer rather than in the interface.
          </p>
          <p>
            It runs on the web, installs on Windows, macOS and Linux, and works on iOS and Android
            from the same codebase.
          </p>
        </div>
      </div>
    </PublicLayout>
  );
}