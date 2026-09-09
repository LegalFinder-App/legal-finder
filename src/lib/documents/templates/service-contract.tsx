import { Document, Page, Text, View } from "@react-pdf/renderer";
import { z } from "zod";
import { pdfStyles, DRAFT_FOOTER } from "./pdf-styles";
import type { DocumentTemplate } from "./types";

const schema = z.object({
  partyAName: z.string().min(1),
  partyAAddress: z.string().min(1),
  partyBName: z.string().min(1),
  partyBAddress: z.string().min(1),
  servicesDescription: z.string().min(1),
  paymentTerms: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().optional(),
});

type Values = z.infer<typeof schema>;

function ServiceContractDocument(v: Values) {
  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <Text style={pdfStyles.title}>Service Contract</Text>
        <Text style={pdfStyles.subtitle}>Effective {v.startDate}</Text>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.paragraph}>
            This Service Contract ("Contract") is entered into between{" "}
            <Text style={pdfStyles.label}>{v.partyAName}</Text>, of {v.partyAAddress} ("Party A"),
            and <Text style={pdfStyles.label}>{v.partyBName}</Text>, of {v.partyBAddress} ("Party
            B").
          </Text>
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.heading}>1. Services</Text>
          <Text style={pdfStyles.paragraph}>{v.servicesDescription}</Text>
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.heading}>2. Payment</Text>
          <Text style={pdfStyles.paragraph}>{v.paymentTerms}</Text>
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.heading}>3. Term</Text>
          <Text style={pdfStyles.paragraph}>
            This Contract begins on {v.startDate}
            {v.endDate ? ` and ends on ${v.endDate}.` : " and continues until completed."}
          </Text>
        </View>

        <View style={pdfStyles.signatureBlock}>
          <View style={pdfStyles.signatureLine}>
            <View style={pdfStyles.signatureRule}>
              <Text>{v.partyAName} (Party A)</Text>
            </View>
          </View>
          <View style={pdfStyles.signatureLine}>
            <View style={pdfStyles.signatureRule}>
              <Text>{v.partyBName} (Party B)</Text>
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

export const serviceContractTemplate: DocumentTemplate<Values> = {
  id: "service_contract",
  title: "Simple Service Contract",
  description: "A straightforward agreement for one party to provide services to another.",
  schema,
  fields: [
    { name: "partyAName", label: "Party A name", type: "text" },
    { name: "partyAAddress", label: "Party A address", type: "text" },
    { name: "partyBName", label: "Party B name", type: "text" },
    { name: "partyBAddress", label: "Party B address", type: "text" },
    { name: "servicesDescription", label: "Services description", type: "textarea" },
    { name: "paymentTerms", label: "Payment terms", type: "textarea" },
    { name: "startDate", label: "Start date", type: "date" },
    { name: "endDate", label: "End date (optional)", type: "date", optional: true },
  ],
  defaultValues: {
    partyAName: "",
    partyAAddress: "",
    partyBName: "",
    partyBAddress: "",
    servicesDescription: "",
    paymentTerms: "",
    startDate: "",
    endDate: "",
  },
  render: (values) => <ServiceContractDocument {...values} />,
};
