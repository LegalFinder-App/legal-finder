import { Document, Page, Text, View } from "@react-pdf/renderer";
import { z } from "zod";
import { pdfStyles, DRAFT_FOOTER } from "./pdf-styles";
import type { DocumentTemplate } from "./types";

const schema = z.object({
  principalName: z.string().min(1),
  principalAddress: z.string().min(1),
  attorneyName: z.string().min(1),
  attorneyAddress: z.string().min(1),
  powersGranted: z.string().min(1),
  effectiveDate: z.string().min(1),
  expiryDate: z.string().optional(),
  witnessName: z.string().optional(),
});

type Values = z.infer<typeof schema>;

function PowerOfAttorneyDocument(v: Values) {
  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <Text style={pdfStyles.title}>Power of Attorney</Text>
        <Text style={pdfStyles.subtitle}>Effective {v.effectiveDate}</Text>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.paragraph}>
            I, <Text style={pdfStyles.label}>{v.principalName}</Text>, of {v.principalAddress}{" "}
            ("Principal"), hereby appoint <Text style={pdfStyles.label}>{v.attorneyName}</Text>, of{" "}
            {v.attorneyAddress} ("Attorney"), as my true and lawful attorney-in-fact.
          </Text>
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.heading}>1. Powers granted</Text>
          <Text style={pdfStyles.paragraph}>{v.powersGranted}</Text>
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.heading}>2. Duration</Text>
          <Text style={pdfStyles.paragraph}>
            This Power of Attorney takes effect on {v.effectiveDate}
            {v.expiryDate
              ? ` and remains in force until ${v.expiryDate}, unless earlier revoked in writing.`
              : " and remains in force until revoked in writing by the Principal."}
          </Text>
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.heading}>3. Revocation</Text>
          <Text style={pdfStyles.paragraph}>
            The Principal may revoke this Power of Attorney at any time by written notice to the
            Attorney.
          </Text>
        </View>

        <View style={pdfStyles.signatureBlock}>
          <View style={pdfStyles.signatureLine}>
            <View style={pdfStyles.signatureRule}>
              <Text>{v.principalName} (Principal)</Text>
            </View>
          </View>
          <View style={pdfStyles.signatureLine}>
            <View style={pdfStyles.signatureRule}>
              <Text>{v.witnessName || "Witness"}</Text>
            </View>
          </View>
        </View>

        <Text style={pdfStyles.footer} fixed>
          {DRAFT_FOOTER}
        </Text>
      </Page>
    </Document>
  );
}

export const powerOfAttorneyTemplate: DocumentTemplate<Values> = {
  id: "power_of_attorney",
  title: "Power of Attorney",
  description: "Authorizes someone to act on the principal's behalf within a defined scope.",
  schema,
  fields: [
    { name: "principalName", label: "Principal name", type: "text" },
    { name: "principalAddress", label: "Principal address", type: "text" },
    { name: "attorneyName", label: "Attorney-in-fact name", type: "text" },
    { name: "attorneyAddress", label: "Attorney-in-fact address", type: "text" },
    { name: "powersGranted", label: "Powers granted", type: "textarea" },
    { name: "effectiveDate", label: "Effective date", type: "date" },
    { name: "expiryDate", label: "Expiry date (optional)", type: "date", optional: true },
    { name: "witnessName", label: "Witness name (optional)", type: "text", optional: true },
  ],
  defaultValues: {
    principalName: "",
    principalAddress: "",
    attorneyName: "",
    attorneyAddress: "",
    powersGranted: "",
    effectiveDate: "",
    expiryDate: "",
    witnessName: "",
  },
  render: (values) => <PowerOfAttorneyDocument {...values} />,
};
