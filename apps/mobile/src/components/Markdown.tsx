import { createElement, useMemo, type ReactNode } from "react";
import { Linking, Platform, Pressable, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import * as WebBrowser from "expo-web-browser";
import { WebView } from "react-native-webview";
import { useTheme } from "@/theme/ThemeProvider";
import { fonts, radius } from "@/theme/tokens";
import { Text } from "@/components/ui";

// Native port of the web's markdown dialect, plus Counsellor visuals (mermaid / https images).

function openLink(url: string) {
  WebBrowser.openBrowserAsync(url).catch(() => Linking.openURL(url));
}

function isSafeHttps(url: string) {
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

function Inline({ text }: { text: string }) {
  const { colors } = useTheme();
  const nodes: ReactNode[] = [];
  const regex = /\*\*(.+?)\*\*|\*(.+?)\*|\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g;
  let last = 0;
  let i = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text))) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    if (match[1] !== undefined) {
      nodes.push(
        <Text key={i++} style={{ fontFamily: fonts.sansBold }}>
          {match[1]}
        </Text>,
      );
    } else if (match[2] !== undefined) {
      nodes.push(
        <Text key={i++} style={{ fontStyle: "italic" }}>
          {match[2]}
        </Text>,
      );
    } else if (match[3] !== undefined && match[4] !== undefined) {
      const url = match[4];
      nodes.push(
        <Text
          key={i++}
          accessibilityRole="link"
          onPress={() => openLink(url)}
          style={{ color: colors.brass, textDecorationLine: "underline" }}
        >
          {match[3]}
        </Text>,
      );
    }
    last = regex.lastIndex;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return <>{nodes}</>;
}

function MermaidView({ code }: { code: string }) {
  const { colors } = useTheme();
  const html = useMemo(
    () => `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<script type="module">
  import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
  mermaid.initialize({ startOnLoad: true, securityLevel: "strict", theme: "neutral" });
</script>
<style>
  body { margin: 0; padding: 8px; background: transparent; font-family: system-ui, sans-serif; }
  .mermaid { display: flex; justify-content: center; }
</style></head><body>
<pre class="mermaid">${code
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")}</pre>
</body></html>`,
    [code],
  );

  return (
    <View
      style={[styles.visualCard, { borderColor: colors.border, backgroundColor: colors.card }]}
    >
      {Platform.OS === "web"
        ? createElement("iframe", {
            srcDoc: html,
            title: "Counsellor diagram",
            sandbox: "allow-scripts",
            style: {
              width: "100%",
              height: 220,
              border: "none",
              background: "transparent",
            },
          })
        : (
            <WebView
              originWhitelist={["*"]}
              source={{ html }}
              style={{ height: 220, backgroundColor: "transparent" }}
              scrollEnabled={false}
              setSupportMultipleWindows={false}
            />
          )}
      <Text variant="caption" tone="muted">
        Illustrative diagram · not an official form
      </Text>
    </View>
  );
}

function ExternalImage({ alt, src }: { alt: string; src: string }) {
  const { colors } = useTheme();
  if (!isSafeHttps(src)) {
    return (
      <Text variant="small" tone="muted">
        Skipped unsafe image link{alt ? `: ${alt}` : ""}.
      </Text>
    );
  }
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={alt || "External image"}
      onPress={() => openLink(src)}
      style={[styles.visualCard, { borderColor: colors.border, backgroundColor: colors.secondary }]}
    >
      <Image source={{ uri: src }} style={styles.image} contentFit="contain" />
      <Text variant="caption" tone="muted">
        External image · not LegalFinder
      </Text>
    </Pressable>
  );
}

export function Markdown({ text }: { text: string }) {
  const { colors } = useTheme();
  const blocks: ReactNode[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];
  let fenceLang: string | null = null;
  let fenceLines: string[] = [];

  const flushParagraph = (key: string) => {
    if (!paragraph.length) return;
    blocks.push(
      <Text key={key} style={{ lineHeight: 24 }}>
        <Inline text={paragraph.join(" ")} />
      </Text>,
    );
    paragraph = [];
  };
  const flushList = (key: string) => {
    if (!list.length) return;
    blocks.push(
      <View key={key} style={{ gap: 6 }}>
        {list.map((item, idx) => (
          <View key={idx} style={{ flexDirection: "row", gap: 10 }}>
            <Text style={{ color: colors.brass }}>•</Text>
            <Text style={{ flex: 1, lineHeight: 23 }}>
              <Inline text={item} />
            </Text>
          </View>
        ))}
      </View>,
    );
    list = [];
  };
  const flushFence = (key: string) => {
    if (fenceLang === null) return;
    const code = fenceLines.join("\n");
    const lang = fenceLang.toLowerCase();
    fenceLang = null;
    fenceLines = [];
    if (lang === "mermaid") {
      blocks.push(<MermaidView key={key} code={code} />);
      return;
    }
    blocks.push(
      <View
        key={key}
        style={[styles.visualCard, { borderColor: colors.border, backgroundColor: colors.secondary }]}
      >
        <Text variant="caption" style={{ fontFamily: fonts.mono }}>
          {code}
        </Text>
      </View>,
    );
  };

  text.split("\n").forEach((raw, idx) => {
    const key = `b-${idx}`;
    const fenceOpen = /^```([\w-]*)\s*$/.exec(raw.trim());
    if (fenceLang !== null) {
      if (fenceOpen && fenceOpen[1] === "") {
        flushFence(key);
        return;
      }
      fenceLines.push(raw);
      return;
    }
    if (fenceOpen) {
      flushParagraph(key);
      flushList(`${key}-l`);
      fenceLang = fenceOpen[1] || "text";
      fenceLines = [];
      return;
    }

    const line = raw.trim();
    if (!line) {
      flushParagraph(key);
      flushList(`${key}-l`);
      return;
    }

    const image = /^!\[([^\]]*)\]\((https:\/\/[^)\s]+)\)$/.exec(line);
    if (image) {
      flushParagraph(key);
      flushList(`${key}-l`);
      blocks.push(<ExternalImage key={key} alt={image[1]} src={image[2]} />);
      return;
    }

    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      flushParagraph(key);
      flushList(`${key}-l`);
      const variant = heading[1].length === 1 ? "h2" : "h3";
      blocks.push(
        <Text key={key} variant={variant} accessibilityRole="header" style={{ marginTop: 6 }}>
          <Inline text={heading[2]} />
        </Text>,
      );
      return;
    }
    const item = /^[-*]\s+(.*)$/.exec(line);
    if (item) {
      flushParagraph(key);
      list.push(item[1]);
      return;
    }
    flushList(`${key}-l`);
    paragraph.push(line);
  });
  flushFence("last-fence");
  flushParagraph("last");
  flushList("last-l");

  return <View style={{ gap: 14 }}>{blocks}</View>;
}

const styles = StyleSheet.create({
  visualCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.xl,
    padding: 10,
    gap: 8,
    overflow: "hidden",
  },
  image: { width: "100%", height: 200, borderRadius: radius.md },
});

export { openLink };
