"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { SelectionFilter } from "./types";
import { SELECTION_FILTERS } from "./types";

interface SelectionSidebarProps {
  counts: Record<SelectionFilter, number>;
  active: SelectionFilter;
  onChange: (filter: SelectionFilter) => void;
  genresSummary: string[];
  bulkMode: boolean;
  onToggleBulkMode: () => void;
  canBulk: boolean;
}

export function SelectionSidebar({
  counts,
  active,
  onChange,
  genresSummary,
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

      {genresSummary.length > 0 && (
        <div className="mt-4 border-t border-border pt-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
            Genres in pool
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {genresSummary.slice(0, 8).map((genre) => (
              <Badge key={genre} variant="outline">
                {genre}
              </Badge>
            ))}
          </div>
        </div>
      )}

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
