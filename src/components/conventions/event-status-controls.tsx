"use client";

import { useActionState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ActionState } from "@/lib/validations/auth";

const STATUS_DISPLAY: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" }
> = {
  draft: { label: "Draft", variant: "secondary" },
  accepting_applications: {
    label: "Accepting Applications",
    variant: "default",
  },
  reviewing: { label: "Reviewing", variant: "outline" },
  results_published: { label: "Results Published", variant: "default" },
};

interface EventStatusControlsProps {
  eventId: string;
  currentStatus: string;
  openAction: (
    prevState: ActionState,
    formData: FormData
  ) => Promise<ActionState>;
  closeAction: (
    prevState: ActionState,
    formData: FormData
  ) => Promise<ActionState>;
}

export function EventStatusControls({
  eventId,
  currentStatus,
  openAction,
  closeAction,
}: EventStatusControlsProps) {
  const [openState, openFormAction, openPending] = useActionState(
    openAction,
    {}
  );
  const [closeState, closeFormAction, closePending] = useActionState(
    closeAction,
    {}
  );

  const statusInfo = STATUS_DISPLAY[currentStatus] ?? {
    label: currentStatus,
    variant: "secondary" as const,
  };

  const error = openState.error || closeState.error;

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">
          Status:
        </span>
        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
      </div>

      {currentStatus === "draft" && (
        <form action={openFormAction}>
          <input type="hidden" name="eventId" value={eventId} />
          <Button type="submit" size="sm" disabled={openPending}>
            {openPending ? "Opening..." : "Open Applications"}
          </Button>
        </form>
      )}

      {currentStatus === "accepting_applications" && (
        <form action={closeFormAction}>
          <input type="hidden" name="eventId" value={eventId} />
          <Button
            type="submit"
            size="sm"
            variant="outline"
            disabled={closePending}
          >
            {closePending ? "Closing..." : "Close Applications"}
          </Button>
        </form>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
