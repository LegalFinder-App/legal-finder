import { Document, Page, Text, View } from "@react-pdf/renderer";
import { z } from "zod";
import { pdfStyles, DRAFT_FOOTER } from "./pdf-styles";
import type { DocumentTemplate } from "./types";

const schema = z.object({
  clientName: z.string().min(1),
  clientAddress: z.string().min(1),
  advocateName: z.string().min(1),
  firmName: z.string().min(1),
  matterDescription: z.string().min(1),
  scopeOfServices: z.string().min(1),
  feeArrangement: z.string().min(1),
  retainerAmount: z.string().optional(),
  effectiveDate: z.string().min(1),
});

type Values = z.infer<typeof schema>;

function RetainerAgreementDocument(v: Values) {
  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <Text style={pdfStyles.title}>Retainer Agreement</Text>
        <Text style={pdfStyles.subtitle}>Effective {v.effectiveDate}</Text>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.paragraph}>
            This Retainer Agreement ("Agreement") is entered into between{" "}
            <Text style={pdfStyles.label}>{v.clientName}</Text>, of {v.clientAddress} ("Client"),
            and <Text style={pdfStyles.label}>{v.advocateName}</Text> of {v.firmName} ("Advocate").
          </Text>
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.heading}>1. Matter</Text>
          <Text style={pdfStyles.paragraph}>{v.matterDescription}</Text>
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.heading}>2. Scope of services</Text>
          <Text style={pdfStyles.paragraph}>{v.scopeOfServices}</Text>
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.heading}>3. Fees</Text>
          <Text style={pdfStyles.paragraph}>{v.feeArrangement}</Text>
          {v.retainerAmount ? (
            <Text style={pdfStyles.paragraph}>Retainer amount: {v.retainerAmount}</Text>
          ) : null}
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.heading}>4. Termination</Text>
          <Text style={pdfStyles.paragraph}>
            Either party may terminate this Agreement on written notice to the other, subject to
            settlement of fees owed for services rendered up to the date of termination.
          </Text>
        </View>

        <View style={pdfStyles.signatureBlock}>
          <View style={pdfStyles.signatureLine}>
            <View style={pdfStyles.signatureRule}>
              <Text>{v.clientName} (Client)</Text>
            </View>
          </View>
          <View style={pdfStyles.signatureLine}>
            <View style={pdfStyles.signatureRule}>
              <Text>{v.advocateName} (Advocate)</Text>
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

export const retainerAgreementTemplate: DocumentTemplate<Values> = {
  id: "retainer_agreement",
  title: "Retainer Agreement",
  description: "Engages an advocate for a specific matter and sets out fees and scope.",
  schema,
  fields: [
    { name: "clientName", label: "Client name", type: "text" },
    { name: "clientAddress", label: "Client address", type: "text" },
    { name: "advocateName", label: "Advocate name", type: "text" },
    { name: "firmName", label: "Firm name", type: "text" },
    { name: "matterDescription", label: "Matter description", type: "textarea" },
    { name: "scopeOfServices", label: "Scope of services", type: "textarea" },
    { name: "feeArrangement", label: "Fee arrangement", type: "textarea" },
    { name: "retainerAmount", label: "Retainer amount (optional)", type: "text", optional: true },
    { name: "effectiveDate", label: "Effective date", type: "date" },
  ],
  defaultValues: {
    clientName: "",
    clientAddress: "",
    advocateName: "",
    firmName: "",
    matterDescription: "",
    scopeOfServices: "",
    feeArrangement: "",
    retainerAmount: "",
    effectiveDate: "",
  },
  render: (values) => <RetainerAgreementDocument {...values} />,
};
