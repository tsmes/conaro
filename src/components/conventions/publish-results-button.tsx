"use client";

import { useState } from "react";
import { useActionState } from "react";
import { AlertTriangle, Info } from "lucide-react";
import { publishResults } from "@/app/(authenticated)/conventions/manage/events/[eventId]/applications/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface PublishResultsButtonProps {
  eventId: string;
  eventStatus: string;
  undecidedCount: number;
  acceptedCount: number;
  totalCount: number;
  availableStands: number | null;
}

export function PublishResultsButton({
  eventId,
  eventStatus,
  undecidedCount,
  acceptedCount,
  totalCount,
  availableStands,
}: PublishResultsButtonProps) {
  const [state, formAction, pending] = useActionState(publishResults, {});
  const [open, setOpen] = useState(false);
  const [rejectUndecided, setRejectUndecided] = useState(true);

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

  const hasCapacity = typeof availableStands === "number" && availableStands > 0;
  const underBooked = hasCapacity && acceptedCount < availableStands;
  const overBooked = hasCapacity && acceptedCount > availableStands;
  const hasUndecided = undecidedCount > 0;
  const hasWarnings = hasUndecided || underBooked || overBooked;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>Publish Results</Button>} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Publish results?</DialogTitle>
          <DialogDescription>
            This will notify every applicant and lock further decisions for
            this event.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="eventId" value={eventId} />
          {rejectUndecided && hasUndecided && (
            <input type="hidden" name="rejectUndecided" value="true" />
          )}

          <div className="space-y-3">
            {hasUndecided && (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <div className="space-y-2 text-sm">
                    <p className="font-medium">
                      {undecidedCount} of {totalCount} application
                      {totalCount === 1 ? "" : "s"} still undecided.
                    </p>
                    <label className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Checkbox
                        checked={rejectUndecided}
                        onCheckedChange={(value) =>
                          setRejectUndecided(value === true)
                        }
                        className="mt-0.5"
                      />
                      <span>
                        Reject all undecided applicants before publishing. If
                        unchecked, you&apos;ll need to decide each one before
                        you can publish.
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {overBooked && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
                  <p className="text-sm">
                    You&apos;ve accepted {acceptedCount} artists, but only{" "}
                    {availableStands} stand{availableStands === 1 ? "" : "s"}{" "}
                    {availableStands === 1 ? "is" : "are"} available.
                  </p>
                </div>
              </div>
            )}

            {underBooked && (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3">
                <div className="flex items-start gap-2">
                  <Info className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <p className="text-sm">
                    You&apos;ve accepted {acceptedCount} artist
                    {acceptedCount === 1 ? "" : "s"} for {availableStands}{" "}
                    available stand{availableStands === 1 ? "" : "s"}. You can
                    still proceed, but {availableStands - acceptedCount} stand
                    {availableStands - acceptedCount === 1 ? "" : "s"} will go
                    unfilled.
                  </p>
                </div>
              </div>
            )}

            {!hasWarnings && (
              <p className="text-sm text-muted-foreground">
                {hasCapacity
                  ? `${acceptedCount} artists accepted for ${availableStands} available stand${availableStands === 1 ? "" : "s"}. Ready to publish.`
                  : `${acceptedCount} artist${acceptedCount === 1 ? "" : "s"} accepted. Ready to publish.`}
              </p>
            )}
          </div>

          {state.error && (
            <div
              className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
              role="alert"
            >
              {state.error}
            </div>
          )}

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Go back
            </DialogClose>
            <Button
              type="submit"
              disabled={pending || (hasUndecided && !rejectUndecided)}
            >
              {pending ? "Publishing..." : "Publish"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
