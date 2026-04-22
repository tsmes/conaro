export interface FieldDefinition {
  key: string;
  label: string;
  section: "basic" | "logistics" | "portfolio";
  type: "text" | "textarea" | "email" | "phone" | "number" | "url" | "images";
  required: boolean;
}

export const FIELD_REGISTRY = [
  // Basic info
  {
    key: "displayName",
    label: "Display name",
    section: "basic",
    type: "text",
    required: true,
  },
  {
    key: "realName",
    label: "Real name",
    section: "basic",
    type: "text",
    required: false,
  },
  {
    key: "contactEmail",
    label: "Contact email",
    section: "basic",
    type: "email",
    required: true,
  },
  {
    key: "phone",
    label: "Phone number",
    section: "basic",
    type: "phone",
    required: false,
  },
  {
    key: "bio",
    label: "Bio / description",
    section: "basic",
    type: "textarea",
    required: false,
  },
  {
    key: "websiteUrl",
    label: "Website",
    section: "basic",
    type: "url",
    required: false,
  },
  {
    key: "socialLinks",
    label: "Social links",
    section: "basic",
    type: "textarea",
    required: false,
  },

  // Logistics
  {
    key: "helpers",
    label: "Number of helpers",
    section: "logistics",
    type: "number",
    required: false,
  },
  {
    key: "accessibilityNeeds",
    label: "Accessibility needs",
    section: "logistics",
    type: "textarea",
    required: false,
  },
  {
    key: "notes",
    label: "Additional notes",
    section: "logistics",
    type: "textarea",
    required: false,
  },

  // Portfolio
  {
    key: "portfolioImages",
    label: "Portfolio images",
    section: "portfolio",
    type: "images",
    required: false,
  },
] as const satisfies readonly FieldDefinition[];

export type FieldKey = (typeof FIELD_REGISTRY)[number]["key"];
export type FieldSection = FieldDefinition["section"];
