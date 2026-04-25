import Link from "next/link";
import { MapPinned } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Markdown } from "@/components/ui/markdown";
import { JoinWaitlistButton } from "@/components/events/join-waitlist-button";
import type { ApplicationStatus } from "@/lib/applications/status-styles";

interface ApplicantContextProps {
  status: ApplicationStatus;
  responseMessage: string | null;
  eventId: string;
  hasAssignedTable: boolean;
  waitlistEnabled: boolean;
}

// Slim applicant block — surfaces the organizer's response message
// and any actionable CTA (Show me my table, Join waitlist) in a
// regular Card. The hero badge announces the decision, so there's
// no celebratory framing here. Returns null when there's nothing
// useful to show.
export function ApplicantContext({
  status,
  responseMessage,
  eventId,
  hasAssignedTable,
  waitlistEnabled,
}: ApplicantContextProps) {
  const showShowTable = status === "accepted" && hasAssignedTable;
  const showWaitlistJoin = status === "rejected" && waitlistEnabled;
  const hasContent =
    Boolean(responseMessage) || showShowTable || showWaitlistJoin;
  if (!hasContent) return null;
  return (
    <Card className="p-5 md:p-6">
      {responseMessage && (
        <div>
          <p className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Message from the organizer
          </p>
          <Markdown source={responseMessage} className="text-foreground" />
        </div>
      )}
      {(showShowTable || showWaitlistJoin) && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {showShowTable && (
            <Button
              size="sm"
              nativeButton={false}
              render={
                <Link href={`/events/${eventId}/floor-plan?focus=table`}>
                  <MapPinned className="size-4" />
                  Show me my table
                </Link>
              }
            />
          )}
          {showWaitlistJoin && <JoinWaitlistButton eventId={eventId} />}
        </div>
      )}
    </Card>
  );
}
