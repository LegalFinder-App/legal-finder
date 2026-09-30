import type { ReactNode } from "react";
import { Linking, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { useTheme } from "@/theme/ThemeProvider";
import { fonts } from "@/theme/tokens";
import { Text } from "@/components/ui";

// Native port of the web's src/lib/markdown-lite.tsx: headings, paragraphs, **bold**, *italic*,
// [links](https://…) and "- " lists — rendered as native elements, never as injected HTML.

function openLink(url: string) {
  WebBrowser.openBrowserAsync(url).catch(() => Linking.openURL(url));
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

export function Markdown({ text }: { text: string }) {
  const { colors } = useTheme();
  const blocks: ReactNode[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];

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

  text.split("\n").forEach((raw, idx) => {
    const line = raw.trim();
    const key = `b-${idx}`;
    if (!line) {
      flushParagraph(key);
      flushList(`${key}-l`);
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
  flushParagraph("last");
  flushList("last-l");

  return <View style={{ gap: 14 }}>{blocks}</View>;
}

export { openLink };
