import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, TextInput, View } from "react-native";
import { Stack, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardEvents } from "react-native-keyboard-controller";
import { useQuery } from "@tanstack/react-query";
import { SendHorizontal, ShieldCheck } from "lucide-react-native";
import { CounsellorMark } from "@/components/CounsellorMark";
import { useTheme } from "@/theme/ThemeProvider";
import { useWideLayout, wideColumn } from "@/lib/layout";
import { fonts } from "@/theme/tokens";
import { Chip, EmptyState, KeyboardLift, Text } from "@/components/ui";
import { Markdown } from "@/components/Markdown";
import { RequireAuth } from "@/components/RequireAuth";
import { AiConsentGate } from "@/components/AiConsent";
import { api, type AssistantAdvocate, type AssistantSource } from "@/lib/api";
import { mediaUrl } from "@/lib/media";
import { appSettingsQuery } from "@/lib/queries";
import { errorMessage } from "@/lib/toast";
import { Image } from "expo-image";

type Turn = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: AssistantSource[];
  advocates?: AssistantAdvocate[];
};

const STARTERS = [
  "Understand my legal rights in Uganda",
  "Find relevant Ugandan laws for employment",
  "How do I find and read court judgments?",
  "Find a verified advocate in Kampala",
  "What should I check in a legal document?",
  "First steps after an unfair dismissal",
];

const SHORTCUTS: { path: string; label: string; href: string }[] = [
  { path: "/lawyers", label: "Find an advocate", href: "/(tabs)/advocates" },
  { path: "/advice", label: "Legal guides", href: "/(tabs)/learn" },
  { path: "/judgements", label: "Judgements", href: "/judgements" },
  { path: "/report", label: "Report an incident", href: "/report" },
  { path: "/stations", label: "Police stations", href: "/stations" },
  { path: "/safety", label: "Safety tips", href: "/safety" },
];

const FOLLOW_UPS = [
  "Explain that in simpler terms",
  "What should I do next?",
  "Point me to a verified advocate",
];

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function displayText(content: string) {
  return content.replace(/\[\[cite:(advice|judgment|library):([a-zA-Z0-9_-]+)\]\]/g, "").trim();
}

function sourceHref(source: AssistantSource): string {
  if (source.kind === "advice") return "/(tabs)/learn";
  if (source.kind === "judgment") return "/judgements";
  return "/library";
}

function authorityLabel(authority: AssistantSource["authority"]) {
  if (authority === "judgment") return "Court judgment";
  if (authority === "legislation") return "Legislation";
  if (authority === "editorial") return "LegalFinder guide";
  return "Library";
}

function Counsellor() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const wide = useWideLayout();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const listRef = useRef<FlatList<Turn>>(null);

  useEffect(() => {
    const sub = KeyboardEvents.addListener("keyboardDidShow", () =>
      listRef.current?.scrollToEnd({ animated: true }),
    );
    return () => sub.remove();
  }, []);

  const ask = async (text: string) => {
    const content = text.trim();
    if (!content || thinking) return;
    const userTurn: Turn = { id: newId(), role: "user", content };
    const next = [...turns, userTurn].slice(-20);
    setTurns(next);
    setDraft("");
    setThinking(true);
    try {
      const payload = next.map(({ role, content: body }) => ({ role, content: body }));
      const { reply, sources, advocates } = await api.askAssistant(payload);
      setTurns((t) => [
        ...t,
        {
          id: newId(),
          role: "assistant",
          content: reply,
          sources: sources ?? [],
          advocates: advocates ?? [],
        },
      ]);
    } catch (error) {
      setTurns((t) => [
        ...t,
        {
          id: newId(),
          role: "assistant",
          content: `⚠️ ${errorMessage(error, "Counsellor AI couldn't respond. Please try again.")}`,
        },
      ]);
    } finally {
      setThinking(false);
    }
  };

  const lastAssistant = [...turns].reverse().find((t) => t.role === "assistant");

  return (
    <KeyboardLift style={{ flex: 1, backgroundColor: colors.background }} gap={10}>
      <View style={[{ flex: 1 }, wide && wideColumn]}>
        <FlatList
          ref={listRef}
          data={turns}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 20,
            gap: 16,
            flexGrow: 1,
          }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListHeaderComponent={
            <View style={{ gap: 10, marginBottom: 6 }}>
              <Text variant="caption" tone="muted" align="center">
                Counsellor AI · general information only — not legal advice.
              </Text>
              {turns.length > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setTurns([])}
                  style={{
                    alignSelf: "center",
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 999,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: colors.border,
                  }}
                >
                  <Text variant="small" tone="brass">
                    New conversation
                  </Text>
                </Pressable>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            <View style={{ gap: 18, marginTop: 12 }}>
              <EmptyState
                icon={<CounsellorMark size={24} color={colors.brass} />}
                title="Your questions deserve clearer answers."
                description="Explore legal information, understand judgments, and find professional help with Counsellor AI."
              />
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {STARTERS.map((s) => (
                  <Chip key={s} label={s} onPress={() => void ask(s)} />
                ))}
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {SHORTCUTS.slice(0, 4).map((s) => (
                  <Chip key={s.path} label={s.label} onPress={() => router.push(s.href as never)} />
                ))}
              </View>
            </View>
          }
          renderItem={({ item }) =>
            item.role === "user" ? (
              <View style={[styles.user, { backgroundColor: colors.brass }]}>
                <Text style={{ color: colors.brassForeground }}>{item.content}</Text>
              </View>
            ) : (
              <View
                style={[
                  styles.assistant,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Text
                  variant="caption"
                  style={{
                    color: colors.brass,
                    fontFamily: fonts.sansSemiBold,
                    letterSpacing: 0.8,
                  }}
                >
                  COUNSELLOR AI
                </Text>
                <Markdown text={displayText(item.content)} />
                {(item.sources?.length ?? 0) > 0 && (
                  <View style={{ gap: 8 }}>
                    <Text variant="caption" tone="muted">
                      Sources on LegalFinder
                    </Text>
                    {item.sources!.slice(0, 4).map((source) => (
                      <Pressable
                        key={`${source.kind}-${source.id}`}
                        accessibilityRole="button"
                        onPress={() => router.push(sourceHref(source) as never)}
                        style={[
                          styles.sourceCard,
                          { borderColor: colors.border, backgroundColor: colors.background },
                        ]}
                      >
                        <Text variant="caption" style={{ color: colors.brass }}>
                          {authorityLabel(source.authority)}
                        </Text>
                        <Text variant="small" style={{ fontFamily: fonts.sansSemiBold }}>
                          {source.title}
                        </Text>
                        {source.subtitle ? (
                          <Text variant="caption" tone="muted">
                            {source.subtitle}
                          </Text>
                        ) : null}
                      </Pressable>
                    ))}
                  </View>
                )}
                {(item.advocates?.length ?? 0) > 0 && (
                  <View style={{ gap: 8 }}>
                    <Text variant="caption" tone="muted">
                      Verified advocates
                    </Text>
                    {item.advocates!.map((advocate) => {
                      const photo = mediaUrl(advocate.photoUrl);
                      return (
                        <Pressable
                          key={advocate.id}
                          accessibilityRole="button"
                          onPress={() => router.push(`/lawyers/${advocate.id}` as never)}
                          style={[
                            styles.advocateCard,
                            { borderColor: colors.border, backgroundColor: colors.background },
                          ]}
                        >
                          <View style={[styles.avatar, { backgroundColor: colors.muted }]}>
                            {photo ? (
                              <Image
                                source={{ uri: photo }}
                                style={StyleSheet.absoluteFill}
                                contentFit="cover"
                              />
                            ) : (
                              <Text variant="small">
                                {advocate.fullName
                                  .split(/\s+/)
                                  .slice(0, 2)
                                  .map((p) => p[0]?.toUpperCase() ?? "")
                                  .join("")}
                              </Text>
                            )}
                          </View>
                          <View style={{ flex: 1, gap: 2 }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                              <Text
                                variant="small"
                                style={{ flex: 1, fontFamily: fonts.sansSemiBold }}
                              >
                                {advocate.fullName}
                              </Text>
                              {advocate.verified ? (
                                <ShieldCheck size={14} color={colors.brass} />
                              ) : null}
                            </View>
                            {advocate.headline ? (
                              <Text variant="caption" tone="muted" numberOfLines={2}>
                                {advocate.headline}
                              </Text>
                            ) : null}
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {SHORTCUTS.filter((s) => item.content.includes(s.path)).map((s) => (
                    <Chip
                      key={s.path}
                      label={s.label}
                      onPress={() => router.push(s.href as never)}
                    />
                  ))}
                </View>
              </View>
            )
          }
          ListFooterComponent={
            thinking ? (
              <View
                style={[
                  styles.assistant,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  },
                ]}
              >
                <ActivityIndicator color={colors.brass} />
                <Text tone="muted">Counsellor AI is drafting…</Text>
              </View>
            ) : lastAssistant && !lastAssistant.content.startsWith("⚠️") ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, paddingTop: 4 }}>
                {FOLLOW_UPS.map((s) => (
                  <Chip key={s} label={s} onPress={() => void ask(s)} />
                ))}
              </View>
            ) : null
          }
        />
        <View
          style={[
            styles.composer,
            {
              borderTopColor: colors.border,
              backgroundColor: colors.card,
              paddingBottom: Math.max(insets.bottom, 10),
            },
          ]}
        >
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Ask Counsellor AI…"
            placeholderTextColor={colors.mutedForeground}
            multiline
            maxLength={4000}
            accessibilityLabel="Message to Counsellor AI"
            style={[
              styles.input,
              {
                color: colors.foreground,
                backgroundColor: colors.background,
                borderColor: colors.border,
              },
            ]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send"
            disabled={!draft.trim() || thinking}
            onPress={() => void ask(draft)}
            style={[
              styles.send,
              { backgroundColor: draft.trim() && !thinking ? colors.brass : colors.muted },
            ]}
          >
            <SendHorizontal
              size={20}
              color={draft.trim() && !thinking ? colors.brassForeground : colors.mutedForeground}
            />
          </Pressable>
        </View>
      </View>
    </KeyboardLift>
  );
}

export default function AssistantScreen() {
  const { colors } = useTheme();
  const settings = useQuery(appSettingsQuery);
  return (
    <>
      <Stack.Screen options={{ title: "Counsellor AI" }} />
      {settings.data && !settings.data.ai_assistant_enabled ? (
        <View style={{ flex: 1, padding: 20, backgroundColor: colors.background }}>
          <EmptyState
            title="Counsellor AI is paused"
            description="It's temporarily unavailable. Browse the legal guides or contact an advocate in the meantime."
          />
        </View>
      ) : (
        <RequireAuth message="Sign in to use Counsellor AI.">
          <AiConsentGate
            fullScreen
            onDecline={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)"))}
          >
            <Counsellor />
          </AiConsentGate>
        </RequireAuth>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  user: {
    alignSelf: "flex-end",
    maxWidth: "88%",
    paddingHorizontal: 15,
    paddingVertical: 11,
    borderRadius: 20,
    borderBottomRightRadius: 6,
  },
  assistant: {
    alignSelf: "flex-start",
    maxWidth: "96%",
    padding: 15,
    borderRadius: 18,
    borderBottomLeftRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  sourceCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: 12,
    gap: 5,
  },
  advocateCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 14,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    minHeight: 46,
    maxHeight: 148,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 22,
  },
  send: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
});
