"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { SelectionFilter } from "./types";
import { SELECTION_FILTERS } from "./types";
import {
  RepresentationCloud,
  type TagSummary,
} from "./representation-cloud";

interface SelectionSidebarProps {
  counts: Record<SelectionFilter, number>;
  active: SelectionFilter;
  onChange: (filter: SelectionFilter) => void;
  genresSummary: TagSummary[];
  mediumsSummary: TagSummary[];
  bulkMode: boolean;
  onToggleBulkMode: () => void;
  canBulk: boolean;
}

interface CollapsibleSectionProps {
  label: string;
  count: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function CollapsibleSection({
  label,
  count,
  defaultOpen = true,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mt-4 border-t border-border pt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-wider text-primary hover:text-foreground"
      >
        <span className="inline-flex items-center gap-1">
          {open ? (
            <ChevronDown className="size-3" />
          ) : (
            <ChevronRight className="size-3" />
          )}
          {label}
        </span>
        <span className="font-mono text-[10px] text-muted-foreground">
          {count}
        </span>
      </button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  );
}

export function SelectionSidebar({
  counts,
  active,
  onChange,
  genresSummary,
  mediumsSummary,
  bulkMode,
  onToggleBulkMode,
  canBulk,
}: SelectionSidebarProps) {
  return (
    <Card className="shadow-gallery p-4">
      <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
        Filter
      </p>
      <nav className="mt-2 space-y-0.5" aria-label="Selection filters">
        {SELECTION_FILTERS.map(({ value, label }) => {
          const isActive = value === active;
          return (
            <button
              key={value}
              type="button"
              onClick={() => onChange(value)}
              aria-pressed={isActive}
              className={cn(
                "flex h-9 w-full items-center justify-between rounded-lg px-2 text-[12.5px] font-semibold transition-colors",
                isActive
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <span>{label}</span>
              <span className="font-mono text-[11px]">{counts[value]}</span>
            </button>
          );
        })}
      </nav>

      <CollapsibleSection label="Genres" count={genresSummary.length}>
        <RepresentationCloud tags={genresSummary} />
      </CollapsibleSection>

      <CollapsibleSection label="Mediums" count={mediumsSummary.length}>
        <RepresentationCloud tags={mediumsSummary} />
      </CollapsibleSection>

      {canBulk && (
        <div className="mt-4 border-t border-border pt-4">
          <button
            type="button"
            onClick={onToggleBulkMode}
            aria-pressed={bulkMode}
            className={cn(
              "h-9 w-full rounded-lg text-[12.5px] font-semibold transition-colors",
              bulkMode
                ? "bg-primary-container text-on-primary-container"
                : "border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {bulkMode ? "Exit bulk mode" : "Bulk actions"}
          </button>
        </div>
      )}
    </Card>
  );
}
