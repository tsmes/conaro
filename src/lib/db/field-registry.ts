// Registry of toggleable fields. Each field has a source:
//   - "profile":     pulled from the artist's profile at apply time and
//                    snapshotted into applications.profileSnapshot.
//   - "application": filled in by the artist on the application form and
//                    stored in applications.answers.
// Per-event toggling lives on events.fieldRequirements (required / optional /
// not_requested). The unified registry keeps both kinds in one place so the
// organizer's field-config editor can render them together.
export interface FieldDefinition {
  key: string;
  label: string;
  section: "basic" | "logistics" | "portfolio" | "application";
  source: "profile" | "application";
  type: "text" | "textarea" | "email" | "phone" | "number" | "url" | "images";
  required: boolean;
  helpText?: string;
}

export const FIELD_REGISTRY = [
  // -------- Profile-source: Basic info --------
  {
    key: "displayName",
    label: "Display name",
    section: "basic",
    source: "profile",
    type: "text",
    required: true,
  },
  {
    key: "realName",
    label: "Real name",
    section: "basic",
    source: "profile",
    type: "text",
    required: false,
  },
  {
    key: "contactEmail",
    label: "Contact email",
    section: "basic",
    source: "profile",
    type: "email",
    required: true,
  },
  {
    key: "phone",
    label: "Phone number",
    section: "basic",
    source: "profile",
    type: "phone",
    required: false,
  },
  {
    key: "bio",
    label: "Bio / description",
    section: "basic",
    source: "profile",
    type: "textarea",
    required: false,
  },
  {
    key: "websiteUrl",
    label: "Website",
    section: "basic",
    source: "profile",
    type: "url",
    required: false,
  },
  {
    key: "socialLinks",
    label: "Social links",
    section: "basic",
    source: "profile",
    type: "textarea",
    required: false,
  },
  {
    key: "pronouns",
    label: "Pronouns",
    section: "basic",
    source: "profile",
    type: "text",
    required: false,
  },
  {
    key: "priceRange",
    label: "Typical price range",
    section: "basic",
    source: "profile",
    type: "number",
    required: false,
    helpText: "Requires both min and max price on the artist profile.",
  },
  {
    key: "genres",
    label: "Genres",
    section: "basic",
    source: "profile",
    type: "text",
    required: false,
    helpText: "Requires at least one genre tag on the artist profile.",
  },
  {
    key: "mediums",
    label: "Mediums",
    section: "basic",
    source: "profile",
    type: "text",
    required: false,
    helpText: "Requires at least one medium tag on the artist profile.",
  },

  // -------- Profile-source: Logistics --------
  {
    key: "helpers",
    label: "Number of helpers",
    section: "logistics",
    source: "profile",
    type: "number",
    required: false,
  },
  {
    key: "accessibilityNeeds",
    label: "Accessibility needs",
    section: "logistics",
    source: "profile",
    type: "textarea",
    required: false,
  },
  {
    key: "notes",
    label: "Additional notes",
    section: "logistics",
    source: "profile",
    type: "textarea",
    required: false,
  },

  // -------- Profile-source: Portfolio --------
  {
    key: "portfolioImages",
    label: "Portfolio images",
    section: "portfolio",
    source: "profile",
    type: "images",
    required: false,
  },

  // -------- Application-source: per-event answers --------
  {
    key: "tableSize",
    label: "Table size",
    section: "application",
    source: "application",
    type: "text",
    required: false,
    helpText:
      "Artist picks one of the table-size options defined on this event.",
  },
  {
    key: "assistants",
    label: "Assistants",
    section: "application",
    source: "application",
    type: "number",
    required: false,
    helpText:
      "Artist enters a count and the assistants' names (capped at the event max).",
  },
  {
    key: "sharingStand",
    label: "Sharing stand",
    section: "application",
    source: "application",
    type: "text",
    required: false,
    helpText:
      "Artist may indicate they're sharing the stand with another artist.",
  },
  {
    key: "placementPreference",
    label: "Placement preference",
    section: "application",
    source: "application",
    type: "textarea",
    required: false,
    helpText: "Free-text request for placement / neighbour at the event.",
  },
  {
    key: "additionalComments",
    label: "Additional comments",
    section: "application",
    source: "application",
    type: "textarea",
    required: false,
    helpText: "Anything else the artist wants to tell the organizer.",
  },
  {
    key: "promotionConsent",
    label: "Promotion consent",
    section: "application",
    source: "application",
    type: "text",
    required: false,
    helpText:
      "Artist consents to having their stand promoted on the event's channels.",
  },
] as const satisfies readonly FieldDefinition[];

export type FieldKey = (typeof FIELD_REGISTRY)[number]["key"];
export type FieldSection = FieldDefinition["section"];
export type FieldSource = FieldDefinition["source"];

export const PROFILE_FIELDS = FIELD_REGISTRY.filter(
  (f) => f.source === "profile"
);
export const APPLICATION_FIELDS = FIELD_REGISTRY.filter(
  (f) => f.source === "application"
);
