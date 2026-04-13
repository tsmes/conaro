"use client";

import { useActionState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ActionState } from "@/lib/validations/auth";
import { ORGANIZER_STATUS_LABELS } from "@/lib/events/status-display";

interface EventStatusControlsProps {
  eventId: string;
  currentStatus: string;
  publishAction: (
    prevState: ActionState,
    formData: FormData
  ) => Promise<ActionState>;
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
  publishAction,
  openAction,
  closeAction,
}: EventStatusControlsProps) {
  const [publishState, publishFormAction, publishPending] = useActionState(
    publishAction,
    {}
  );
  const [openState, openFormAction, openPending] = useActionState(
    openAction,
    {}
  );
  const [closeState, closeFormAction, closePending] = useActionState(
    closeAction,
    {}
  );

  const statusInfo = ORGANIZER_STATUS_LABELS[currentStatus] ?? {
    label: currentStatus,
    variant: "secondary" as const,
  };

  const error = publishState.error || openState.error || closeState.error;

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">
          Status:
        </span>
        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
      </div>

      {currentStatus === "draft" && (
        <form action={publishFormAction}>
          <input type="hidden" name="eventId" value={eventId} />
          <Button type="submit" size="sm" disabled={publishPending}>
            {publishPending ? "Publishing..." : "Publish Event"}
          </Button>
        </form>
      )}

      {currentStatus === "published" && (
        <form action={openFormAction}>
          <input type="hidden" name="eventId" value={eventId} />
          <Button type="submit" size="sm" disabled={openPending}>
            {openPending ? "Opening..." : "Open Applications Now"}
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
            {closePending ? "Closing..." : "Close Applications Now"}
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
