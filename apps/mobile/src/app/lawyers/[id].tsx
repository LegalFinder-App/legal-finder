import { useState } from "react";
import { Linking, Pressable, StyleSheet, View } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  Briefcase,
  CalendarDays,
  Languages,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  ShieldCheck,
  Star,
} from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import {
  Avatar,
  Button,
  Card,
  DateTimeField,
  Divider,
  EmptyState,
  ErrorState,
  Input,
  LoadingRows,
  Screen,
  SectionTitle,
  Sheet,
  Stars,
  StatusPill,
  Tag,
  Text,
} from "@/components/ui";
import { lawyerQuery, reviewsQuery, type Lawyer } from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/session";
import { ReportSheet } from "@/components/ReportSheet";
import { formatDate, formatUGX } from "@/lib/format";
import { payForPayment } from "@/lib/payments";
import { errorMessage, toast } from "@/lib/toast";

export default function LawyerProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const lawyer = useQuery(lawyerQuery(id));
  const reviews = useQuery(reviewsQuery(id));
  const { user } = useSession();
  const [reportingReview, setReportingReview] = useState<string | null>(null);

  if (lawyer.isLoading) {
    return (
      <Screen>
        <Stack.Screen options={{ title: "" }} />
        <LoadingRows rows={4} height={120} />
      </Screen>
    );
  }
  if (lawyer.isError) {
    return (
      <Screen>
        <ErrorState
          message={(lawyer.error as Error).message}
          onRetry={() => void lawyer.refetch()}
        />
      </Screen>
    );
  }
  const l = lawyer.data;
  if (!l) {
    return (
      <Screen>
        <EmptyState title="Advocate not found" description="This profile may have been removed." />
      </Screen>
    );
  }

  const location = [l.city, l.county].filter(Boolean).join(", ");

  return (
    <Screen
      refreshing={lawyer.isRefetching}
      onRefresh={() => {
        void lawyer.refetch();
        void reviews.refetch();
      }}
      footer={<BookingBar lawyer={l} />}
    >
      <Stack.Screen options={{ title: l.full_name }} />

      <View style={styles.hero}>
        <Avatar name={l.full_name} uri={l.photo_url} size={88} />
        <View style={styles.nameRow}>
          <Text variant="h1" align="center">
            {l.full_name}
          </Text>
          {l.verified ? (
            <BadgeCheck size={20} color={colors.brass} accessibilityLabel="Verified advocate" />
          ) : null}
        </View>
        {l.headline ? (
          <Text tone="muted" align="center">
            {l.headline}
          </Text>
        ) : null}
        <View style={styles.ratingRow}>
          <Stars value={Number(l.rating) || 0} />
          <Text variant="small" tone="muted">
            {(Number(l.rating) || 0).toFixed(1)} · {l.review_count} reviews
          </Text>
        </View>
        {!l.accepting_clients ? <StatusPill value="not accepting clients" /> : null}
      </View>

      <Card>
        <Fact icon={<Briefcase size={16} color={colors.brass} />} label="Firm" value={l.firm} />
        <Fact
          icon={<MapPin size={16} color={colors.brass} />}
          label="Location"
          value={location || null}
        />
        <Fact
          icon={<Star size={16} color={colors.brass} />}
          label="Experience"
          value={l.years_experience ? `${l.years_experience} years` : null}
        />
        <Fact
          icon={<Languages size={16} color={colors.brass} />}
          label="Languages"
          value={(l.languages ?? []).length ? (l.languages ?? []).join(", ") : null}
        />
        <Fact
          icon={<ShieldCheck size={16} color={colors.brass} />}
          label="Practising certificate"
          value={
            l.license_status === "active"
              ? "Current"
              : l.license_status === "expiring"
                ? `Expiring ${formatDate(l.bar_license_expires_at)}`
                : l.license_status === "expired"
                  ? "Expired"
                  : null
          }
        />
      </Card>

      <Card>
        <View style={styles.feeRow}>
          <View>
            <Text variant="eyebrow" tone="muted">
              Consultation
            </Text>
            <Text variant="h2" style={{ marginTop: 4 }}>
              {l.consultation_fee ? formatUGX(Number(l.consultation_fee)) : "On request"}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text variant="eyebrow" tone="muted">
              Hourly rate
            </Text>
            <Text variant="h3" style={{ marginTop: 4 }}>
              {l.hourly_rate ? formatUGX(Number(l.hourly_rate)) : "—"}
            </Text>
          </View>
        </View>
      </Card>

      {l.bio ? (
        <>
          <SectionTitle title="About" />
          <Text style={{ lineHeight: 23 }}>{l.bio}</Text>
        </>
      ) : null}

      {(l.practice_areas ?? []).length > 0 ? (
        <>
          <SectionTitle title="Practice areas" />
          <View style={styles.tags}>
            {(l.practice_areas ?? []).map((a) => (
              <Tag key={a} label={a} />
            ))}
          </View>
        </>
      ) : null}

      {l.phone || l.email ? (
        <>
          <SectionTitle title="Contact" />
          <View style={{ flexDirection: "row", gap: 10 }}>
            {l.phone ? (
              <Button
                title="Call"
                variant="outline"
                icon={<Phone size={16} color={colors.foreground} />}
                onPress={() => void Linking.openURL(`tel:${l.phone}`)}
                style={{ flex: 1 }}
              />
            ) : null}
            {l.email ? (
              <Button
                title="Email"
                variant="outline"
                icon={<Mail size={16} color={colors.foreground} />}
                onPress={() => void Linking.openURL(`mailto:${l.email}`)}
                style={{ flex: 1 }}
              />
            ) : null}
          </View>
        </>
      ) : null}

      <SectionTitle title={`Reviews (${reviews.data?.length ?? 0})`} />
      <ReviewForm lawyerId={l.id} />
      {reviews.isLoading ? (
        <LoadingRows rows={2} />
      ) : (reviews.data ?? []).length === 0 ? (
        <Text tone="muted">No reviews yet.</Text>
      ) : (
        (reviews.data ?? []).map((r) => (
          <Card key={r.id}>
            <View style={styles.reviewTop}>
              <Text variant="bodyStrong">{r.author_name ?? "Client"}</Text>
              <Stars value={r.rating} size={12} />
            </View>
            {r.comment ? <Text style={{ marginTop: 6 }}>{r.comment}</Text> : null}
            <View style={styles.reviewBottom}>
              <Text variant="caption" tone="muted">
                {formatDate(r.created_at)}
              </Text>
              {/* Anyone signed in can report a review that isn't their own. */}
              {user && r.author_id !== user.id ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Report this review"
                  onPress={() => setReportingReview(r.id)}
                  hitSlop={8}
                >
                  <Text variant="caption" tone="muted" style={{ textDecorationLine: "underline" }}>
                    Report
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </Card>
        ))
      )}
      <ReportSheet
        target={
          reportingReview ? { type: "review", id: reportingReview, label: "this review" } : null
        }
        onClose={() => setReportingReview(null)}
      />
    </Screen>
  );
}

function Fact({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <View style={styles.fact}>
      {icon}
      <Text variant="small" tone="muted" style={{ width: 130 }}>
        {label}
      </Text>
      <Text variant="small" style={{ flex: 1 }}>
        {value}
      </Text>
    </View>
  );
}

/** Sticky footer: message + book. Mirrors the web's StartConversationButton and BookingDialog. */
function BookingBar({ lawyer }: { lawyer: Lawyer }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useSession();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [when, setWhen] = useState<Date | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [messaging, setMessaging] = useState(false);
  const fee = lawyer.consultation_fee ? Number(lawyer.consultation_fee) : 0;

  const requireUser = () => {
    if (!user) {
      router.push("/(auth)/sign-in");
      return false;
    }
    return true;
  };

  const startConversation = async () => {
    if (!requireUser() || !user) return;
    if (!lawyer.user_id)
      return toast.error("This advocate is not yet available for secure messaging.");
    if (lawyer.user_id === user.id) return toast.error("You cannot message your own profile.");
    setMessaging(true);
    try {
      // Participants are stored in sorted order so each pair has exactly one conversation.
      const [a, b] =
        user.id < lawyer.user_id ? [user.id, lawyer.user_id] : [lawyer.user_id, user.id];
      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .eq("participant_a", a)
        .eq("participant_b", b)
        .maybeSingle();
      let conversationId = existing?.id;
      if (!conversationId) {
        const { data, error } = await supabase
          .from("conversations")
          .insert({
            participant_a: a,
            participant_b: b,
            subject: `Consultation with ${lawyer.full_name}`,
          })
          .select("id")
          .single();
        if (error) throw error;
        conversationId = data.id;
      }
      qc.invalidateQueries({ queryKey: ["conversations", user.id] });
      router.push(`/messages/${conversationId}`);
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't open the conversation"));
    } finally {
      setMessaging(false);
    }
  };

  const book = async () => {
    if (!user || !lawyer.user_id || !when || !subject.trim()) return;
    setBusy(true);
    try {
      const { data: appointment, error } = await supabase
        .from("appointments")
        .insert({
          client_id: user.id,
          lawyer_id: lawyer.user_id,
          lawyer_name: lawyer.full_name,
          client_name: user.fullName ?? user.email,
          subject: subject.trim(),
          notes: notes.trim(),
          scheduled_at: when.toISOString(),
        })
        .select()
        .single();
      if (error || !appointment) throw error ?? new Error("Unable to create the appointment.");
      qc.invalidateQueries({ queryKey: ["appointments"] });

      if (fee <= 0) {
        setOpen(false);
        toast.success("Consultation requested", {
          description: "You'll be notified once it's confirmed.",
        });
        return;
      }

      const { data: payment, error: paymentError } = await supabase
        .from("payments")
        .insert({
          appointment_id: appointment.id,
          client_id: user.id,
          lawyer_id: lawyer.user_id,
          amount: fee,
          currency: "UGX",
          description: `Consultation with ${lawyer.full_name}`,
        })
        .select()
        .single();
      if (paymentError || !payment) {
        setOpen(false);
        throw paymentError ?? new Error("Appointment booked, but the payment could not start.");
      }

      setOpen(false);
      const outcome = await payForPayment(payment.id);
      qc.invalidateQueries({ queryKey: ["payments"] });
      if (outcome === "completed")
        toast.success("Payment received", { description: "Your consultation fee has been paid." });
      else if (outcome === "failed")
        toast.error("Payment failed", {
          description: "The consultation fee payment didn't go through.",
        });
      else if (outcome === "pending")
        toast.message("Payment pending", {
          description: "We'll confirm once Pesapal finishes processing it.",
        });
      else
        toast.message("Payment not completed", {
          description: "Your booking is saved — you can pay later from Payments.",
        });
    } catch (error) {
      toast.error(errorMessage(error, "Couldn't book the consultation"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          // Clear the home indicator / Android navigation bar (the app is edge-to-edge).
          paddingBottom: Math.max(insets.bottom + 12, 24),
        },
      ]}
    >
      <Button
        title="Message"
        variant="outline"
        icon={<MessageSquare size={16} color={colors.foreground} />}
        loading={messaging}
        disabled={!lawyer.user_id}
        onPress={() => void startConversation()}
        style={{ flex: 1 }}
      />
      <Button
        title="Book"
        icon={<CalendarDays size={16} color={colors.brassForeground} />}
        disabled={!lawyer.accepting_clients}
        onPress={() => requireUser() && setOpen(true)}
        style={{ flex: 1.4 }}
      />

      <Sheet
        visible={open}
        onClose={() => setOpen(false)}
        title={`Book with ${lawyer.full_name}`}
        description={
          fee > 0
            ? `A ${formatUGX(fee)} consultation fee applies — you'll pay securely with Pesapal after booking.`
            : "Send a consultation request. You'll be notified once it's confirmed."
        }
      >
        {!lawyer.user_id ? (
          <Text tone="muted">
            Online booking opens once this advocate completes workspace onboarding. You can still
            contact them directly.
          </Text>
        ) : (
          <>
            <Input
              label="Subject"
              value={subject}
              onChangeText={setSubject}
              maxLength={140}
              placeholder="e.g. Land title dispute"
            />
            <DateTimeField
              label="Preferred date & time"
              value={when}
              onChange={setWhen}
              minimumDate={new Date()}
            />
            <Input
              label="Notes"
              value={notes}
              onChangeText={setNotes}
              multiline
              maxLength={1000}
              placeholder="Anything the advocate should know"
            />
            <Divider />
            <Button
              title={fee > 0 ? `Request & pay ${formatUGX(fee)}` : "Request consultation"}
              onPress={() => void book()}
              loading={busy}
              disabled={!subject.trim() || !when}
              size="lg"
              fullWidth
            />
          </>
        )}
      </Sheet>
    </View>
  );
}

function ReviewForm({ lawyerId }: { lawyerId: string }) {
  const { colors } = useTheme();
  const { user } = useSession();
  const qc = useQueryClient();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  if (!user) {
    return (
      <Pressable accessibilityRole="link" onPress={() => router.push("/(auth)/sign-in")}>
        <Text variant="small" tone="brass">
          Sign in to leave a review.
        </Text>
      </Pressable>
    );
  }

  const submit = async () => {
    setBusy(true);
    const { error } = await supabase.from("reviews").insert({
      lawyer_id: lawyerId,
      author_id: user.id,
      author_name: user.fullName ?? "Client",
      rating,
      comment: comment.trim(),
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setComment("");
    qc.invalidateQueries({ queryKey: ["reviews", lawyerId] });
    toast.success("Review posted");
  };

  return (
    <Card>
      <Text variant="bodyStrong">Leave a review</Text>
      <View
        style={styles.starPick}
        accessibilityRole="adjustable"
        accessibilityLabel={`Rating ${rating} of 5`}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable
            key={n}
            accessibilityRole="button"
            accessibilityLabel={`Rate ${n} out of 5`}
            hitSlop={6}
            onPress={() => setRating(n)}
          >
            <Star
              size={28}
              color={colors.brass}
              fill={n <= rating ? colors.brass : "transparent"}
            />
          </Pressable>
        ))}
      </View>
      <Input
        value={comment}
        onChangeText={setComment}
        multiline
        maxLength={1000}
        placeholder="Share your experience"
      />
      <Button
        title="Post review"
        size="sm"
        loading={busy}
        onPress={() => void submit()}
        style={{ marginTop: 10, alignSelf: "flex-start" }}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  reviewBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  hero: { alignItems: "center", gap: 6, marginTop: 4 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  fact: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 7 },
  feeRow: { flexDirection: "row", justifyContent: "space-between" },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  reviewTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  starPick: { flexDirection: "row", gap: 6, marginVertical: 10 },
  bar: {
    flexDirection: "row",
    gap: 10,
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
