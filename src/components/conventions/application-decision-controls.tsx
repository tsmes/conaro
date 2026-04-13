"use client";

import { useActionState } from "react";
import { setApplicationDecision } from "@/app/(authenticated)/conventions/manage/events/[eventId]/applications/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ApplicationDecisionControlsProps {
  applicationId: string;
  eventId: string;
  currentStatus: string;
  eventStatus: string;
}

export function ApplicationDecisionControls({
  applicationId,
  eventId,
  currentStatus,
  eventStatus,
}: ApplicationDecisionControlsProps) {
  const [state, formAction, pending] = useActionState(
    setApplicationDecision,
    {}
  );

  const isPublished = eventStatus === "results_published";

  // After successful action, flip the display
  const displayStatus = state.success
    ? state.success && currentStatus === "accepted"
      ? "rejected"
      : currentStatus === "rejected"
        ? "accepted"
        : currentStatus
    : currentStatus;

  if (isPublished) {
    const label =
      displayStatus === "accepted"
        ? "Accepted"
        : displayStatus === "rejected"
          ? "Rejected"
          : displayStatus === "revoked"
            ? "Revoked"
            : displayStatus;
    return <Badge variant="secondary">{label}</Badge>;
  }

  return (
    <div className="space-y-2">
      {state.error && (
        <div
          className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
          role="alert"
        >
          {state.error}
        </div>
      )}

      <div className="flex gap-2">
        <form action={formAction}>
          <input type="hidden" name="applicationId" value={applicationId} />
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="decision" value="accepted" />
          <Button
            type="submit"
            size="sm"
            variant={currentStatus === "accepted" ? "default" : "outline"}
            disabled={pending}
          >
            {currentStatus === "accepted" ? "Accepted" : "Accept"}
          </Button>
        </form>
        <form action={formAction}>
          <input type="hidden" name="applicationId" value={applicationId} />
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="decision" value="rejected" />
          <Button
            type="submit"
            size="sm"
            variant={currentStatus === "rejected" ? "destructive" : "outline"}
            disabled={pending}
          >
            {currentStatus === "rejected" ? "Rejected" : "Reject"}
          </Button>
        </form>
      </div>
    </div>
  );
}
