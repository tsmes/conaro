import { Palette } from "lucide-react";
import type { ApplicationStatus, LandingEvent } from "@/lib/landing/data";

export interface EventContextStripProps {
  event: LandingEvent;
  applicationStatus: ApplicationStatus | null;
  isOpenCallToFollowedConvention: boolean;
}

function daysBetween(targetIso: string | null, today: Date): number | null {
  if (!targetIso) return null;
  const target = new Date(`${targetIso}T00:00:00Z`);
  const utcToday = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate()
  );
  return Math.ceil((target.getTime() - utcToday) / 86_400_000);
}

// Inline strip on event cards that surfaces the artist's relationship to the
// event. Renders nothing for viewers without a relationship.
export function EventContextStrip({
  event,
  applicationStatus,
  isOpenCallToFollowedConvention,
}: EventContextStripProps) {
  let message: React.ReactNode = null;

  if (applicationStatus === "accepted") {
    message = <>You&apos;re in the show. View details.</>;
  } else if (applicationStatus === "under_review") {
    message = <>Your application is under review.</>;
  } else if (applicationStatus === "submitted") {
    const daysUntilClose = daysBetween(event.applicationCloseDate, new Date());
    if (daysUntilClose !== null && daysUntilClose >= 0) {
      message = (
        <>
          Application sent. Applications close in{" "}
          <span className="font-mono">{daysUntilClose}d</span>.
        </>
      );
    } else {
      message = <>Application sent.</>;
    }
  } else if (applicationStatus === "rejected") {
    message = <>Not selected this year.</>;
  } else if (applicationStatus === "revoked") {
    message = <>Application revoked.</>;
  } else if (isOpenCallToFollowedConvention) {
    message = <>Open call · Apply now.</>;
  }

  if (!message) return null;

  return (
    <div
      data-testid="event-context-strip"
      className="mt-4 flex items-center gap-2.5 rounded-[10px] bg-primary-container/40 px-3 py-2 text-[12.5px] text-on-primary-container"
    >
      <Palette className="size-3.5 shrink-0" />
      <span className="truncate">{message}</span>
    </div>
  );
}
