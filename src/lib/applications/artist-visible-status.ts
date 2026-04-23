import type { ApplicationStatus } from "@/lib/landing/data";

type EventStatus =
  | "draft"
  | "published"
  | "accepting_applications"
  | "reviewing"
  | "results_published";

// Artists should not see a concrete accept / reject / waitlist decision
// until the organizer publishes results. Collapse any decided status to
// 'pending' during the review phase. Pre-decision states (submitted,
// under_review) pass through unchanged, as does 'revoked' (which only
// happens post-publish anyway).
export function artistVisibleStatus(
  appStatus: ApplicationStatus,
  eventStatus: EventStatus
): ApplicationStatus | "pending" {
  if (eventStatus === "results_published") return appStatus;
  if (
    appStatus === "accepted" ||
    appStatus === "rejected" ||
    appStatus === "waitlisted"
  ) {
    return "pending";
  }
  return appStatus;
}

export type ArtistVisibleStatus = ReturnType<typeof artistVisibleStatus>;
