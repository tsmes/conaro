"use client";

import { useActionState } from "react";
import { publishResults } from "@/app/conventions/manage/events/[eventId]/applications/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PublishResultsButtonProps {
  eventId: string;
  eventStatus: string;
  undecidedCount: number;
  totalCount: number;
}

export function PublishResultsButton({
  eventId,
  eventStatus,
  undecidedCount,
  totalCount,
}: PublishResultsButtonProps) {
  const [state, formAction, pending] = useActionState(publishResults, {});

  if (eventStatus === "results_published" || state.success) {
    return (
      <Badge variant="default" className="text-sm">
        Results Published
      </Badge>
    );
  }

  if (totalCount === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No applications to publish.
      </p>
    );
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

      {undecidedCount > 0 && (
        <p className="text-sm text-destructive">
          {undecidedCount} of {totalCount} application(s) still need a decision.
        </p>
      )}

      <form action={formAction}>
        <input type="hidden" name="eventId" value={eventId} />
        <Button
          type="submit"
          disabled={pending || undecidedCount > 0}
        >
          {pending ? "Publishing..." : "Publish Results"}
        </Button>
      </form>
    </div>
  );
}
