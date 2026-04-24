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
  onSave: (next: { label: string; tableSizeOptionId: string }) => void;
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

  useEffect(() => {
    if (!table) return;
    setLabel(table.label);
    setSizeId(table.tableSizeOptionId);
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
        </div>
        <DialogFooter>
          <DialogClose
            render={<Button type="button" variant="ghost">Cancel</Button>}
          />
          <Button
            type="button"
            disabled={saveDisabled}
            onClick={() => {
              onSave({ label: label.trim(), tableSizeOptionId: sizeId });
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
