"use client";

import { useActionState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  demoteToWaitlist,
  promoteFromWaitlist,
  removeFromWaitlist,
} from "@/app/(authenticated)/conventions/manage/events/[eventId]/applications/waitlist-actions";
import type { ApplicationStatus } from "./types";

// Post-publish waitlist controls. Only rendered when the convention has
// waitlistEnabled and the event is in 'results_published' status.
export function WaitlistControls({
  applicationId,
  eventId,
  status,
}: {
  applicationId: string;
  eventId: string;
  status: ApplicationStatus;
}) {
  const [promoteState, promoteAction, promotePending] = useActionState(
    promoteFromWaitlist,
    {}
  );
  const [demoteState, demoteAction, demotePending] = useActionState(
    demoteToWaitlist,
    {}
  );
  const [removeState, removeAction, removePending] = useActionState(
    removeFromWaitlist,
    {}
  );
  const [, startTransition] = useTransition();

  const error =
    promoteState.error ?? demoteState.error ?? removeState.error ?? null;
  const pending = promotePending || demotePending || removePending;

  function submit(action: typeof promoteAction) {
    const fd = new FormData();
    fd.set("applicationId", applicationId);
    fd.set("eventId", eventId);
    startTransition(() => action(fd));
  }

  const canPromoteFromWaitlist = status === "waitlisted";
  const canDemoteFromAccepted = status === "accepted";
  const canRemoveFromWaitlist = status === "waitlisted";
  const canMoveRejectedToWaitlist = status === "rejected";

  if (
    !canPromoteFromWaitlist &&
    !canDemoteFromAccepted &&
    !canRemoveFromWaitlist &&
    !canMoveRejectedToWaitlist
  ) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        Waitlist
      </span>
      {canPromoteFromWaitlist && (
        <Button
          type="button"
          size="sm"
          onClick={() => submit(promoteAction)}
          disabled={pending}
        >
          Promote to accepted
        </Button>
      )}
      {canDemoteFromAccepted && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => submit(demoteAction)}
          disabled={pending}
        >
          Move to waitlist
        </Button>
      )}
      {canMoveRejectedToWaitlist && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => submit(demoteAction)}
          disabled={pending}
        >
          Offer waitlist
        </Button>
      )}
      {canRemoveFromWaitlist && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => submit(removeAction)}
          disabled={pending}
        >
          Remove from waitlist
        </Button>
      )}
      {error && (
        <span role="alert" className="text-sm text-destructive">
          {error}
        </span>
      )}
    </div>
  );
}
