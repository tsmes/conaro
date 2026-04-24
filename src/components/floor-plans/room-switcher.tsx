"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { FloorPlan } from "@/lib/db/schema/events";

interface RoomSwitcherProps {
  plan: FloorPlan;
  activeRoomId: string | null;
  onActiveRoomChange: (roomId: string) => void;
  onChange: (next: FloorPlan) => void;
}

export function RoomSwitcher({
  plan,
  activeRoomId,
  onActiveRoomChange,
  onChange,
}: RoomSwitcherProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [name, setName] = useState("");
  const [widthM, setWidthM] = useState("");
  const [depthM, setDepthM] = useState("");

  const activeRoom = plan.rooms.find((r) => r.id === activeRoomId) ?? null;
  const tablesInActiveRoom = activeRoomId
    ? plan.tables.filter((t) => t.roomId === activeRoomId).length
    : 0;

  function resetForm() {
    setName("");
    setWidthM("");
    setDepthM("");
  }

  function addRoom() {
    const widthCm = Math.round(parseFloat(widthM) * 100);
    const heightCm = Math.round(parseFloat(depthM) * 100);
    if (!name.trim() || !Number.isFinite(widthCm) || !Number.isFinite(heightCm))
      return;
    if (widthCm < 10 || heightCm < 10) return;
    const id = crypto.randomUUID();
    onChange({
      ...plan,
      rooms: [
        ...plan.rooms,
        {
          id,
          name: name.trim(),
          x: 0,
          y: 0,
          widthCm,
          heightCm,
        },
      ],
    });
    onActiveRoomChange(id);
    resetForm();
    setAddOpen(false);
  }

  function deleteActiveRoom() {
    if (!activeRoomId) return;
    const nextRooms = plan.rooms.filter((r) => r.id !== activeRoomId);
    const nextTables = plan.tables.filter((t) => t.roomId !== activeRoomId);
    onChange({ rooms: nextRooms, tables: nextTables });
    if (nextRooms.length > 0) onActiveRoomChange(nextRooms[0].id);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {plan.rooms.map((room) => {
        const active = room.id === activeRoomId;
        return (
          <button
            key={room.id}
            type="button"
            onClick={() => onActiveRoomChange(room.id)}
            className={
              "rounded-full border px-3 py-1 text-sm transition-colors " +
              (active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-foreground hover:bg-muted")
            }
          >
            {room.name}
            <span className="ml-1.5 text-[11px] opacity-70">
              {(room.widthCm / 100).toFixed(1)}×{(room.heightCm / 100).toFixed(1)} m
            </span>
          </button>
        );
      })}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setAddOpen(true)}
      >
        <Plus className="size-4" />
        New room
      </Button>
      {activeRoomId && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setConfirmDeleteOpen(true)}
        >
          <Trash2 className="size-4" />
          Delete room
        </Button>
      )}

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title={`Delete ${activeRoom?.name ?? "room"}?`}
        description={
          tablesInActiveRoom > 0
            ? `This will also remove the ${tablesInActiveRoom} table${tablesInActiveRoom === 1 ? "" : "s"} placed in this room. This cannot be undone.`
            : "This cannot be undone."
        }
        confirmLabel="Delete room"
        destructive
        onConfirm={deleteActiveRoom}
      />

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add room</DialogTitle>
            <DialogDescription>
              Give the room a name and its real-world dimensions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="room-name" className="text-xs">
                Name
              </Label>
              <Input
                id="room-name"
                placeholder="Main hall"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="room-w" className="text-xs">
                  Width (m)
                </Label>
                <Input
                  id="room-w"
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={widthM}
                  onChange={(e) => setWidthM(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="room-h" className="text-xs">
                  Depth (m)
                </Label>
                <Input
                  id="room-h"
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={depthM}
                  onChange={(e) => setDepthM(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose
              render={<Button type="button" variant="ghost">Cancel</Button>}
            />
            <Button type="button" onClick={addRoom}>
              Add room
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
