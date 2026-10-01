import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, TextInput, View } from "react-native";
import { Stack, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardEvents } from "react-native-keyboard-controller";
import { useQuery } from "@tanstack/react-query";
import { SendHorizontal, Sparkles } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { useWideLayout, wideColumn } from "@/lib/layout";
import { fonts } from "@/theme/tokens";
import { Chip, EmptyState, KeyboardLift, Text } from "@/components/ui";
import { Markdown } from "@/components/Markdown";
import { RequireAuth } from "@/components/RequireAuth";
import { api } from "@/lib/api";
import { appSettingsQuery } from "@/lib/queries";
import { errorMessage } from "@/lib/toast";

type Turn = { role: "user" | "assistant"; content: string };

const STARTERS = [
  "What should I do after an arrest in Uganda?",
  "How do I check a land title before buying?",
  "My landlord wants to evict me — what are my rights?",
  "How much does a consultation with an advocate cost?",
];

// The assistant's system prompt points people at these web paths; offer them as in-app shortcuts.
const SHORTCUTS: { path: string; label: string; href: string }[] = [
  { path: "/lawyers", label: "Find an advocate", href: "/(tabs)/advocates" },
  { path: "/advice", label: "Legal guides", href: "/(tabs)/learn" },
  { path: "/judgements", label: "Judgements", href: "/judgements" },
  { path: "/report", label: "Report an incident", href: "/report" },
  { path: "/stations", label: "Police stations", href: "/stations" },
  { path: "/safety", label: "Safety tips", href: "/safety" },
];

function Assistant() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const wide = useWideLayout();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const listRef = useRef<FlatList<Turn>>(null);

  // The keyboard shrinks the list from the bottom; keep the latest answer in view.
  useEffect(() => {
    const sub = KeyboardEvents.addListener("keyboardDidShow", () =>
      listRef.current?.scrollToEnd({ animated: true }),
    );
    return () => sub.remove();
  }, []);

  const ask = async (text: string) => {
    const content = text.trim();
    if (!content || thinking) return;
    // The server accepts the last 20 turns; older context is dropped rather than failing.
    const next = [...turns, { role: "user" as const, content }].slice(-20);
    setTurns(next);
    setDraft("");
    setThinking(true);
    try {
      const { reply } = await api.askAssistant(next);
      setTurns((t) => [...t, { role: "assistant", content: reply }]);
    } catch (error) {
      setTurns((t) => [
        ...t,
        {
          role: "assistant",
          content: `⚠️ ${errorMessage(error, "The assistant couldn't respond. Please try again.")}`,
        },
      ]);
    } finally {
      setThinking(false);
    }
  };

  return (
    <KeyboardLift style={{ flex: 1, backgroundColor: colors.background }} gap={10}>
      <View style={[{ flex: 1 }, wide && wideColumn]}>
        <FlatList
          ref={listRef}
          data={turns}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={{ padding: 16, gap: 14, flexGrow: 1 }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListHeaderComponent={
            <Text variant="caption" tone="muted" align="center" style={{ marginBottom: 6 }}>
              General information only — not legal advice. For representation, book a verified
              advocate.
            </Text>
          }
          ListEmptyComponent={
            <View style={{ gap: 16, marginTop: 12 }}>
              <EmptyState
                icon={<Sparkles size={22} color={colors.brass} />}
                title="Ask anything about Ugandan law"
                description="Get a plain-language answer and be pointed to the right advocate, office or guide."
              />
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {STARTERS.map((s) => (
                  <Chip key={s} label={s} onPress={() => void ask(s)} />
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
                <Markdown text={item.content} />
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
                <Text tone="muted">Thinking…</Text>
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
            placeholder="Ask a legal question…"
            placeholderTextColor={colors.mutedForeground}
            multiline
            maxLength={4000}
            accessibilityLabel="Question"
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
            accessibilityLabel="Ask"
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
      <Stack.Screen options={{ title: "Legal assistant" }} />
      {settings.data && !settings.data.ai_assistant_enabled ? (
        <View style={{ flex: 1, padding: 20, backgroundColor: colors.background }}>
          <EmptyState
            title="The assistant is paused"
            description="It's temporarily unavailable. Browse the legal guides or contact an advocate in the meantime."
          />
        </View>
      ) : (
        <RequireAuth message="Sign in to ask the legal assistant.">
          <Assistant />
        </RequireAuth>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  user: {
    alignSelf: "flex-end",
    maxWidth: "85%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderBottomRightRadius: 4,
  },
  assistant: {
    alignSelf: "flex-start",
    maxWidth: "95%",
    padding: 14,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 140,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    fontFamily: fonts.sans,
    fontSize: 15,
  },
  send: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
});
