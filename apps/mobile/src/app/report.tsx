import { useState } from "react";
import { Linking, View } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Phone, ShieldOff } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import {
  Button,
  Card,
  ChipRow,
  DateTimeField,
  EmptyState,
  Input,
  PageHeading,
  Screen,
  SwitchField,
  Text,
} from "@/components/ui";
import { useSession } from "@/lib/session";
import { appSettingsQuery } from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";

// Same categories and insert as the web's src/routes/report.tsx.
const CATEGORIES = ["theft", "assault", "fraud", "harassment", "traffic", "other"];

export default function ReportScreen() {
  const { colors } = useTheme();
  const { user } = useSession();
  const { subject } = useLocalSearchParams<{ subject?: string }>();
  const settings = useQuery(appSettingsQuery);
  const [category, setCategory] = useState("theft");
  const [description, setDescription] = useState(subject ? `Sighting report — ${subject}\n\n` : "");
  const [location, setLocation] = useState("");
  const [occurredAt, setOccurredAt] = useState<Date | null>(null);
  const [anonymous, setAnonymous] = useState(!user);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!anonymous && !user) {
      toast.error("Sign in to file a named report, or choose anonymous filing.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("incident_reports").insert({
      category,
      description: description.trim(),
      location: location.trim() || null,
      occurred_at: occurredAt ? occurredAt.toISOString() : null,
      anonymous,
      reporter_id: anonymous ? null : (user?.id ?? null),
      reporter_name: anonymous ? null : (user?.fullName ?? null),
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Report filed", { description: "Police services have been notified." });
    router.back();
  };

  if (settings.data && !settings.data.incident_reporting_enabled) {
    return (
      <Screen>
        <Stack.Screen options={{ title: "Report an incident" }} />
        <EmptyState
          icon={<ShieldOff size={22} color={colors.brass} />}
          title="Incident reporting is temporarily unavailable"
          description="Please phone your nearest police station, or 999 / 112 for emergencies."
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: "Report an incident" }} />
      <PageHeading
        eyebrow="Police services"
        title="Report an incident"
        description="Your report goes to the police workspace with a reference you can follow."
      />
      <Card style={{ borderColor: `${colors.destructive}55` }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Text variant="small" style={{ flex: 1 }}>
            In an emergency, call the police first.
          </Text>
          <Button
            title="Call 999"
            size="sm"
            variant="destructive"
            icon={<Phone size={14} color={colors.destructiveForeground} />}
            onPress={() => void Linking.openURL("tel:999")}
          />
        </View>
      </Card>
      <Text variant="small" style={{ fontFamily: "PublicSans_500Medium" }}>
        Category
      </Text>
      <ChipRow
        value={category}
        onChange={setCategory}
        options={CATEGORIES.map((c) => ({ value: c, label: c[0].toUpperCase() + c.slice(1) }))}
      />
      <Input
        label="What happened?"
        value={description}
        onChangeText={setDescription}
        multiline
        maxLength={4000}
        placeholder="Describe what happened, who was involved and anything that could help."
      />
      <Input
        label="Where?"
        value={location}
        onChangeText={setLocation}
        placeholder="e.g. Kampala Road near Speke Hotel"
      />
      <DateTimeField label="When? (optional)" value={occurredAt} onChange={setOccurredAt} />
      <SwitchField
        label="File anonymously"
        description={
          user
            ? "Your name won't be attached to this report."
            : "Sign in to file a named report you can follow up on."
        }
        value={anonymous}
        onChange={(v) => (user ? setAnonymous(v) : undefined)}
      />
      <Button
        title="Submit report"
        onPress={() => void submit()}
        loading={busy}
        disabled={description.trim().length < 10}
        size="lg"
        fullWidth
      />
    </Screen>
  );
}
