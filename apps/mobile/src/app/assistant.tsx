import { useEffect, useRef, useState } from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { Stack, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardEvents } from "react-native-keyboard-controller";
import { useQuery } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import {
  BookOpen,
  ExternalLink,
  Globe,
  Lock,
  Paperclip,
  SendHorizontal,
  ShieldCheck,
  Sparkles,
  Square,
} from "lucide-react-native";
import { CounsellorMark } from "@/components/CounsellorMark";
import { CounsellorResearch } from "@/components/CounsellorResearch";
import { useTheme } from "@/theme/ThemeProvider";
import { useWideLayout, wideColumn } from "@/lib/layout";
import { fonts, radius } from "@/theme/tokens";
import { Chip, EmptyState, KeyboardLift, Segmented, Text } from "@/components/ui";
import { Markdown } from "@/components/Markdown";
import { RequireAuth } from "@/components/RequireAuth";
import { AiConsentGate } from "@/components/AiConsent";
import {
  ApiError,
  api,
  type AssistantAdvocate,
  type AssistantSource,
  type AssistantWebSource,
} from "@/lib/api";
import { streamAssistantReply } from "@/lib/assistant-stream";
import {
  MAX_ATTACHMENTS,
  pickCounsellorImage,
  pickCounsellorPdf,
  type CounsellorAttachment,
} from "@/lib/assistant-attachments";
import { loadCounsellorTurns, saveCounsellorTurns } from "@/lib/counsellor-storage";
import { COUNSELLOR_CREATOR } from "@/lib/counsellor-meta";
import { mediaUrl } from "@/lib/media";
import { appSettingsQuery } from "@/lib/queries";
import { useSession } from "@/lib/session";
import { errorMessage, toast } from "@/lib/toast";
import { Image } from "expo-image";

type CounsellorMode = "assistant" | "research";

type Turn = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: AssistantSource[];
  advocates?: AssistantAdvocate[];
  webSources?: AssistantWebSource[];
  attachments?: CounsellorAttachment[];
};

/** Same prompt cards as web `counsellor/types.ts` PROMPT_CARDS. */
const PROMPT_CARDS = [
  {
    id: "rights",
    title: "Understand my rights",
    prompt:
      "Explain my basic legal rights in Uganda in plain language, cite any LegalFinder sources you use, and say when I should speak to a verified advocate.",
  },
  {
    id: "laws",
    title: "Employment dispute",
    prompt:
      "I may have been unfairly dismissed in Uganda. What laws and first steps should I know from LegalFinder sources, and can you suggest a matching advocate?",
  },
  {
    id: "judgments",
    title: "Read a judgment",
    prompt:
      "How do I find and read relevant Ugandan court judgments on LegalFinder, and what should I check before relying on a summary?",
  },
  {
    id: "advocate",
    title: "Find an advocate",
    prompt:
      "Recommend a verified advocate on LegalFinder for a family matter in Kampala, with a short description of why they fit.",
  },
  {
    id: "document",
    title: "Before I sign",
    prompt: "What should I check carefully in a retainer agreement before I sign in Uganda?",
  },
  {
    id: "arrest",
    title: "After an arrest",
    prompt:
      "What are my rights after an arrest in Uganda under the Constitution and related guides on LegalFinder, what should I do next, and who could help?",
  },
] as const;

const TRUST = [
  { icon: ShieldCheck, label: "Grounded in LegalFinder" },
  { icon: Lock, label: "Private on this device" },
  { icon: Sparkles, label: "Not a licensed advocate" },
] as const;

const SHORTCUTS: { path: string; label: string; href: string }[] = [
  { path: "/lawyers", label: "Advocates", href: "/(tabs)/advocates" },
  { path: "/advice", label: "Advice", href: "/(tabs)/learn" },
  { path: "/judgements", label: "Judgments", href: "/judgements" },
  { path: "/library", label: "Library", href: "/(tabs)/learn" },
];

const FOLLOW_UPS = [
  "Explain that in simpler terms",
  "What should I do next?",
  "Point me to a verified advocate",
];

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Replace [[cite:]] tokens with numbered markers so mobile Markdown stays clean. */
function displayText(content: string) {
  let n = 0;
  const order = new Map<string, number>();
  return content
    .replace(/\[\[cite:(advice|judgment|library|news):([a-zA-Z0-9_-]+)\]\]/g, (_m, kind, id) => {
      const key = `${kind}:${id}`;
      if (!order.has(key)) order.set(key, ++n);
      return ` [${order.get(key)}]`;
    })
    .trim();
}

function openExternal(url: string) {
  WebBrowser.openBrowserAsync(url).catch(() => Linking.openURL(url));
}

function openSource(source: AssistantSource) {
  if (source.kind === "news" && source.externalUrl) {
    openExternal(source.externalUrl);
    return;
  }
  if (source.externalUrl?.startsWith("http")) {
    openExternal(source.externalUrl);
    return;
  }
  if (source.kind === "advice") {
    router.push("/(tabs)/learn" as never);
    return;
  }
  if (source.kind === "judgment") {
    router.push("/judgements" as never);
    return;
  }
  router.push("/library" as never);
}

function authorityLabel(authority: AssistantSource["authority"]) {
  if (authority === "judgment") return "Court judgment";
  if (authority === "legislation") return "Legislation";
  if (authority === "editorial") return "LegalFinder guide";
  if (authority === "news") return "Official headline";
  return "Library";
}

function authorityTint(
  authority: AssistantSource["authority"],
  colors: { brass: string; success: string; muted: string; mutedForeground: string },
) {
  if (authority === "judgment") return colors.brass;
  if (authority === "legislation") return "#3b82f6";
  if (authority === "news") return colors.success;
  return colors.mutedForeground;
}

function GroundingPill({
  grounded,
  colors,
}: {
  grounded: boolean;
  colors: {
    brass: string;
    border: string;
    muted: string;
    mutedForeground: string;
    accent: string;
  };
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: grounded ? colors.brass : colors.border,
        backgroundColor: grounded ? colors.accent : colors.muted,
      }}
    >
      {grounded ? (
        <ShieldCheck size={11} color={colors.brass} />
      ) : (
        <BookOpen size={11} color={colors.mutedForeground} />
      )}
      <Text
        variant="caption"
        style={{
          color: grounded ? colors.brass : colors.mutedForeground,
          fontFamily: fonts.sansSemiBold,
          fontSize: 10,
        }}
      >
        {grounded ? "Grounded" : "General guidance"}
      </Text>
    </View>
  );
}

function Counsellor() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const wide = useWideLayout();
  const { width: windowWidth } = useWindowDimensions();
  // Split research only when there's real room (avoids crushed chat on 13" laptop browsers).
  const canSplitResearch = wide && windowWidth >= 1100;
  const { user } = useSession();
  const userId = user?.id ?? null;
  const [mode, setMode] = useState<CounsellorMode>("assistant");
  const [webSearch, setWebSearch] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<CounsellorAttachment[]>([]);
  const [thinking, setThinking] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [statusLabel, setStatusLabel] = useState("Understanding your question");
  const [researchSeed, setResearchSeed] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const listRef = useRef<FlatList<Turn>>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setWebSearch(mode === "research");
  }, [mode]);

  useEffect(() => {
    let cancelled = false;
    setHydrated(false);
    if (!userId) {
      setTurns([]);
      setHydrated(true);
      return;
    }
    void loadCounsellorTurns(userId).then((stored) => {
      if (cancelled) return;
      setTurns(stored);
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!hydrated || !userId) return;
    void saveCounsellorTurns(userId, turns);
  }, [hydrated, turns, userId]);

  useEffect(() => {
    const sub = KeyboardEvents.addListener("keyboardDidShow", () =>
      listRef.current?.scrollToEnd({ animated: true }),
    );
    return () => sub.remove();
  }, []);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const attachFile = () => {
    if (attachments.length >= MAX_ATTACHMENTS || thinking) return;
    const pick = async (kind: "image" | "pdf") => {
      try {
        const next =
          kind === "image" ? await pickCounsellorImage() : await pickCounsellorPdf();
        if (next) setAttachments((prev) => [...prev, next].slice(0, MAX_ATTACHMENTS));
      } catch (error) {
        toast.error(errorMessage(error, "Couldn't attach that file."));
      }
    };
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ["Cancel", "Photo", "PDF"], cancelButtonIndex: 0 },
        (index) => {
          if (index === 1) void pick("image");
          if (index === 2) void pick("pdf");
        },
      );
      return;
    }
    Alert.alert("Attach", undefined, [
      { text: "Photo", onPress: () => void pick("image") },
      { text: "PDF", onPress: () => void pick("pdf") },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const stop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setThinking(false);
    setStreamingId(null);
  };

  const patchAssistant = (
    assistantId: string,
    patch: Partial<Turn> | ((prev: Turn) => Partial<Turn>),
  ) => {
    setTurns((t) =>
      t.map((turn) => {
        if (turn.id !== assistantId) return turn;
        const next = typeof patch === "function" ? patch(turn) : patch;
        return { ...turn, ...next };
      }),
    );
  };

  const ask = async (text: string, askMode: CounsellorMode = mode) => {
    const content = text.trim();
    const pendingAttachments = attachments;
    if ((!content && pendingAttachments.length === 0) || thinking) return;
    // Phone Research tab hides chat — switch so the reply is visible. Desktop keeps the split.
    if (!wide) setMode("assistant");

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const userTurn: Turn = {
      id: newId(),
      role: "user",
      content: content || "(Attachment)",
      attachments: pendingAttachments.length ? pendingAttachments : undefined,
    };
    const assistantId = newId();
    const assistantTurn: Turn = { id: assistantId, role: "assistant", content: "" };
    const next = [...turns, userTurn].slice(-20);
    setTurns([...next, assistantTurn]);
    setDraft("");
    setAttachments([]);
    setThinking(true);
    setStreamingId(assistantId);
    setStatusLabel("Understanding your question");

    const payload = next.map(({ role, content: body }) => ({ role, content: body }));
    let sawDelta = false;

    const finishWithJsonFallback = async () => {
      const { reply, sources, advocates, webSources } = await api.askAssistant(payload, {
        mode: askMode,
        webSearch,
        attachments: pendingAttachments,
      });
      patchAssistant(assistantId, {
        content: reply,
        sources: sources ?? [],
        advocates: advocates ?? [],
        webSources: webSources ?? [],
      });
    };

    try {
      await streamAssistantReply(payload, {
        signal: controller.signal,
        mode: askMode,
        webSearch,
        attachments: pendingAttachments,
        onStatus: (label) => setStatusLabel(label),
        onSources: (sources) => patchAssistant(assistantId, { sources }),
        onWebSources: (webSources) => patchAssistant(assistantId, { webSources }),
        onAdvocates: (advocates) => patchAssistant(assistantId, { advocates }),
        onDelta: (chunk) => {
          sawDelta = true;
          patchAssistant(assistantId, (prev) => ({ content: `${prev.content}${chunk}` }));
        },
      });

      if (!sawDelta && !controller.signal.aborted) {
        patchAssistant(assistantId, {
          content: "I didn't get a response — please try again.",
        });
      }
    } catch (error) {
      if (controller.signal.aborted) {
        patchAssistant(assistantId, (prev) =>
          prev.content.trim()
            ? {}
            : { content: "Stopped." },
        );
      } else if (error instanceof ApiError && error.status === 404) {
        try {
          await finishWithJsonFallback();
        } catch (fallbackError) {
          patchAssistant(assistantId, {
            content: `⚠️ ${errorMessage(fallbackError, "Counsellor AI couldn't respond. Please try again.")}`,
          });
        }
      } else {
        patchAssistant(assistantId, {
          content: `⚠️ ${errorMessage(error, "Counsellor AI couldn't respond. Please try again.")}`,
        });
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setThinking(false);
      setStreamingId(null);
    }
  };

  const askAboutSource = (source: AssistantSource) => {
    const prompt = `Explain how “${source.title}” applies under Ugandan law, what it covers, and what a careful next step looks like. Prefer LegalFinder sources.`;
    void ask(prompt, "research");
  };

  const lastAssistant = [...turns].reverse().find((t) => t.role === "assistant");
  const showThinking = thinking && !turns.some((t) => t.id === streamingId && t.content);
  const showResearchPane = mode === "research";
  const splitResearch = canSplitResearch && showResearchPane;

  const chatColumn = (
    <View style={{ flex: 1 }}>
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
                {mode === "research"
                  ? "Research mode · deeper corpus grounding"
                  : "Grounded in LegalFinder’s Uganda corpus · not legal advice"}
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
            <View style={{ gap: 16, marginTop: 8, paddingBottom: 12 }}>
              <View style={{ alignItems: "center", gap: 10 }}>
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: radius["2xl"],
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: colors.brass,
                    backgroundColor: colors.accent,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <CounsellorMark size={28} color={colors.brass} />
                </View>
                <Text variant="eyebrow" tone="brass">
                  Counsellor AI
                </Text>
                <Text variant="h2" align="center">
                  Clear guidance. Grounded in Ugandan law.
                </Text>
                <Text variant="small" tone="muted" align="center">
                  Ask about process, rights, documents, or finding a verified advocate. Counsellor
                  retrieves LegalFinder publications — never invents cites.
                </Text>
                <Text variant="caption" tone="muted" align="center">
                  Created for LegalFinder by {COUNSELLOR_CREATOR}
                </Text>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                {TRUST.map(({ icon: Icon, label }) => (
                  <View
                    key={label}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: radius.full,
                      borderWidth: StyleSheet.hairlineWidth,
                      borderColor: colors.border,
                      backgroundColor: colors.card,
                    }}
                  >
                    <Icon size={12} color={colors.brass} />
                    <Text variant="caption" tone="muted">
                      {label}
                    </Text>
                  </View>
                ))}
              </View>
              <View style={{ gap: 10 }}>
                {PROMPT_CARDS.map((card) => (
                  <Pressable
                    key={card.id}
                    accessibilityRole="button"
                    disabled={thinking}
                    onPress={() => void ask(card.prompt)}
                    style={{
                      borderRadius: radius["2xl"],
                      borderWidth: StyleSheet.hairlineWidth,
                      borderColor: colors.border,
                      backgroundColor: colors.card,
                      padding: 14,
                      gap: 4,
                      opacity: thinking ? 0.6 : 1,
                    }}
                  >
                    <Text variant="bodyStrong">{card.title}</Text>
                    <Text variant="caption" tone="muted" numberOfLines={2}>
                      {card.prompt}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
                {SHORTCUTS.map((s) => (
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
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: 8,
                  }}
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
                  {item.id === streamingId ? (
                    <Text variant="caption" tone="muted">
                      Writing
                    </Text>
                  ) : !item.content.startsWith("⚠️") ? (
                    <GroundingPill
                      grounded={(item.sources?.length ?? 0) > 0}
                      colors={colors}
                    />
                  ) : null}
                </View>
                {item.content ? (
                  <Markdown text={displayText(item.content)} />
                ) : item.id === streamingId ? (
                  <Text variant="small" tone="muted">
                    {statusLabel}…
                  </Text>
                ) : null}
                {(item.webSources?.length ?? 0) > 0 && (
                  <View style={{ gap: 8 }}>
                    <Text variant="caption" tone="muted">
                      Web · verify independently
                    </Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                      {item.webSources!.slice(0, 8).map((source) => (
                        <Pressable
                          key={source.id}
                          accessibilityRole="link"
                          onPress={() => openExternal(source.url)}
                          style={[
                            styles.webChip,
                            { borderColor: colors.border, backgroundColor: colors.secondary },
                          ]}
                        >
                          <Globe size={12} color={colors.mutedForeground} />
                          <Text variant="caption" numberOfLines={1} style={{ flexShrink: 1 }}>
                            {source.title}
                          </Text>
                          <ExternalLink size={11} color={colors.brass} />
                        </Pressable>
                      ))}
                    </View>
                  </View>
                )}
                {(item.sources?.length ?? 0) > 0 && (
                  <View style={{ gap: 8 }}>
                    <Text variant="caption" tone="muted">
                      Sources on LegalFinder
                    </Text>
                    {item.sources!.slice(0, 6).map((source, index) => {
                      const tint = authorityTint(source.authority, colors);
                      const dated = source.decidedOn ?? source.publishedAt ?? null;
                      return (
                        <Pressable
                          key={`${source.kind}-${source.id}`}
                          accessibilityRole="button"
                          accessibilityLabel={`Open source ${index + 1}: ${source.title}`}
                          onPress={() => openSource(source)}
                          style={[
                            styles.sourceCard,
                            { borderColor: colors.border, backgroundColor: colors.background },
                          ]}
                        >
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 8,
                            }}
                          >
                            <Text
                              variant="caption"
                              style={{ color: tint, fontFamily: fonts.sansSemiBold, flex: 1 }}
                              numberOfLines={1}
                            >
                              {authorityLabel(source.authority)}
                            </Text>
                            <Text variant="caption" tone="muted">
                              [{index + 1}]
                            </Text>
                          </View>
                          <Text variant="small" style={{ fontFamily: fonts.sansSemiBold }}>
                            {source.title}
                          </Text>
                          {source.subtitle ? (
                            <Text variant="caption" tone="muted" numberOfLines={2}>
                              {source.subtitle}
                            </Text>
                          ) : null}
                          <View
                            style={{
                              flexDirection: "row",
                              flexWrap: "wrap",
                              gap: 8,
                              marginTop: 2,
                              alignItems: "center",
                            }}
                          >
                            {source.court ? (
                              <Text variant="caption" tone="muted">
                                {source.court}
                              </Text>
                            ) : null}
                            {dated ? (
                              <Text variant="caption" tone="muted">
                                {String(dated).slice(0, 10)}
                              </Text>
                            ) : null}
                            {source.externalUrl ? (
                              <View
                                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                              >
                                <ExternalLink size={11} color={colors.brass} />
                                <Text variant="caption" style={{ color: colors.brass }}>
                                  Open original
                                </Text>
                              </View>
                            ) : null}
                          </View>
                        </Pressable>
                      );
                    })}
                    <Text variant="caption" tone="muted">
                      Guides are editorial. Prefer the original when it matters — we do not scrape
                      ULII.
                    </Text>
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
            showThinking ? (
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
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontFamily: fonts.sansSemiBold }}>{statusLabel}</Text>
                  <Text variant="caption" tone="muted">
                    Counsellor AI is drafting a careful reply…
                  </Text>
                </View>
              </View>
            ) : !thinking && lastAssistant && !lastAssistant.content.startsWith("⚠️") ? (
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
            styles.composerWrap,
            {
              backgroundColor: colors.background,
              paddingBottom: Math.max(insets.bottom, 10),
            },
          ]}
        >
          <View
            style={{
              borderRadius: radius["2xl"],
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: colors.border,
              backgroundColor: colors.card,
              padding: 10,
              gap: 8,
            }}
          >
            {attachments.length > 0 ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {attachments.map((file) => (
                  <Pressable
                    key={file.id}
                    accessibilityLabel={`Remove ${file.name}`}
                    onPress={() => setAttachments((prev) => prev.filter((a) => a.id !== file.id))}
                    style={{
                      borderRadius: radius.lg,
                      borderWidth: StyleSheet.hairlineWidth,
                      borderColor: colors.border,
                      overflow: "hidden",
                      backgroundColor: colors.secondary,
                    }}
                  >
                    {file.kind === "image" ? (
                      <Image source={{ uri: file.url }} style={{ width: 56, height: 56 }} />
                    ) : (
                      <View style={{ paddingHorizontal: 10, paddingVertical: 8, maxWidth: 140 }}>
                        <Text variant="caption" numberOfLines={2}>
                          PDF · {file.name}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                ))}
              </View>
            ) : null}
            <View style={styles.composer}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Attach file"
                disabled={thinking || attachments.length >= MAX_ATTACHMENTS}
                onPress={attachFile}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: radius.lg,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: colors.muted,
                }}
              >
                <Paperclip size={18} color={colors.brass} />
              </Pressable>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="Ask Counsellor AI a legal question…"
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
              {thinking ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Stop generating"
                  onPress={stop}
                  style={[styles.send, { backgroundColor: colors.destructive }]}
                >
                  <Square
                    size={16}
                    color={colors.destructiveForeground}
                    fill={colors.destructiveForeground}
                  />
                </Pressable>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Send"
                  disabled={!draft.trim() && attachments.length === 0}
                  onPress={() => void ask(draft, mode === "research" ? "research" : "assistant")}
                  style={[
                    styles.send,
                    {
                      backgroundColor:
                        draft.trim() || attachments.length > 0 ? colors.brass : colors.muted,
                    },
                  ]}
                >
                  <SendHorizontal
                    size={20}
                    color={
                      draft.trim() || attachments.length > 0
                        ? colors.brassForeground
                        : colors.mutedForeground
                    }
                  />
                </Pressable>
              )}
            </View>
          </View>
          <Text
            variant="caption"
            tone="muted"
            align="center"
            style={{ paddingHorizontal: 4, paddingTop: 8 }}
          >
            Grounded replies · not legal advice · we do not scrape ULII
          </Text>
        </View>
    </View>
  );

  const researchColumn = (
    <CounsellorResearch
      userId={userId}
      seededQuery={researchSeed}
      onOpenSource={openSource}
      onAskAboutSource={askAboutSource}
      onUseInChat={(q) => {
        setDraft(q);
        setMode("assistant");
      }}
    />
  );

  return (
    <KeyboardLift style={{ flex: 1, backgroundColor: colors.background }} gap={10}>
      <View style={[{ flex: 1 }, wide && !splitResearch && wideColumn]}>
        <View
          style={{
            paddingHorizontal: 12,
            paddingTop: 8,
            paddingBottom: 6,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: colors.border,
          }}
        >
          <Segmented
            options={[
              { value: "assistant", label: "Everyday" },
              { value: "research", label: "Research" },
            ]}
            value={mode}
            onChange={(next) => {
              setMode(next);
              if (next === "research" && draft.trim()) setResearchSeed(draft.trim());
            }}
          />
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: webSearch }}
            onPress={() => setWebSearch((v) => !v)}
            style={{
              marginTop: 8,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderRadius: 12,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: webSearch ? colors.brass : colors.border,
              backgroundColor: webSearch ? colors.accent : colors.card,
            }}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="small" style={{ fontFamily: fonts.sansSemiBold }}>
                Web search
              </Text>
              <Text variant="caption" tone="muted">
                {webSearch ? "Live web · verify carefully" : "Corpus only · tap to enable"}
              </Text>
            </View>
            <Globe size={18} color={webSearch ? colors.brass : colors.mutedForeground} />
          </Pressable>
        </View>

        {splitResearch ? (
          <View style={{ flex: 1, flexDirection: "row" }}>
            <View style={{ flex: 1, minWidth: 0 }}>{chatColumn}</View>
            <View
              style={{
                flexGrow: 0,
                flexShrink: 0,
                width: Math.min(360, Math.max(280, windowWidth * 0.34)),
                borderLeftWidth: StyleSheet.hairlineWidth,
                borderLeftColor: colors.border,
              }}
            >
              {researchColumn}
            </View>
          </View>
        ) : showResearchPane ? (
          researchColumn
        ) : (
          chatColumn
        )}
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
  composerWrap: {
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 148,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.xl,
    paddingHorizontal: 14,
    paddingTop: 11,
    paddingBottom: 11,
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 22,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  webChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    maxWidth: "100%",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
});
