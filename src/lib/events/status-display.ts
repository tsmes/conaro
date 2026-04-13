export type BadgeVariant = "default" | "secondary" | "outline";

export interface StatusDisplay {
  label: string;
  variant: BadgeVariant;
}

/**
 * Status labels shown to organizers (includes "draft").
 */
export const ORGANIZER_STATUS_LABELS: Record<string, StatusDisplay> = {
  draft: { label: "Draft", variant: "secondary" },
  published: { label: "Published", variant: "default" },
  accepting_applications: {
    label: "Accepting Applications",
    variant: "default",
  },
  reviewing: { label: "Reviewing", variant: "outline" },
  results_published: { label: "Results Published", variant: "default" },
};

/**
 * Status labels shown to artists (excludes "draft" — not visible to them).
 * "published" is shown as "Upcoming" since artists see it as a future event.
 */
export const ARTIST_STATUS_LABELS: Record<string, StatusDisplay> = {
  published: { label: "Upcoming", variant: "secondary" },
  accepting_applications: {
    label: "Accepting Applications",
    variant: "default",
  },
  reviewing: { label: "Reviewing", variant: "outline" },
  results_published: { label: "Results Published", variant: "outline" },
};
