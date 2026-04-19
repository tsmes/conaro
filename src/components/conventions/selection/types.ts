export type SelectionFilter =
  | "all"
  | "undecided"
  | "pinned"
  | "accepted"
  | "rejected";

export const SELECTION_FILTERS: {
  value: SelectionFilter;
  label: string;
}[] = [
  { value: "all", label: "All applicants" },
  { value: "undecided", label: "Undecided" },
  { value: "pinned", label: "Pinned" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Not this year" },
];

export type SelectionLayout = "gallery" | "table" | "stacked";

export interface SelectionApplicantView {
  id: string;
  profileId: string;
  status: string;
  pinned: boolean;
  paymentConfirmed: boolean;
  createdAt: Date;
  displayName: string;
  bio: string | null;
  helpers: number | null;
  accessibilityNeeds: string | null;
  tableSizePreference: string | null;
  genres: string[];
  mediums: string[];
  images: { id: string; url: string; sortOrder: number }[];
}
