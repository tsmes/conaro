"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

interface HeaderColorPickerProps {
  endpoint: string;
  initialColor: string | null;
  /** Tooltip / aria text for the swatch — e.g. "Convention header colour". */
  label: string;
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function HeaderColorPicker({
  endpoint,
  initialColor,
  label,
}: HeaderColorPickerProps) {
  const [color, setColor] = useState(initialColor);
  // The colour input below is uncontrolled visually but we feed it
  // the latest server-confirmed value as a key so React resets it
  // when the saved colour changes (e.g. after a clear).
  const [draft, setDraft] = useState(initialColor ?? "#3366ff");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save(next: string | null) {
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ color: next }),
        });
        const data = await response.json().catch(() => null);
        if (!response.ok) {
          setError(data?.error ?? "Save failed");
          return;
        }
        setColor(next);
      } catch {
        setError("Save failed. Please try again.");
      }
    });
  }

  function handleSave() {
    if (!HEX_RE.test(draft)) {
      setError("Use a 6-digit hex like #3366ff.");
      return;
    }
    save(draft);
  }

  function handleClear() {
    setDraft(color ?? "#3366ff");
    save(null);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <label
          className="inline-flex h-10 w-14 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-border"
          style={{ background: HEX_RE.test(draft) ? draft : "transparent" }}
          aria-label={label}
        >
          <input
            type="color"
            value={HEX_RE.test(draft) ? draft : "#3366ff"}
            onChange={(e) => setDraft(e.target.value)}
            disabled={pending}
            className="h-full w-full cursor-pointer border-0 bg-transparent p-0 opacity-0"
          />
        </label>
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="#3366ff"
          maxLength={7}
          disabled={pending}
          className="w-32 rounded-md border border-border bg-background px-2 py-1.5 font-mono text-[12.5px]"
        />
        <Button
          type="button"
          size="sm"
          variant="default"
          disabled={pending || draft === color}
          onClick={handleSave}
        >
          {pending ? "Saving..." : "Save"}
        </Button>
        {color && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={handleClear}
          >
            <Trash2 className="size-3.5" />
            Clear
          </Button>
        )}
      </div>
      {color && (
        <p className="font-mono text-[11.5px] text-muted-foreground">
          Saved: {color}
        </p>
      )}
      {error && (
        <p role="alert" className="text-[12px] text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
