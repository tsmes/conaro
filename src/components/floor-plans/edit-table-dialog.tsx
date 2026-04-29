"use client";

import { useEffect, useState } from "react";
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
import type { FloorPlanTable, TableSizeOption } from "@/lib/db/schema/events";

interface EditTableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  table: FloorPlanTable | null;
  tableSizeOptions: TableSizeOption[];
  onSave: (next: {
    label: string;
    tableSizeOptionId: string;
    rotationDeg: number;
  }) => void;
}

function normaliseRotation(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

// Show one decimal at most so 90° doesn't render as "90.0" but a typed
// 37.5° survives the round-trip.
function formatRotationForInput(deg: number): string {
  const normalised = normaliseRotation(deg);
  return Number.isInteger(normalised)
    ? String(normalised)
    : normalised.toFixed(1);
}

function hasDims(size: TableSizeOption): boolean {
  return typeof size.widthCm === "number" && typeof size.depthCm === "number";
}

export function EditTableDialog({
  open,
  onOpenChange,
  table,
  tableSizeOptions,
  onSave,
}: EditTableDialogProps) {
  const [label, setLabel] = useState("");
  const [sizeId, setSizeId] = useState("");
  const [rotationInput, setRotationInput] = useState("");

  useEffect(() => {
    if (!table) return;
    setLabel(table.label);
    setSizeId(table.tableSizeOptionId);
    setRotationInput(formatRotationForInput(table.rotationDeg));
  }, [table]);

  if (!table) return null;

  const selectedSize = tableSizeOptions.find((s) => s.id === sizeId) ?? null;
  const saveDisabled =
    label.trim().length === 0 || !selectedSize || !hasDims(selectedSize);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit table</DialogTitle>
          <DialogDescription>
            Change the label or swap the size. The table keeps its
            position and artist assignment.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="table-label" className="text-xs">
              Label
            </Label>
            <Input
              id="table-label"
              value={label}
              maxLength={10}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="table-size" className="text-xs">
              Size
            </Label>
            <select
              id="table-size"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={sizeId}
              onChange={(e) => setSizeId(e.target.value)}
            >
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
          </div>
          <div className="space-y-1">
            <Label htmlFor="table-rotation" className="text-xs">
              Rotation
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="table-rotation"
                type="number"
                step="1"
                min="0"
                max="359"
                value={rotationInput}
                onChange={(e) => setRotationInput(e.target.value)}
              />
              <span className="text-sm text-muted-foreground">°</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose
            render={<Button type="button" variant="ghost">Cancel</Button>}
          />
          <Button
            type="button"
            disabled={saveDisabled}
            onClick={() => {
              const parsed = Number.parseFloat(rotationInput);
              const rotationDeg = Number.isFinite(parsed)
                ? normaliseRotation(parsed)
                : table.rotationDeg;
              onSave({
                label: label.trim(),
                tableSizeOptionId: sizeId,
                rotationDeg,
              });
              onOpenChange(false);
            }}
          >
            Save table
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
