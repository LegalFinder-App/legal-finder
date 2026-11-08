import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Star,
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
import { delay } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { matchPracticeAreaMedia, siteMediaQuery } from "@/lib/site-media";
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
  const { data: siteMedia } = useQuery(siteMediaQuery);
  const practiceIllustration =
    lawyer && siteMedia ? matchPracticeAreaMedia(siteMedia, lawyer.practice_areas) : undefined;

  if (isLoading) {
    return (
      <PublicLayout>
        {/* Same footprint as the loaded header, so nothing jumps when the profile arrives. */}
        <section
          role="status"
          aria-label="Loading profile"
          className="relative isolate -mt-[calc(var(--header-h)+var(--safe-top))] min-h-dvh overflow-hidden bg-sky pt-[calc(var(--header-h)+var(--safe-top))]"
        >
          <div aria-hidden className="absolute inset-0 -z-10 bg-grid-light" />
          <div className="container-page max-w-6xl py-10 sm:py-14 lg:py-16">
            <div className="h-10 w-36 animate-pulse rounded-full bg-muted" />
            <div className="mt-8 flex flex-col items-center gap-6 lg:flex-row lg:items-end lg:gap-8">
              <div className="h-32 w-32 shrink-0 animate-pulse rounded-full bg-muted sm:h-36 sm:w-36" />
              <div className="flex w-full flex-1 flex-col items-center gap-3 lg:items-start">
                <div className="h-3 w-32 animate-pulse rounded-full bg-muted" />
                <div className="h-10 w-64 animate-pulse rounded-full bg-muted" />
                <div className="h-5 w-56 animate-pulse rounded-full bg-muted" />
                <div className="h-4 w-48 animate-pulse rounded-full bg-muted" />
              </div>
              <div className="h-12 w-full animate-pulse rounded-full bg-muted sm:w-56" />
            </div>
            <div className="mt-10 h-[9.5rem] animate-pulse rounded-3xl bg-muted sm:h-[5.75rem]" />
          </div>
        </section>
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
      <section className="relative isolate -mt-[calc(var(--header-h)+var(--safe-top))] overflow-hidden bg-sky pt-[calc(var(--header-h)+var(--safe-top))]">
        <div aria-hidden className="absolute inset-0 -z-10 bg-grid-light" />
        <div
          aria-hidden
          className="absolute -right-24 -top-24 -z-10 h-80 w-80 rounded-full bg-gold/20 blur-3xl dark:bg-gold/10"
        />
        <div className="container-page max-w-6xl py-10 sm:py-14 lg:py-16">
          <Link
            to="/lawyers"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-border bg-card/80 px-4 text-sm font-medium text-muted-foreground shadow-xs backdrop-blur transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden /> All advocates
          </Link>
          <div className="mt-8 flex flex-col items-center gap-6 text-center lg:flex-row lg:items-end lg:gap-8 lg:text-left">
            <div className="animate-rise relative shrink-0">
              <div className="h-32 w-32 overflow-hidden rounded-full bg-card shadow-raised ring-4 ring-card sm:h-36 sm:w-36">
                {lawyer.photo_url ? (
                  <img
                    src={lawyer.photo_url}
                    alt={lawyer.full_name}
                    width={144}
                    height={144}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span
                    className="grid h-full w-full place-items-center text-muted-foreground"
                    aria-label="Profile photo unavailable"
                  >
                    <UserRound className="h-12 w-12" aria-hidden="true" />
                  </span>
                )}
              </div>
              {lawyer.verified && (
                <span className="absolute bottom-1 right-1 grid h-8 w-8 place-items-center rounded-full bg-card shadow-plate">
                  <BadgeCheck className="h-6 w-6 fill-success text-card" aria-hidden />
                </span>
              )}
            </div>
            <div className="animate-rise min-w-0 flex-1" style={delay(80)}>
              <div className="flex flex-wrap items-center justify-center gap-2 lg:justify-start">
                <p className="eyebrow text-brass">{lawyer.firm ?? "Independent practice"}</p>
                {lawyer.verified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-success/12 px-2.5 py-0.5 text-xs font-semibold text-success">
                    <BadgeCheck className="h-3.5 w-3.5" aria-hidden /> Verified
                  </span>
                )}
              </div>
              <h1 className="mt-2 text-h1 font-bold">{lawyer.full_name}</h1>
              {lawyer.headline && (
                <p className="mt-2 text-lead text-muted-foreground">{lawyer.headline}</p>
              )}
              <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" aria-hidden />
                {[lawyer.city, lawyer.county].filter(Boolean).join(", ") || "Remote"}
                {lawyer.languages.length > 0 && (
                  <>
                    <span aria-hidden>·</span>
                    {lawyer.languages.join(", ")}
                  </>
                )}
              </p>
            </div>
            <div className="animate-rise w-full sm:w-auto" style={delay(160)}>
              <BookingDialog
                lawyerUserId={lawyer.user_id}
                lawyerName={lawyer.full_name}
                acceptingClients={lawyer.accepting_clients}
                consultationFee={lawyer.consultation_fee}
              />
            </div>
          </div>

          <dl
            className="animate-rise mt-10 grid grid-cols-2 overflow-hidden rounded-3xl border border-border bg-card shadow-plate sm:grid-cols-4"
            style={delay(220)}
          >
            {[
              {
                k: "Rating",
                v: (
                  <span className="inline-flex items-center gap-1.5">
                    <Star className="h-5 w-5 fill-gold text-gold" aria-hidden />
                    {lawyer.review_count > 0 ? lawyer.rating.toFixed(1) : "New"}
                  </span>
                ),
              },
              { k: "Reviews", v: lawyer.review_count.toLocaleString() },
              { k: "Experience", v: `${lawyer.years_experience} yrs` },
              {
                k: "Consultation",
                v: lawyer.consultation_fee
                  ? `UGX ${lawyer.consultation_fee.toLocaleString()}`
                  : "On request",
              },
            ].map((item, i) => (
              <div
                key={item.k}
                className={cn(
                  "px-5 py-4 text-center sm:py-5",
                  i % 2 === 1 && "border-l border-border",
                  i >= 2 && "border-t border-border sm:border-t-0",
                  i === 2 && "sm:border-l",
                )}
              >
                <dt className="text-xs font-medium text-muted-foreground">{item.k}</dt>
                <dd className="mt-1 truncate text-lg font-bold tracking-tight tabular-nums sm:text-xl">
                  {item.v}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <div className="container-page grid max-w-6xl gap-10 py-12 lg:grid-cols-[1.6fr_1fr] lg:gap-12 lg:py-16">
        <div className="space-y-12">
          <div>
            <h2 className="text-h4 font-bold">About</h2>
            <p className="mt-4 whitespace-pre-line leading-relaxed text-muted-foreground">
              {lawyer.bio ?? "This advocate has not added a biography yet."}
            </p>
          </div>

          <div>
            <h2 className="text-h4 font-bold">Practice areas</h2>
            <div className="mt-4 flex items-center gap-4">
              {practiceIllustration && (
                <img
                  src={practiceIllustration.image_url}
                  alt={practiceIllustration.alt_text}
                  loading="lazy"
                  className="h-16 w-16 shrink-0 rounded-lg bg-brass/10 p-2 shadow-plate ring-1 ring-brass/20"
                />
              )}
              <div className="flex flex-wrap gap-2">
                {lawyer.practice_areas.map((a) => (
                  <Badge key={a} variant="brass">
                    {a}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-h4 font-bold">Client reviews</h2>
            <div className="mt-5 space-y-4">
              {(reviews ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No reviews yet.</p>
              ) : (
                (reviews ?? []).map((r) => (
                  <div
                    key={r.id}
                    className="rounded-3xl border border-border bg-card p-5 shadow-xs"
                  >
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
          <div className="rounded-3xl border border-border bg-card p-6 shadow-plate lg:sticky lg:top-[calc(var(--header-h)+1.5rem)]">
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

          <div className="rounded-3xl border border-border bg-card p-6 shadow-xs">
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
        <Link to="/auth" className="text-brass underline decoration-brass/40 underline-offset-4 hover:decoration-brass">
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
