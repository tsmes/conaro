"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  SOCIAL_PLATFORMS,
  type SocialLink,
} from "@/lib/artist-profile/social-links";

interface SocialLinksEditorProps {
  name: string;
  defaultValues: SocialLink[];
  disabled?: boolean;
}

// Renders a dynamic list of {platform, url} pairs. Serialises the whole list
// into a single hidden input named `name` on submit so the server action
// parses one JSON payload.
export function SocialLinksEditor({
  name,
  defaultValues,
  disabled,
}: SocialLinksEditorProps) {
  const [rows, setRows] = useState<SocialLink[]>(
    defaultValues.length > 0
      ? defaultValues
      : [{ type: "Instagram", url: "" }]
  );

  const update = (idx: number, patch: Partial<SocialLink>) =>
    setRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, ...patch } : r))
    );
  const remove = (idx: number) =>
    setRows((prev) => prev.filter((_, i) => i !== idx));
  const add = () =>
    setRows((prev) => [...prev, { type: "Instagram", url: "" }]);

  // Only persist rows with a URL so empty starter row doesn't pollute storage.
  const serialised = rows
    .map((r) => ({
      type: r.type.trim(),
      url: r.url.trim(),
    }))
    .filter((r) => r.type && r.url);

  return (
    <div className="space-y-2">
      <input
        type="hidden"
        name={name}
        value={serialised.length > 0 ? JSON.stringify(serialised) : ""}
      />
      {rows.map((row, idx) => (
        <div
          key={idx}
          className="grid gap-2 sm:grid-cols-[minmax(140px,180px)_1fr_auto]"
        >
          <select
            aria-label="Platform"
            value={row.type}
            disabled={disabled}
            onChange={(e) => update(idx, { type: e.target.value })}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs"
          >
            {SOCIAL_PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
            {!SOCIAL_PLATFORMS.includes(
              row.type as (typeof SOCIAL_PLATFORMS)[number]
            ) &&
              row.type && <option value={row.type}>{row.type}</option>}
          </select>
          <Input
            aria-label="URL"
            type="url"
            inputMode="url"
            placeholder="https://..."
            value={row.url}
            disabled={disabled}
            onChange={(e) => update(idx, { url: e.target.value })}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={disabled || rows.length === 1}
            onClick={() => remove(idx)}
            aria-label="Remove link"
          >
            <X className="size-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={add}
        disabled={disabled}
      >
        <Plus className="size-3.5" /> Add another link
      </Button>
    </div>
  );
}
