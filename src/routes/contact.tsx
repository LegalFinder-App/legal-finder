import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "@/lib/toast";
import { Mail, MapPin, Phone } from "lucide-react";
import { PublicLayout } from "@/components/site/public-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { delay, trackSpotlight } from "@/lib/motion";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "LegalFinder | Contact" },
      {
        name: "description",
        content:
          "Get in touch with the LegalFinder team for support, partnerships or verification queries.",
      },
      { property: "og:title", content: "LegalFinder | Contact" },
      { property: "og:description", content: "Support, partnerships and verification queries." },
    ],
  }),
  component: Contact,
});

function Contact() {
  const [sent, setSent] = useState(false);

  return (
    <PublicLayout>
      <section className="container-page pt-2">
        <div
          onPointerMove={trackSpotlight}
          className="spotlight relative isolate overflow-hidden rounded-[2rem] surface-ink shadow-float dark:ring-1 dark:ring-white/10"
        >
          <div aria-hidden className="absolute inset-0 -z-10 bg-grid opacity-40" />
          <div
            aria-hidden
            className="animate-aurora absolute -left-16 top-8 -z-10 h-64 w-64 rounded-full bg-[oklch(0.78_0.115_80/0.16)] blur-[90px]"
          />
          <div className="px-5 py-12 sm:px-10 sm:py-14 lg:px-14 lg:py-16">
            <p className="animate-rise inline-flex items-center gap-2 rounded-full px-3 py-1 eyebrow text-brass surface-glass-ink">
              <Mail className="h-3.5 w-3.5" aria-hidden /> Contact
            </p>
            <h1
              className="animate-rise mt-4 max-w-2xl text-h1 font-bold text-ink-foreground"
              style={delay(60)}
            >
              Talk to the <span className="font-serif italic font-medium text-brass">team</span>
            </h1>
            <p
              className="animate-rise mt-4 max-w-xl text-lead text-ink-foreground/75"
              style={delay(120)}
            >
              Support, partnerships, verification queries and press.
            </p>
          </div>
        </div>
      </section>

      <div className="container-page grid gap-10 py-10 sm:py-12 lg:grid-cols-[1fr_1.35fr] lg:gap-12">
        <aside className="space-y-4">
          {[
            {
              icon: Mail,
              label: "Email",
              value: "support@legalfinder.co",
              href: "mailto:support@legalfinder.co",
            },
            { icon: Phone, label: "Phone", value: "+256 700 000 000", href: "tel:+256700000000" },
            { icon: MapPin, label: "Office", value: "Kampala, Uganda" },
          ].map((item, i) => {
            const inner = (
              <>
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-accent text-brass">
                  <item.icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {item.label}
                  </span>
                  <span className="mt-1 block text-sm font-semibold">{item.value}</span>
                </span>
              </>
            );
            const classes =
              "card-glow spotlight flex items-center gap-3 p-4 transition-colors hover:border-brass/30";
            return item.href ? (
              <a
                key={item.label}
                href={item.href}
                onPointerMove={trackSpotlight}
                className={classes}
                style={delay(i * 40)}
              >
                {inner}
              </a>
            ) : (
              <div
                key={item.label}
                onPointerMove={trackSpotlight}
                className={classes}
                style={delay(i * 40)}
              >
                {inner}
              </div>
            );
          })}
        </aside>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const name = (form.elements.namedItem("name") as HTMLInputElement).value;
            const email = (form.elements.namedItem("email") as HTMLInputElement).value;
            const message = (form.elements.namedItem("message") as HTMLTextAreaElement).value;
            window.location.href = `mailto:support@legalfinder.co?subject=${encodeURIComponent(`LegalFinder contact from ${name}`)}&body=${encodeURIComponent(`${message}\n\n— ${name} (${email})`)}`;
            setSent(true);
            toast.success("Opening your email app", {
              description: "If nothing opens, email support@legalfinder.co directly.",
            });
          }}
          onPointerMove={trackSpotlight}
          className="card-glow spotlight space-y-4 p-5 sm:p-7"
        >
          <div className="space-y-2">
            <Label htmlFor="n">Name</Label>
            <Input id="n" name="name" required maxLength={100} disabled={sent} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="e">Email</Label>
            <Input id="e" name="email" type="email" required maxLength={255} disabled={sent} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="m">Message</Label>
            <Textarea id="m" name="message" required maxLength={1000} rows={5} disabled={sent} />
          </div>
          <Button type="submit" variant="brass" className="w-full rounded-full" disabled={sent}>
            {sent ? "Message sent — check your email app" : "Send message"}
          </Button>
          {sent && (
            <p className="text-center text-xs text-muted-foreground">
              Nothing open? Email{" "}
              <a href="mailto:support@legalfinder.co" className="text-brass hover:underline">
                support@legalfinder.co
              </a>{" "}
              directly, or{" "}
              <button
                type="button"
                onClick={() => setSent(false)}
                className="text-brass hover:underline"
              >
                try again
              </button>
              .
            </p>
          )}
        </form>
      </div>
    </PublicLayout>
  );
}
