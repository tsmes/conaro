"use client";

import { useEffect, useRef, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EdgeLengthPopupProps {
  open: boolean;
  /** Current length in metres, pre-filled into the input. */
  currentLengthM: number;
  /** Pixel position (relative to the canvas container) where the popup
   *  is anchored. Centres horizontally on this point and floats above. */
  anchorPx: { xPx: number; yPx: number };
  onSubmit: (newLengthM: number) => void;
  onCancel: () => void;
}

export function EdgeLengthPopup({
  open,
  currentLengthM,
  anchorPx,
  onSubmit,
  onCancel,
}: EdgeLengthPopupProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
    return () => window.clearTimeout(id);
  }, [open]);

  if (!open) return null;

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const raw = inputRef.current?.value ?? "";
    const next = Number.parseFloat(raw);
    if (!Number.isFinite(next) || next <= 0) return;
    onSubmit(next);
  }

  return (
    <div
      className="absolute z-30 -translate-x-1/2 -translate-y-full"
      style={{ left: anchorPx.xPx, top: anchorPx.yPx - 8 }}
      role="dialog"
      aria-label="Edit edge length"
    >
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 rounded-lg border border-border bg-card p-2 shadow-lg"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
        }}
      >
        <Label
          htmlFor="edge-length-input"
          className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
        >
          Length
        </Label>
        <Input
          ref={inputRef}
          id="edge-length-input"
          type="number"
          step="0.1"
          min="0.1"
          // Uncontrolled — the input owns its value. `key` on the
          // parent ensures a fresh defaultValue when the user clicks a
          // different edge.
          defaultValue={currentLengthM.toFixed(2)}
          className="h-8 w-24 text-sm"
        />
        <span className="text-xs text-muted-foreground">m</span>
        <Button type="submit" size="sm">
          Apply
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </form>
    </div>
  );
}
