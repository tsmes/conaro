"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { joinWaitlist } from "@/app/(public)/events/[eventId]/actions";

export function JoinWaitlistButton({ eventId }: { eventId: string }) {
  const [state, formAction, pending] = useActionState(joinWaitlist, {});

  if (state.success) {
    return (
      <p
        role="status"
        className="rounded-md bg-success-container px-3 py-2 text-sm text-on-success-container"
      >
        You&apos;re on the waitlist. We&apos;ll let you know if a spot opens.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="eventId" value={eventId} />
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Joining\u2026" : "Join the waitlist"}
      </Button>
    </form>
  );
}
