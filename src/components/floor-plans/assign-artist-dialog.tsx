"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FloorPlan,
  FloorPlanTable,
  TableSizeOption,
} from "@/lib/db/schema/events";

export interface AcceptedArtistEntry {
  applicationId: string;
  displayName: string;
  requestedTableSizeOptionId: string | null;
}

interface AssignArtistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  table: FloorPlanTable | null;
  acceptedArtists: AcceptedArtistEntry[];
  tableSizeOptions: TableSizeOption[];
  plan: FloorPlan;
  onAssign: (applicationId: string | null) => void;
}

export function AssignArtistDialog({
  open,
  onOpenChange,
  table,
  acceptedArtists,
  tableSizeOptions,
  plan,
  onAssign,
}: AssignArtistDialogProps) {
  if (!table) return null;

  const tableSizeLabel =
    tableSizeOptions.find((s) => s.id === table.tableSizeOptionId)?.label ??
    "Unknown size";

  // Every artist already placed elsewhere in the plan — used to disable
  // double-assignment from the dialog.
  const takenByOtherTable = new Map<string, string>();
  for (const t of plan.tables) {
    if (t.id === table.id) continue;
    if (t.assignedApplicationId) {
      takenByOtherTable.set(t.assignedApplicationId, t.label);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Assign artist to {table.label}
          </DialogTitle>
          <DialogDescription>
            {tableSizeLabel}. Pick an accepted artist.
          </DialogDescription>
        </DialogHeader>

        <ul className="max-h-[50vh] space-y-1 overflow-y-auto">
          {acceptedArtists.length === 0 && (
            <li className="rounded-md border border-border p-3 text-sm text-muted-foreground">
              No accepted artists on this event yet.
            </li>
          )}
          {acceptedArtists.map((artist) => {
            const isCurrent =
              artist.applicationId === table.assignedApplicationId;
            const takenAt = takenByOtherTable.get(artist.applicationId);
            const mismatch =
              artist.requestedTableSizeOptionId !== null &&
              artist.requestedTableSizeOptionId !== table.tableSizeOptionId;
            return (
              <li key={artist.applicationId}>
                <button
                  type="button"
                  disabled={Boolean(takenAt) && !isCurrent}
                  onClick={() => {
                    onAssign(artist.applicationId);
                    onOpenChange(false);
                  }}
                  className="group flex w-full items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-left text-sm transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
                  aria-current={isCurrent ? "true" : undefined}
                >
                  <span className="min-w-0 truncate font-medium">
                    {artist.displayName}
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    {isCurrent && (
                      <span className="rounded-full bg-success-container px-2 py-0.5 text-[11px] font-semibold text-on-success-container">
                        Current
                      </span>
                    )}
                    {takenAt && !isCurrent && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                        Assigned to {takenAt}
                      </span>
                    )}
                    {mismatch && (
                      <span className="rounded-full bg-warning-container px-2 py-0.5 text-[11px] font-semibold text-on-warning-container">
                        Size mismatch
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <DialogFooter className="gap-2">
          {table.assignedApplicationId && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onAssign(null);
                onOpenChange(false);
              }}
            >
              Clear assignment
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
