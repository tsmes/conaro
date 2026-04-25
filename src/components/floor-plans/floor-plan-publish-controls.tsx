"use client";

import { useActionState, useState } from "react";

import {
  publishFloorPlan,
  unpublishFloorPlan,
  setFloorPlanAutoPublish,
} from "@/app/(authenticated)/conventions/manage/events/[eventId]/floor-plan/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDateNo } from "@/lib/utils/format-date-no";

interface FloorPlanPublishControlsProps {
  eventId: string;
  eventStatus: string;
  floorPlanPublishedAt: Date | null;
  floorPlanAutoPublishDaysBefore: number | null;
}

export function FloorPlanPublishControls({
  eventId,
  eventStatus,
  floorPlanPublishedAt,
  floorPlanAutoPublishDaysBefore,
}: FloorPlanPublishControlsProps) {
  const isPublic = floorPlanPublishedAt !== null;
  const canPublish = eventStatus === "results_published";

  const [manualState, manualAction, manualPending] = useActionState(
    isPublic ? unpublishFloorPlan : publishFloorPlan,
    {} as { error?: string; success?: boolean }
  );

  const [autoOn, setAutoOn] = useState(
    floorPlanAutoPublishDaysBefore !== null
  );
  const [daysInput, setDaysInput] = useState(
    floorPlanAutoPublishDaysBefore?.toString() ?? "1"
  );
  const [autoState, autoAction, autoPending] = useActionState(
    setFloorPlanAutoPublish,
    {} as {
      error?: string;
      success?: boolean;
      fieldErrors?: Record<string, string[]>;
    }
  );

  return (
    <Card className="space-y-6 p-6">
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-heading text-base font-bold">
              Floor plan visibility
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {isPublic
                ? `Public since ${formatDateNo(floorPlanPublishedAt!.toISOString().slice(0, 10))}`
                : "Not public yet — only you can see it."}
            </p>
          </div>
          <form action={manualAction}>
            <input type="hidden" name="eventId" value={eventId} />
            <Button
              type="submit"
              size="sm"
              variant={isPublic ? "outline" : "default"}
              disabled={(!canPublish && !isPublic) || manualPending}
            >
              {manualPending
                ? "..."
                : isPublic
                  ? "Unpublish"
                  : "Publish floor plan"}
            </Button>
          </form>
        </div>
        {!canPublish && !isPublic && (
          <p className="text-xs text-muted-foreground">
            Publish results first to enable floor-plan publishing.
          </p>
        )}
        {manualState.error && (
          <p className="text-xs text-destructive">{manualState.error}</p>
        )}
      </section>

      <hr className="border-border" />

      <section className="space-y-3">
        <h3 className="font-heading text-base font-bold">
          Auto-publish schedule
        </h3>
        <p className="text-sm text-muted-foreground">
          When enabled, the floor plan publishes automatically once the event
          is close enough — provided results are already out. After firing
          the schedule clears itself; turn it back on if you need it again.
        </p>
        <form action={autoAction} className="space-y-3">
          <input type="hidden" name="eventId" value={eventId} />
          <Label className="flex items-center gap-2">
            <Checkbox
              checked={autoOn}
              onCheckedChange={(next) => setAutoOn(next === true)}
            />
            <span className="text-sm">Auto-publish floor plan</span>
          </Label>
          {autoOn && (
            <div className="flex items-end gap-2">
              <div className="space-y-1.5">
                <Label
                  htmlFor="floor-plan-days-before"
                  className="text-xs uppercase tracking-wider text-muted-foreground"
                >
                  Days before event start
                </Label>
                <Input
                  id="floor-plan-days-before"
                  name="daysBefore"
                  type="number"
                  min={1}
                  step={1}
                  value={daysInput}
                  onChange={(e) => setDaysInput(e.target.value)}
                  className="w-24"
                />
              </div>
            </div>
          )}
          {/* When the toggle is off we send an empty daysBefore so the
              action clears the column. */}
          {!autoOn && (
            <input type="hidden" name="daysBefore" value="" />
          )}
          <div className="flex items-center gap-2">
            <Button type="submit" size="sm" disabled={autoPending}>
              {autoPending ? "Saving..." : "Save schedule"}
            </Button>
            {autoState.success && (
              <span className="text-xs text-muted-foreground">Saved.</span>
            )}
          </div>
          {autoState.error && (
            <p className="text-xs text-destructive">{autoState.error}</p>
          )}
          {autoState.fieldErrors?.daysBefore && (
            <p className="text-xs text-destructive">
              {autoState.fieldErrors.daysBefore[0]}
            </p>
          )}
        </form>
      </section>
    </Card>
  );
}
