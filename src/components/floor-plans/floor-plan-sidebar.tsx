"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus, RotateCw, Trash2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FloorPlan, TableSizeOption } from "@/lib/db/schema/events";
import type { AcceptedArtistEntry } from "./assign-artist-dialog";

interface FloorPlanSidebarProps {
  eventId: string;
  plan: FloorPlan;
  activeRoomId: string | null;
  tableSizeOptions: TableSizeOption[];
  acceptedArtists: AcceptedArtistEntry[];
  onChange: (next: FloorPlan) => void;
  onSelectTable: (tableId: string) => void;
}

function hasDims(size: TableSizeOption): boolean {
  return typeof size.widthCm === "number" && typeof size.depthCm === "number";
}

function nextTableLabel(plan: FloorPlan): string {
  const used = new Set(
    plan.tables
      .map((t) => t.label.match(/^T(\d+)$/)?.[1])
      .filter((n): n is string => Boolean(n))
      .map((n) => parseInt(n, 10))
  );
  let n = 1;
  while (used.has(n)) n += 1;
  return `T${n}`;
}

export function FloorPlanSidebar({
  eventId,
  plan,
  activeRoomId,
  tableSizeOptions,
  acceptedArtists,
  onChange,
  onSelectTable,
}: FloorPlanSidebarProps) {
  const [selectedSizeId, setSelectedSizeId] = useState<string>("");

  const activeRoom = plan.rooms.find((r) => r.id === activeRoomId) ?? null;
  const tablesInActiveRoom = activeRoomId
    ? plan.tables.filter((t) => t.roomId === activeRoomId)
    : [];

  const assignedByArtist = new Map<string, string>();
  for (const t of plan.tables) {
    if (t.assignedApplicationId) {
      assignedByArtist.set(t.assignedApplicationId, t.label);
    }
  }

  const unassignedArtists = acceptedArtists.filter(
    (a) => !assignedByArtist.has(a.applicationId)
  );
  const assignedArtists = acceptedArtists.filter((a) =>
    assignedByArtist.has(a.applicationId)
  );

  function addTable() {
    const size = tableSizeOptions.find((s) => s.id === selectedSizeId);
    if (!size || !hasDims(size) || !activeRoomId) return;
    onChange({
      ...plan,
      tables: [
        ...plan.tables,
        {
          id: crypto.randomUUID(),
          label: nextTableLabel(plan),
          tableSizeOptionId: size.id,
          roomId: activeRoomId,
          rotationDeg: 0,
          x: 0,
          y: 0,
          assignedApplicationId: null,
        },
      ],
    });
  }

  function deleteTable(id: string) {
    onChange({ ...plan, tables: plan.tables.filter((t) => t.id !== id) });
  }

  function rotateTable(id: string) {
    onChange({
      ...plan,
      tables: plan.tables.map((t) =>
        t.id === id
          ? {
              ...t,
              rotationDeg: (((t.rotationDeg + 90) % 360) as 0 | 90 | 180 | 270),
            }
          : t
      ),
    });
  }

  return (
    <aside className="space-y-5 text-sm">
      <section className="space-y-2 rounded-lg border border-border p-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Add table {activeRoom ? `· ${activeRoom.name}` : ""}
        </p>
        {!activeRoom ? (
          <p className="text-xs text-muted-foreground">
            Add or pick a room first.
          </p>
        ) : tableSizeOptions.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No table sizes on this event yet.{" "}
            <Link
              href={`/conventions/manage/events/${eventId}`}
              className="text-primary underline underline-offset-4"
            >
              Add sizes first
            </Link>
            .
          </p>
        ) : (
          <>
            <select
              aria-label="Table size"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={selectedSizeId}
              onChange={(e) => setSelectedSizeId(e.target.value)}
            >
              <option value="">Pick a size…</option>
              {tableSizeOptions.map((size) => (
                <option
                  key={size.id}
                  value={size.id}
                  disabled={!hasDims(size)}
                >
                  {size.label}
                  {hasDims(size)
                    ? ` (${size.widthCm} × ${size.depthCm} cm)`
                    : " — set dimensions first"}
                </option>
              ))}
            </select>
            {selectedSizeId &&
              !hasDims(
                tableSizeOptions.find((s) => s.id === selectedSizeId)!
              ) && (
                <p className="text-xs text-muted-foreground">
                  This size has no width/depth yet.{" "}
                  <Link
                    href={`/conventions/manage/events/${eventId}`}
                    className="text-primary underline underline-offset-4"
                  >
                    Set dimensions
                  </Link>{" "}
                  on the event editor first.
                </p>
              )}
            <Button
              type="button"
              size="sm"
              onClick={addTable}
              disabled={
                !selectedSizeId ||
                !hasDims(
                  tableSizeOptions.find((s) => s.id === selectedSizeId)!
                )
              }
            >
              <Plus className="size-4" />
              Add table
            </Button>
          </>
        )}
      </section>

      {tablesInActiveRoom.length > 0 && (
        <section className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Tables in {activeRoom?.name} ({tablesInActiveRoom.length})
          </p>
          <ul className="max-h-72 space-y-1 overflow-y-auto pr-1">
            {tablesInActiveRoom.map((table) => {
              const size = tableSizeOptions.find(
                (s) => s.id === table.tableSizeOptionId
              );
              const assigned = Boolean(table.assignedApplicationId);
              const artistName = table.assignedApplicationId
                ? acceptedArtists.find(
                    (a) => a.applicationId === table.assignedApplicationId
                  )?.displayName ?? "Assigned"
                : null;
              return (
                <li
                  key={table.id}
                  className={
                    "flex items-center justify-between gap-2 rounded-md px-3 py-2 " +
                    (assigned
                      ? "bg-success-container text-on-success-container"
                      : "border border-dashed border-border text-muted-foreground")
                  }
                >
                  <button
                    type="button"
                    onClick={() => onSelectTable(table.id)}
                    className="min-w-0 flex-1 text-left"
                    aria-label={`Assign artist to ${table.label}`}
                  >
                    <p className="truncate text-sm font-semibold text-foreground">
                      {table.label}
                      {artistName ? (
                        <span className="ml-2 font-normal">{artistName}</span>
                      ) : (
                        <span className="ml-2 font-normal italic">
                          available
                        </span>
                      )}
                    </p>
                    <p className="truncate text-[11px]">
                      {size?.label ?? "(missing size)"}
                    </p>
                  </button>
                  <div className="flex shrink-0 items-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`Rotate ${table.label}`}
                      onClick={() => rotateTable(table.id)}
                    >
                      <RotateCw className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`Delete ${table.label}`}
                      onClick={() => deleteTable(table.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {acceptedArtists.length > 0 && (
        <section className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Artists ({assignedArtists.length}/{acceptedArtists.length} placed)
          </p>
          {unassignedArtists.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Unassigned ({unassignedArtists.length})
              </p>
              <ul className="max-h-56 space-y-1 overflow-y-auto pr-1">
                {unassignedArtists.map((artist) => (
                  <li
                    key={artist.applicationId}
                    className="flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-2"
                  >
                    <UserRound className="size-4 text-muted-foreground" />
                    <span className="min-w-0 truncate font-medium">
                      {artist.displayName}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {assignedArtists.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Assigned ({assignedArtists.length})
              </p>
              <ul className="max-h-56 space-y-1 overflow-y-auto pr-1">
                {assignedArtists.map((artist) => (
                  <li
                    key={artist.applicationId}
                    className="flex items-center justify-between gap-2 rounded-md bg-muted/60 px-3 py-2 text-muted-foreground"
                  >
                    <span className="min-w-0 truncate">
                      {artist.displayName}
                    </span>
                    <span className="shrink-0 rounded-full bg-background px-2 py-0.5 text-[11px] font-semibold text-foreground">
                      {assignedByArtist.get(artist.applicationId)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </aside>
  );
}
