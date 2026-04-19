"use client";

import { useCallback, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

interface ChipSelectProps {
  name: string;
  options: readonly string[];
  defaultValues?: readonly string[];
  max?: number;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}

export function ChipSelect({
  name,
  options,
  defaultValues,
  max,
  disabled,
  className,
  "aria-label": ariaLabel,
}: ChipSelectProps) {
  const initial = useMemo(() => {
    const allowed = new Set(options);
    const seen = new Set<string>();
    const out: string[] = [];
    for (const v of defaultValues ?? []) {
      if (allowed.has(v) && !seen.has(v)) {
        seen.add(v);
        out.push(v);
      }
    }
    return out;
  }, [defaultValues, options]);

  const [selected, setSelected] = useState<string[]>(initial);
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const toggle = useCallback(
    (value: string) => {
      setSelected((prev) => {
        if (prev.includes(value)) {
          return prev.filter((v) => v !== value);
        }
        if (max != null && prev.length >= max) {
          return prev;
        }
        return [...prev, value];
      });
    },
    [max]
  );

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn("flex flex-wrap gap-1.5", className)}
    >
      {options.map((option) => {
        const active = selectedSet.has(option);
        return (
          <button
            key={option}
            type="button"
            aria-pressed={active}
            disabled={disabled}
            onClick={() => toggle(option)}
            className={cn(
              "inline-flex h-7 items-center rounded-full px-3 text-[11.5px] font-semibold uppercase tracking-wider transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              "disabled:opacity-50 disabled:pointer-events-none",
              active
                ? "bg-primary text-primary-foreground hover:brightness-110"
                : "border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {option}
          </button>
        );
      })}
      {selected.map((value) => (
        <input key={value} type="hidden" name={name} value={value} />
      ))}
    </div>
  );
}
