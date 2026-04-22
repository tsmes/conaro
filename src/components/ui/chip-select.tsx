"use client";

import { useCallback, useMemo, useState } from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { normalizeTag } from "@/lib/artist-profile/tags";

interface ChipSelectProps {
  name: string;
  // Suggested options shown as pre-selectable chips. When `allowCustom` is
  // true the user can also type new values; they get added to the selection
  // and render alongside the selected suggestions.
  options: readonly string[];
  defaultValues?: readonly string[];
  max?: number;
  disabled?: boolean;
  className?: string;
  allowCustom?: boolean;
  addLabel?: string;
  "aria-label"?: string;
}

export function ChipSelect({
  name,
  options,
  defaultValues,
  max,
  disabled,
  className,
  allowCustom = false,
  addLabel = "Add your own",
  "aria-label": ariaLabel,
}: ChipSelectProps) {
  // Preserve the initial selection exactly, including custom tags the artist
  // added previously (values outside `options`).
  const initial = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const v of defaultValues ?? []) {
      const lower = v.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        out.push(v);
      }
    }
    return out;
  }, [defaultValues]);

  const [selected, setSelected] = useState<string[]>(initial);
  const [inputValue, setInputValue] = useState("");
  const selectedLower = useMemo(
    () => new Set(selected.map((s) => s.toLowerCase())),
    [selected]
  );

  const atMax = max != null && selected.length >= max;

  const add = useCallback(
    (value: string) => {
      const clean = normalizeTag(value);
      if (!clean) return;
      setSelected((prev) => {
        if (prev.some((v) => v.toLowerCase() === clean.toLowerCase())) {
          return prev;
        }
        if (max != null && prev.length >= max) return prev;
        return [...prev, clean];
      });
    },
    [max]
  );

  const toggle = useCallback(
    (value: string) => {
      setSelected((prev) => {
        const lower = value.toLowerCase();
        if (prev.some((v) => v.toLowerCase() === lower)) {
          return prev.filter((v) => v.toLowerCase() !== lower);
        }
        if (max != null && prev.length >= max) return prev;
        return [...prev, value];
      });
    },
    [max]
  );

  const remove = useCallback((value: string) => {
    setSelected((prev) => prev.filter((v) => v !== value));
  }, []);

  const commitInput = () => {
    if (!inputValue.trim()) return;
    add(inputValue);
    setInputValue("");
  };

  // Suggestions not yet selected
  const remainingOptions = options.filter(
    (o) => !selectedLower.has(o.toLowerCase())
  );
  // Selected values that aren't in the suggestion list (custom tags)
  const customSelected = selected.filter(
    (s) => !options.some((o) => o.toLowerCase() === s.toLowerCase())
  );

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn("space-y-2", className)}
    >
      {/* Currently-selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((value) => (
            <span
              key={value}
              className="inline-flex h-7 items-center gap-1 rounded-full bg-primary pl-3 pr-1.5 text-[11.5px] font-semibold uppercase tracking-wider text-primary-foreground"
            >
              {value}
              <button
                type="button"
                onClick={() => remove(value)}
                disabled={disabled}
                className="grid size-5 place-items-center rounded-full hover:bg-primary-foreground/20"
                aria-label={`Remove ${value}`}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Suggestion chips for remaining options */}
      {remainingOptions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {remainingOptions.map((option) => (
            <button
              key={option}
              type="button"
              disabled={disabled || atMax}
              onClick={() => toggle(option)}
              className={cn(
                "inline-flex h-7 items-center rounded-full border border-border px-3 text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors",
                "hover:bg-muted hover:text-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                "disabled:opacity-50 disabled:pointer-events-none"
              )}
            >
              + {option}
            </button>
          ))}
        </div>
      )}

      {/* Free-form add input */}
      {allowCustom && !atMax && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputValue}
            disabled={disabled}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                commitInput();
              } else if (
                e.key === "Backspace" &&
                inputValue === "" &&
                selected.length > 0
              ) {
                remove(selected[selected.length - 1]);
              }
            }}
            onBlur={commitInput}
            placeholder={addLabel}
            className="h-8 flex-1 rounded-full border border-border bg-transparent px-3 text-[12.5px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      )}

      {/* Custom tags surfaced under a muted label so artists see what's been
          added beyond the suggestions list. */}
      {customSelected.length > 0 && (
        <p className="text-[11px] text-muted-foreground">
          Custom: {customSelected.join(" · ")}
        </p>
      )}

      {selected.map((value) => (
        <input key={value} type="hidden" name={name} value={value} />
      ))}
    </div>
  );
}
