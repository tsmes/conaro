export type ApplicationStatus =
  | "submitted"
  | "under_review"
  | "accepted"
  | "rejected"
  | "revoked"
  | "waitlisted";

export type SelectionFilter =
  | "all"
  | "undecided"
  | "pinned"
  | "accepted"
  | "waitlisted"
  | "rejected";

export const SELECTION_FILTERS: {
  value: SelectionFilter;
  label: string;
}[] = [
  { value: "all", label: "All applicants" },
  { value: "undecided", label: "Undecided" },
  { value: "pinned", label: "Pinned" },
  { value: "accepted", label: "Accepted" },
  { value: "waitlisted", label: "Waitlisted" },
  { value: "rejected", label: "Not this year" },
];

export type SelectionLayout = "gallery" | "table" | "stacked";

// Resolved per-application answers for organizer review. Table size is
// looked up against the event's tableSizeOptions at page-load time so the
// label stays meaningful even if the option is later renamed.
export interface ApplicationAnswersView {
  tableSizeLabel: string | null;
  tableSizeDimensions: string | null;
  tableSizePriceNok: number | null;
  assistantsCount: number | null;
  assistantsNames: string[];
  sharingStand: { sharing: boolean; with: string | null } | null;
  placementPreference: string | null;
  additionalComments: string | null;
  promotionConsent: boolean | null;
  guidelinesAcknowledgedAt: Date | null;
}

export interface SelectionApplicantView {
  id: string;
  profileId: string;
  status: ApplicationStatus;
  pinned: boolean;
  paymentConfirmed: boolean;
  createdAt: Date;
  displayName: string;
  bio: string | null;
  helpers: number | null;
  accessibilityNeeds: string | null;
  genres: string[];
  mediums: string[];
  images: {
    id: string;
    url: string;
    sortOrder: number;
    caption: string | null;
  }[];
  answers: ApplicationAnswersView;
}
