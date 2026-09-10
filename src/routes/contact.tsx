import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "@/lib/toast";
import { Mail, MapPin, Phone } from "lucide-react";
import { PublicLayout, PageHeader } from "@/components/site/public-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact LegalFinder" },
      {
        name: "description",
        content:
          "Get in touch with the LegalFinder team for support, partnerships or verification queries.",
      },
      { property: "og:title", content: "Contact LegalFinder" },
      { property: "og:description", content: "Support, partnerships and verification queries." },
    ],
  }),
  component: Contact,
});

function Contact() {
  const [sent, setSent] = useState(false);

  return (
    <PublicLayout>
      <PageHeader
        eyebrow="Contact"
        title="Talk to the team"
        description="Support, partnerships, verification queries and press."
      />
      <div className="mx-auto grid max-w-5xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_1.3fr] lg:px-8">
        <div className="space-y-5 text-sm">
          <p className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-brass" /> support@legalfinder.co
          </p>
          <p className="flex items-center gap-3">
            <Phone className="h-4 w-4 text-brass" /> +256 700 000 000
          </p>
          <p className="flex items-start gap-3">
            <MapPin className="mt-0.5 h-4 w-4 text-brass" /> Kampala, Uganda
          </p>
        </div>
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
          className="space-y-4 rounded-xl border border-border bg-card p-7 shadow-plate"
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
          <Button type="submit" variant="brass" className="w-full" disabled={sent}>
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
