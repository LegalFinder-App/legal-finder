import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { PublicLayout } from "@/components/site/public-layout";
import { EmptyState } from "@/components/common/bits";
import { Button } from "@/components/ui/button";
import { adviceQuery } from "@/lib/queries";

export const Route = createFileRoute("/advice/$slug")({
  head: () => ({
    meta: [
      { title: "Legal guide — LegalFinder" },
      {
        name: "description",
        content: "A plain-language legal guide from the LegalFinder advice library.",
      },
      { property: "og:title", content: "Legal guide — LegalFinder" },
      { property: "og:description", content: "A plain-language legal guide from LegalFinder." },
      { property: "og:type", content: "article" },
    ],
  }),
  component: AdviceDetail,
});

function AdviceDetail() {
  const { slug } = Route.useParams();
  const { data, isLoading } = useQuery(adviceQuery(slug));

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="mx-auto max-w-3xl px-4 py-24">
          <div className="h-96 animate-pulse rounded-xl bg-muted" />
        </div>
      </PublicLayout>
    );
  }

  if (!data) {
    return (
      <PublicLayout>
        <div className="mx-auto max-w-2xl px-4 py-28">
          <EmptyState
            title="Guide not found"
            action={
              <Button asChild variant="brass">
                <Link to="/advice">Back to advice</Link>
              </Button>
            }
          />
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:py-20">
        <Link
          to="/advice"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-brass"
        >
          <ArrowLeft className="h-4 w-4" /> All guides
        </Link>
        <p className="mt-8 eyebrow text-brass">{data.category}</p>
        <h1 className="mt-3 font-display text-4xl font-semibold leading-tight">{data.title}</h1>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{data.summary}</p>
        <div className="mt-6 flex items-center gap-3 border-y border-border py-4 text-sm text-muted-foreground">
          <span>{data.author_name ?? "LegalFinder editorial"}</span>
          <span>·</span>
          <span>{new Date(data.created_at).toLocaleDateString()}</span>
        </div>
        {data.image_url && (
          <img src={data.image_url} alt="" className="mt-8 w-full rounded-xl object-cover" />
        )}
        <div className="mt-8 space-y-5 text-[1.02rem] leading-[1.75] text-foreground/90">
          {data.body
            .split("\n")
            .filter(Boolean)
            .map((p, i) => (
              <p key={i}>{p}</p>
            ))}
        </div>
        <div className="mt-14 rounded-xl border border-border bg-secondary/50 p-7 text-center">
          <h2 className="font-display text-xl font-semibold">Need advice on your own situation?</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Speak to a verified advocate who handles matters like this every week.
          </p>
          <Button asChild variant="brass" className="mt-5">
            <Link to="/lawyers">Find an advocate</Link>
          </Button>
        </div>
      </article>
    </PublicLayout>
  );
}
