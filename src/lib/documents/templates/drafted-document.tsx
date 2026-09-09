import { Document, Page, Text } from "@react-pdf/renderer";
import { pdfStyles, DRAFT_FOOTER } from "./pdf-styles";

/** Wraps AI-drafted or freehand body text in the same print-ready layout as the fixed templates. */
export function DraftedDocument({ title, bodyText }: { title: string; bodyText: string }) {
  const paragraphs = bodyText
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <Text style={pdfStyles.title}>{title}</Text>
        {paragraphs.map((p, i) => (
          <Text key={i} style={pdfStyles.paragraph}>
            {p}
          </Text>
        ))}
        <Text style={pdfStyles.footer} fixed>
          {DRAFT_FOOTER}
        </Text>
      </Page>
    </Document>
  );
}
