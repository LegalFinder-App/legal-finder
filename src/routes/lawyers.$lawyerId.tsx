import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  BadgeCheck,
  CalendarDays,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  UserRound,
} from "lucide-react";
import { PublicLayout } from "@/components/site/public-layout";
import { Stars, EmptyState, StatusPill } from "@/components/common/bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { lawyerQuery, reviewsQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { initiatePesapalPayment } from "@/lib/payments.functions";

export const Route = createFileRoute("/lawyers/$lawyerId")({
  head: () => ({
    meta: [
      { title: "Advocate profile — LegalFinder" },
      {
        name: "description",
        content:
          "Review an advocate's experience, practice areas, fees and client reviews, then book a consultation.",
      },
      { property: "og:title", content: "Advocate profile — LegalFinder" },
      {
        property: "og:description",
        content: "Experience, practice areas, fees and client reviews.",
      },
    ],
  }),
  component: LawyerProfile,
});

function LawyerProfile() {
  const { lawyerId } = Route.useParams();
  const { data: lawyer, isLoading } = useQuery(lawyerQuery(lawyerId));
  const { data: reviews } = useQuery(reviewsQuery(lawyerId));

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="mx-auto max-w-5xl px-4 py-24">
          <div className="h-64 animate-pulse rounded-xl bg-muted" />
        </div>
      </PublicLayout>
    );
  }

  if (!lawyer) {
    return (
      <PublicLayout>
        <div className="mx-auto max-w-2xl px-4 py-28">
          <EmptyState
            title="Advocate not found"
            description="This profile may have been removed."
            action={
              <Button asChild variant="brass">
                <Link to="/lawyers">Back to directory</Link>
              </Button>
            }
          />
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <section className="surface-ink">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-14 sm:px-6 lg:flex-row lg:items-end lg:px-8 lg:py-20">
          <div className="h-32 w-32 shrink-0 overflow-hidden rounded-xl bg-ink-foreground/10 ring-1 ring-brass/30">
            {lawyer.photo_url ? (
              <img
                src={lawyer.photo_url}
                alt={lawyer.full_name}
                className="h-full w-full object-cover"
              />
            ) : (
              <span
                className="grid h-full w-full place-items-center text-brass"
                aria-label="Profile photo unavailable"
              >
                <UserRound className="h-12 w-12" aria-hidden="true" />
              </span>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="eyebrow text-brass">{lawyer.firm ?? "Independent practice"}</p>
              {lawyer.verified && (
                <span className="inline-flex items-center gap-1 text-xs text-brass">
                  <BadgeCheck className="h-3.5 w-3.5" /> Verified
                </span>
              )}
            </div>
            <h1 className="mt-2 font-display text-4xl font-semibold text-ink-foreground">
              {lawyer.full_name}
            </h1>
            <p className="mt-2 text-ink-foreground/65">{lawyer.headline}</p>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-foreground/60">
              <span className="inline-flex items-center gap-1.5">
                <Stars value={lawyer.rating} /> {lawyer.rating.toFixed(1)} ({lawyer.review_count})
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {[lawyer.city, lawyer.county].filter(Boolean).join(", ") || "Remote"}
              </span>
              <span>{lawyer.years_experience} years in practice</span>
            </div>
          </div>
          <BookingDialog
            lawyerUserId={lawyer.user_id}
            lawyerName={lawyer.full_name}
            acceptingClients={lawyer.accepting_clients}
            consultationFee={lawyer.consultation_fee}
          />
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[1.6fr_1fr] lg:px-8">
        <div className="space-y-12">
          <div>
            <h2 className="font-display text-2xl font-semibold">About</h2>
            <p className="mt-4 whitespace-pre-line leading-relaxed text-muted-foreground">
              {lawyer.bio ?? "This advocate has not added a biography yet."}
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl font-semibold">Practice areas</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {lawyer.practice_areas.map((a) => (
                <Badge key={a} variant="brass">
                  {a}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <h2 className="font-display text-2xl font-semibold">Client reviews</h2>
            <div className="mt-5 space-y-4">
              {(reviews ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No reviews yet.</p>
              ) : (
                (reviews ?? []).map((r) => (
                  <div key={r.id} className="rounded-lg border border-border bg-card p-5">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">{r.author_name}</p>
                      <Stars value={r.rating} />
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {r.comment}
                    </p>
                  </div>
                ))
              )}
            </div>
            <ReviewForm lawyerId={lawyer.id} />
          </div>
        </div>

        <aside className="space-y-5">
          <div className="rounded-lg border border-border bg-card p-6 shadow-plate">
            <p className="eyebrow text-muted-foreground">Engagement</p>
            <dl className="mt-4 space-y-3 text-sm">
              <Row
                label="Consultation"
                value={
                  lawyer.consultation_fee
                    ? `UGX ${lawyer.consultation_fee.toLocaleString()}`
                    : "On request"
                }
              />
              <Row
                label="Hourly rate"
                value={
                  lawyer.hourly_rate ? `UGX ${lawyer.hourly_rate.toLocaleString()}` : "On request"
                }
              />
              <Row label="Languages" value={lawyer.languages.join(", ") || "English"} />
              <Row label="Bar number" value={lawyer.bar_number ?? "—"} />
            </dl>
            <div className="mt-5">
              <StatusPill value={lawyer.accepting_clients ? "accepting clients" : "waitlist"} />
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-6">
            <p className="eyebrow text-muted-foreground">Contact</p>
            <div className="mt-4 space-y-3 text-sm">
              {lawyer.email && (
                <p className="inline-flex items-center gap-2">
                  <Mail className="h-4 w-4 text-brass" /> {lawyer.email}
                </p>
              )}
              {lawyer.phone && (
                <p className="inline-flex items-center gap-2">
                  <Phone className="h-4 w-4 text-brass" /> {lawyer.phone}
                </p>
              )}
            </div>
            <StartConversationButton lawyerUserId={lawyer.user_id} lawyerName={lawyer.full_name} />
          </div>
        </aside>
      </div>
    </PublicLayout>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

function BookingDialog({
  lawyerUserId,
  lawyerName,
  acceptingClients,
  consultationFee,
}: {
  lawyerUserId: string | null;
  lawyerName: string;
  acceptingClients: boolean;
  consultationFee: number | null;
}) {
  const { user } = useSession();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [when, setWhen] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return navigate({ to: "/auth" });
    if (!lawyerUserId) {
      return toast.error("This advocate is not yet linked to a workspace account.");
    }
    setBusy(true);
    const { data: appointment, error } = await supabase
      .from("appointments")
      .insert({
        client_id: user.id,
        lawyer_id: lawyerUserId,
        lawyer_name: lawyerName,
        client_name: user.fullName ?? user.email,
        subject,
        notes,
        scheduled_at: new Date(when).toISOString(),
      })
      .select()
      .single();

    if (error || !appointment) {
      setBusy(false);
      return toast.error(error?.message ?? "Unable to create the appointment.");
    }

    qc.invalidateQueries({ queryKey: ["appointments"] });

    if (!consultationFee || consultationFee <= 0) {
      setBusy(false);
      setOpen(false);
      toast.success("Consultation requested");
      return;
    }

    // Paid consultation: create the pending payment record, then hand off to Pesapal.
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        appointment_id: appointment.id,
        client_id: user.id,
        lawyer_id: lawyerUserId,
        amount: consultationFee,
        currency: "UGX",
        description: `Consultation with ${lawyerName}`,
      })
      .select()
      .single();

    if (paymentError || !payment) {
      setBusy(false);
      toast.error(paymentError?.message ?? "Appointment booked, but the payment could not start.");
      setOpen(false);
      return;
    }

    try {
      const { redirectUrl } = await initiatePesapalPayment({ data: { paymentId: payment.id } });
      window.location.href = redirectUrl;
    } catch (paymentInitError) {
      setBusy(false);
      toast.error(
        paymentInitError instanceof Error
          ? paymentInitError.message
          : "Appointment booked, but the payment could not start.",
      );
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="brass" size="xl" disabled={!acceptingClients}>
          <CalendarDays className="h-4 w-4" /> Book consultation
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Book with {lawyerName}</DialogTitle>
          <DialogDescription>
            {consultationFee && consultationFee > 0
              ? `A UGX ${consultationFee.toLocaleString()} consultation fee applies — you'll be redirected to Pesapal to pay after booking.`
              : "Send a consultation request. You'll be notified once it's confirmed."}
          </DialogDescription>
        </DialogHeader>
        {!lawyerUserId ? (
          <p className="text-sm text-muted-foreground">
            Online booking opens once this advocate completes workspace onboarding. You can still
            contact them using the details below.
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                required
                maxLength={140}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="when">Preferred date & time</Label>
              <Input
                id="when"
                type="datetime-local"
                required
                value={when}
                onChange={(e) => setWhen(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                maxLength={1000}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <Button type="submit" variant="brass" className="w-full" disabled={busy}>
              {busy
                ? "Please wait…"
                : consultationFee && consultationFee > 0
                  ? "Request & pay for consultation"
                  : "Request consultation"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StartConversationButton({
  lawyerUserId,
  lawyerName,
}: {
  lawyerUserId: string | null;
  lawyerName: string;
}) {
  const { user } = useSession();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const startConversation = async () => {
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    if (!lawyerUserId) {
      toast.error("This advocate is not yet available for secure messaging.");
      return;
    }
    if (lawyerUserId === user.id) {
      toast.error("You cannot message your own profile.");
      return;
    }

    setBusy(true);
    const participantA = user.id < lawyerUserId ? user.id : lawyerUserId;
    const participantB = user.id < lawyerUserId ? lawyerUserId : user.id;

    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("participant_a", participantA)
      .eq("participant_b", participantB)
      .maybeSingle();

    if (existing?.id) {
      setBusy(false);
      navigate({ to: "/messages" });
      return;
    }

    const { error } = await supabase.from("conversations").insert({
      participant_a: participantA,
      participant_b: participantB,
      subject: `Consultation with ${lawyerName}`,
    });
    setBusy(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Conversation opened");
    navigate({ to: "/messages" });
  };

  return (
    <Button
      variant="outline"
      className="mt-5 w-full"
      disabled={busy || !lawyerUserId}
      onClick={() => void startConversation()}
    >
      <MessageSquare className="h-4 w-4" /> Send a message
    </Button>
  );
}

function ReviewForm({ lawyerId }: { lawyerId: string }) {
  const { user } = useSession();
  const qc = useQueryClient();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  if (!user) {
    return (
      <p className="mt-6 text-sm text-muted-foreground">
        <Link to="/auth" className="text-brass underline-offset-4 hover:underline">
          Sign in
        </Link>{" "}
        to leave a review.
      </p>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("reviews").insert({
      lawyer_id: lawyerId,
      author_id: user.id,
      author_name: user.fullName ?? "Client",
      rating,
      comment,
    });
    if (error) return toast.error(error.message);
    setComment("");
    qc.invalidateQueries({ queryKey: ["reviews", lawyerId] });
    toast.success("Review posted");
  };

  return (
    <form onSubmit={submit} className="mt-6 rounded-lg border border-border bg-card p-5">
      <p className="font-display font-semibold">Leave a review</p>
      <button type="button" className="mt-3 flex gap-1" aria-hidden="true" tabIndex={-1}>
        <Stars value={rating} />
      </button>
      <div className="mt-2 flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            aria-label={`Rate ${n} out of 5`}
            className={
              n === rating
                ? "h-7 w-7 rounded-md bg-brass/20 text-xs font-semibold"
                : "h-7 w-7 rounded-md text-xs text-muted-foreground hover:bg-secondary"
            }
          >
            {n}
          </button>
        ))}
      </div>
      <Textarea
        className="mt-3"
        maxLength={1000}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Share your experience"
      />
      <Button type="submit" variant="brass" size="sm" className="mt-3">
        Post review
      </Button>
    </form>
  );
}
