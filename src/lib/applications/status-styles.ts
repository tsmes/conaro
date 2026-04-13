// Display mapping from application status to human label + badge variant.
// Extracted from the dashboard page so it can be shared with the organizer's
// applicant list, future analytics surfaces, etc.

export type ApplicationStatus =
  | "submitted"
  | "under_review"
  | "accepted"
  | "rejected"
  | "revoked";

export type StatusBadgeVariant = "default" | "secondary" | "success" | "destructive";

export interface StatusStyle {
  label: string;
  variant: StatusBadgeVariant;
}

export const STATUS_STYLES: Record<ApplicationStatus, StatusStyle> = {
  submitted: { label: "Submitted", variant: "default" },
  under_review: { label: "Under Review", variant: "secondary" },
  accepted: { label: "Accepted", variant: "success" },
  rejected: { label: "Rejected", variant: "destructive" },
  revoked: { label: "Revoked", variant: "destructive" },
};

// Fallback used when a status comes through that the map hasn't been updated
// for — keeps the UI from crashing and surfaces the raw status so the bug is
// obvious.
export function styleForStatus(status: string): StatusStyle {
  return (
    STATUS_STYLES[status as ApplicationStatus] ?? {
      label: status,
      variant: "secondary",
    }
  );
}
