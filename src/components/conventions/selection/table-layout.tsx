"use client";

import { Pin, PinOff } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getStatusDisplay } from "./applicant-visuals";
import type { SelectionApplicantView } from "./types";

interface TableLayoutProps {
  applicants: SelectionApplicantView[];
  bulkMode: boolean;
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
  onTogglePin: (id: string, pinned: boolean) => void;
  onOpenDeep: (id: string) => void;
  readOnly: boolean;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function TableLayout({
  applicants,
  bulkMode,
  selected,
  onToggleSelect,
  onTogglePin,
  onOpenDeep,
  readOnly,
}: TableLayoutProps) {
  if (applicants.length === 0) {
    return (
      <Card className="shadow-gallery p-12 text-center">
        <p className="text-muted-foreground">No applicants in this filter.</p>
      </Card>
    );
  }

  const gridCols = bulkMode
    ? "grid-cols-[28px_1.4fr_0.9fr_0.7fr_0.7fr_120px_44px]"
    : "grid-cols-[1.4fr_0.9fr_0.7fr_0.7fr_120px_44px]";

  return (
    <Card className="shadow-gallery overflow-hidden p-0">
      <div
        className={cn(
          "grid gap-3 border-b border-border bg-muted px-5 py-3 text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted-foreground",
          gridCols
        )}
      >
        {bulkMode && <span />}
        <span>Artist</span>
        <span>Genres · medium</span>
        <span>Submitted</span>
        <span>Table req.</span>
        <span>Status</span>
        <span />
      </div>
      <div>
        {applicants.map((applicant) => {
          const status = getStatusDisplay(applicant.status, applicant.pinned);
          const isSelected = selected.has(applicant.id);
          return (
            <div
              key={applicant.id}
              role="button"
              tabIndex={0}
              onClick={() => !bulkMode && onOpenDeep(applicant.id)}
              onKeyDown={(event) => {
                if (!bulkMode && (event.key === "Enter" || event.key === " ")) {
                  event.preventDefault();
                  onOpenDeep(applicant.id);
                }
              }}
              className={cn(
                "grid cursor-pointer items-center gap-3 border-b border-border px-5 py-3 text-left last:border-b-0 hover:bg-muted/60",
                gridCols,
                isSelected && "bg-primary-container/50"
              )}
            >
              {bulkMode && !readOnly && (
                <input
                  type="checkbox"
                  onClick={(event) => event.stopPropagation()}
                  onChange={() => onToggleSelect(applicant.id)}
                  checked={isSelected}
                  aria-label={`Select ${applicant.displayName}`}
                  className="size-4 accent-primary"
                />
              )}
              {bulkMode && readOnly && <span />}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 truncate text-[13px] font-semibold">
                  {applicant.displayName}
                  {applicant.pinned && (
                    <Pin className="size-3 text-warning" />
                  )}
                </div>
                <div className="truncate font-mono text-[11px] text-muted-foreground">
                  {applicant.helpers != null
                    ? `${applicant.helpers} helper${applicant.helpers === 1 ? "" : "s"}`
                    : ""}
                </div>
              </div>
              <div className="min-w-0 truncate text-[11.5px]">
                <div className="truncate">
                  {applicant.genres.slice(0, 2).join(" · ") || "—"}
                </div>
                <div className="truncate font-mono text-[11px] text-muted-foreground">
                  {applicant.mediums.join(", ") || "—"}
                </div>
              </div>
              <div className="font-mono text-[11.5px] text-muted-foreground">
                {formatDate(applicant.createdAt)}
              </div>
              <div className="font-mono text-[11.5px]">
                {applicant.tableSizePreference ?? "—"}
              </div>
              <Badge variant={status.variant}>{status.label}</Badge>
              {!readOnly ? (
                <div
                  className="flex justify-end"
                  onClick={(event) => event.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() =>
                      onTogglePin(applicant.id, !applicant.pinned)
                    }
                    title={applicant.pinned ? "Unpin" : "Pin"}
                    aria-label={applicant.pinned ? "Unpin" : "Pin"}
                    className={cn(
                      "grid size-8 place-items-center rounded-lg",
                      applicant.pinned
                        ? "bg-warning-container text-on-warning-container"
                        : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {applicant.pinned ? (
                      <PinOff className="size-3.5" />
                    ) : (
                      <Pin className="size-3.5" />
                    )}
                  </button>
                </div>
              ) : (
                <span />
              )}
            </div>
          );
        })}
      </div>
      <div className="border-t border-border bg-muted/40 px-5 py-3 font-mono text-[11.5px] text-muted-foreground">
        {applicants.length} applicant{applicants.length === 1 ? "" : "s"} · click
        a row to open deep review
      </div>
    </Card>
  );
}
