"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
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

type RoomDialogMode =
  | { kind: "closed" }
  | { kind: "create" }
  | { kind: "edit"; roomId: string };

export function RoomSwitcher({
  plan,
  activeRoomId,
  onActiveRoomChange,
  onChange,
}: RoomSwitcherProps) {
  const [dialog, setDialog] = useState<RoomDialogMode>({ kind: "closed" });
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [name, setName] = useState("");
  const [widthM, setWidthM] = useState("");
  const [depthM, setDepthM] = useState("");

  const activeRoom = plan.rooms.find((r) => r.id === activeRoomId) ?? null;
  const tablesInActiveRoom = activeRoomId
    ? plan.tables.filter((t) => t.roomId === activeRoomId).length
    : 0;

  // Prefill the form when the dialog opens in edit mode.
  useEffect(() => {
    if (dialog.kind === "edit") {
      const room = plan.rooms.find((r) => r.id === dialog.roomId);
      if (room) {
        setName(room.name);
        setWidthM((room.widthCm / 100).toString());
        setDepthM((room.heightCm / 100).toString());
      }
    } else if (dialog.kind === "create") {
      setName("");
      setWidthM("");
      setDepthM("");
    }
  }, [dialog, plan.rooms]);

  function submit() {
    const widthCm = Math.round(parseFloat(widthM) * 100);
    const heightCm = Math.round(parseFloat(depthM) * 100);
    if (!name.trim() || !Number.isFinite(widthCm) || !Number.isFinite(heightCm))
      return;
    if (widthCm < 10 || heightCm < 10) return;

    if (dialog.kind === "create") {
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
    } else if (dialog.kind === "edit") {
      onChange({
        ...plan,
        rooms: plan.rooms.map((r) =>
          r.id === dialog.roomId
            ? { ...r, name: name.trim(), widthCm, heightCm }
            : r
        ),
      });
    }
    setDialog({ kind: "closed" });
  }

  function deleteActiveRoom() {
    if (!activeRoomId) return;
    const nextRooms = plan.rooms.filter((r) => r.id !== activeRoomId);
    const nextTables = plan.tables.filter((t) => t.roomId !== activeRoomId);
    onChange({ rooms: nextRooms, tables: nextTables });
    if (nextRooms.length > 0) onActiveRoomChange(nextRooms[0].id);
  }

  const isEdit = dialog.kind === "edit";

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
        onClick={() => setDialog({ kind: "create" })}
      >
        <Plus className="size-4" />
        New room
      </Button>
      {activeRoomId && activeRoom && (
        <>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setDialog({ kind: "edit", roomId: activeRoomId })}
          >
            <Pencil className="size-4" />
            Edit room
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setConfirmDeleteOpen(true)}
          >
            <Trash2 className="size-4" />
            Delete room
          </Button>
        </>
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

      <Dialog
        open={dialog.kind !== "closed"}
        onOpenChange={(open) => {
          if (!open) setDialog({ kind: "closed" });
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit room" : "Add room"}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Update the room name or dimensions. Tables stay in place."
                : "Give the room a name and its real-world dimensions."}
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
            <Button type="button" onClick={submit}>
              {isEdit ? "Save room" : "Add room"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
