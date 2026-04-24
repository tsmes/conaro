"use client";

import Link from "next/link";
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FloorPlan, TableSizeOption } from "@/lib/db/schema/events";

interface FloorPlanSidebarProps {
  eventId: string;
  plan: FloorPlan;
  tableSizeOptions: TableSizeOption[];
  onChange: (next: FloorPlan) => void;
  onSelectTable: (tableId: string) => void;
}

function hasDims(size: TableSizeOption): boolean {
  return typeof size.widthCm === "number" && typeof size.depthCm === "number";
}

// Lowest positive integer N such that "T${N}" isn't used yet in the plan.
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

function assignmentSummary(
  plan: FloorPlan,
  tableId: string
): string {
  const t = plan.tables.find((x) => x.id === tableId);
  return t?.assignedApplicationId ? "assigned" : "empty";
}

export function FloorPlanSidebar({
  eventId,
  plan,
  tableSizeOptions,
  onChange,
  onSelectTable,
}: FloorPlanSidebarProps) {
  const [roomName, setRoomName] = useState("");
  const [roomWidthM, setRoomWidthM] = useState("");
  const [roomHeightM, setRoomHeightM] = useState("");
  const [selectedSizeId, setSelectedSizeId] = useState<string>("");

  function addRoom() {
    const widthCm = Math.round(parseFloat(roomWidthM) * 100);
    const heightCm = Math.round(parseFloat(roomHeightM) * 100);
    if (!roomName.trim() || !Number.isFinite(widthCm) || !Number.isFinite(heightCm)) return;
    if (widthCm < 10 || heightCm < 10) return;
    onChange({
      ...plan,
      rooms: [
        ...plan.rooms,
        {
          id: crypto.randomUUID(),
          name: roomName.trim(),
          x: 0,
          y: 0,
          widthCm,
          heightCm,
        },
      ],
    });
    setRoomName("");
    setRoomWidthM("");
    setRoomHeightM("");
  }

  function addTable() {
    const size = tableSizeOptions.find((s) => s.id === selectedSizeId);
    if (!size || !hasDims(size)) return;
    onChange({
      ...plan,
      tables: [
        ...plan.tables,
        {
          id: crypto.randomUUID(),
          label: nextTableLabel(plan),
          tableSizeOptionId: size.id,
          x: 0,
          y: 0,
          assignedApplicationId: null,
        },
      ],
    });
  }

  function deleteRoom(id: string) {
    onChange({ ...plan, rooms: plan.rooms.filter((r) => r.id !== id) });
  }

  function deleteTable(id: string) {
    onChange({ ...plan, tables: plan.tables.filter((t) => t.id !== id) });
  }

  return (
    <aside className="space-y-5 text-sm">
      <section className="space-y-2 rounded-lg border border-border p-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Add room
        </p>
        <div className="space-y-2">
          <div className="space-y-1">
            <Label htmlFor="new-room-name" className="text-xs">
              Name
            </Label>
            <Input
              id="new-room-name"
              placeholder="Main hall"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="new-room-w" className="text-xs">
                Width (m)
              </Label>
              <Input
                id="new-room-w"
                type="number"
                step="0.1"
                min="0.1"
                value={roomWidthM}
                onChange={(e) => setRoomWidthM(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="new-room-h" className="text-xs">
                Depth (m)
              </Label>
              <Input
                id="new-room-h"
                type="number"
                step="0.1"
                min="0.1"
                value={roomHeightM}
                onChange={(e) => setRoomHeightM(e.target.value)}
              />
            </div>
          </div>
          <Button type="button" size="sm" onClick={addRoom}>
            <Plus className="size-4" />
            Add room
          </Button>
        </div>
      </section>

      <section className="space-y-2 rounded-lg border border-border p-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Add table
        </p>
        {tableSizeOptions.length === 0 ? (
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

      {plan.rooms.length > 0 && (
        <section className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Rooms ({plan.rooms.length})
          </p>
          <ul className="space-y-1">
            {plan.rooms.map((room) => (
              <li
                key={room.id}
                className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{room.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {(room.widthCm / 100).toFixed(1)} ×{" "}
                    {(room.heightCm / 100).toFixed(1)} m
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Delete ${room.name}`}
                  onClick={() => deleteRoom(room.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {plan.tables.length > 0 && (
        <section className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Tables ({plan.tables.length})
          </p>
          <ul className="space-y-1">
            {plan.tables.map((table) => {
              const size = tableSizeOptions.find(
                (s) => s.id === table.tableSizeOptionId
              );
              return (
                <li
                  key={table.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{table.label}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {size?.label ?? "(missing size)"} ·{" "}
                      {assignmentSummary(plan, table.id)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`Assign artist to ${table.label}`}
                      onClick={() => onSelectTable(table.id)}
                    >
                      <Pencil className="size-4" />
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
    </aside>
  );
}
