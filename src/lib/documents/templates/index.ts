import { retainerAgreementTemplate } from "./retainer-agreement";
import { powerOfAttorneyTemplate } from "./power-of-attorney";
import { serviceContractTemplate } from "./service-contract";
import type { DocumentTemplate, DocumentTemplateId } from "./types";

export type {
  DocumentTemplate,
  DocumentTemplateId,
  TemplateField,
  TemplateFieldType,
} from "./types";

// The registry is consumed generically (a form collects string field values regardless of which
// template is picked), so each strongly-typed template is intentionally erased to this shared
// shape here — individual template files keep their own precise Values type.
type ErasedTemplate = DocumentTemplate<Record<string, string>>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function erase(t: DocumentTemplate<any>): ErasedTemplate {
  return t as unknown as ErasedTemplate;
}

export const DOCUMENT_TEMPLATES: Record<DocumentTemplateId, ErasedTemplate> = {
  retainer_agreement: erase(retainerAgreementTemplate),
  power_of_attorney: erase(powerOfAttorneyTemplate),
  service_contract: erase(serviceContractTemplate),
};

export const DOCUMENT_TEMPLATE_LIST = Object.values(DOCUMENT_TEMPLATES);
