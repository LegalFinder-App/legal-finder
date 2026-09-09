import type { ReactElement } from "react";
import type { ZodTypeAny } from "zod";

export type DocumentTemplateId = "retainer_agreement" | "power_of_attorney" | "service_contract";

export type TemplateFieldType = "text" | "textarea" | "date" | "number";

export interface TemplateField {
  name: string;
  label: string;
  type: TemplateFieldType;
  placeholder?: string;
  optional?: boolean;
}

export interface DocumentTemplate<T extends Record<string, unknown> = Record<string, unknown>> {
  id: DocumentTemplateId;
  title: string;
  description: string;
  fields: TemplateField[];
  schema: ZodTypeAny;
  defaultValues: T;
  /** Renders the filled-in template as a react-pdf document. */
  render: (values: T) => ReactElement;
}
