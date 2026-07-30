import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
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
      { name: "description", content: "Get in touch with the LegalFinder team for support, partnerships or verification queries." },
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
      <PageHeader eyebrow="Contact" title="Talk to the team" description="Support, partnerships, verification queries and press." />
      <div className="mx-auto grid max-w-5xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_1.3fr] lg:px-8">
        <div className="space-y-5 text-sm">
          <p className="flex items-center gap-3"><Mail className="h-4 w-4 text-brass" /> support@legalfinder.app</p>
          <p className="flex items-center gap-3"><Phone className="h-4 w-4 text-brass" /> +254 700 000 000</p>
          <p className="flex items-start gap-3"><MapPin className="mt-0.5 h-4 w-4 text-brass" /> Nairobi, Kenya</p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSent(true);
            toast.success("Message sent", { description: "We'll reply within two business days." });
          }}
          className="space-y-4 rounded-xl border border-border bg-card p-7 shadow-plate"
        >
          <div className="space-y-2">
            <Label htmlFor="n">Name</Label>
            <Input id="n" required maxLength={100} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="e">Email</Label>
            <Input id="e" type="email" required maxLength={255} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="m">Message</Label>
            <Textarea id="m" required maxLength={1000} rows={5} />
          </div>
          <Button type="submit" variant="brass" className="w-full">
            {sent ? "Message sent" : "Send message"}
          </Button>
        </form>
      </div>
    </PublicLayout>
  );
}