"use client";

import { Pin, PinOff, Check, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getStatusDisplay } from "./applicant-visuals";
import { PortfolioCollage } from "./portfolio-collage";
import type { SelectionApplicantView } from "./types";

interface GalleryLayoutProps {
  applicants: SelectionApplicantView[];
  bulkMode: boolean;
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
  onTogglePin: (id: string, pinned: boolean) => void;
  onSetStatus: (id: string, status: "accepted" | "rejected") => void;
  readOnly: boolean;
}

export function GalleryLayout({
  applicants,
  bulkMode,
  selected,
  onToggleSelect,
  onTogglePin,
  onSetStatus,
  readOnly,
}: GalleryLayoutProps) {
  if (applicants.length === 0) {
    return (
      <Card className="shadow-gallery p-12 text-center">
        <p className="font-heading text-lg font-extrabold">
          Nothing in this bucket
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          No applicants match this filter. Try &ldquo;All applicants&rdquo; to
          see everyone.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {applicants.map((applicant) => {
        const isSelected = selected.has(applicant.id);
        const status = getStatusDisplay(applicant.status, applicant.pinned);
        return (
          <div
            key={applicant.id}
            className={cn(
              "relative overflow-hidden rounded-2xl border border-border bg-card transition-all",
              isSelected
                ? "border-primary shadow-gallery ring-2 ring-primary/25"
                : "hover:shadow-gallery"
            )}
          >
            {bulkMode && !readOnly && (
              <button
                type="button"
                onClick={() => onToggleSelect(applicant.id)}
                aria-label={
                  isSelected ? "Unselect applicant" : "Select applicant"
                }
                aria-pressed={isSelected}
                className={cn(
                  "absolute left-2.5 top-2.5 z-10 grid size-7 place-items-center rounded-lg border-2 backdrop-blur",
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-white/80 bg-card/90"
                )}
              >
                {isSelected && <Check className="size-3.5" strokeWidth={3} />}
              </button>
            )}
            <div className="relative">
              <PortfolioCollage
                images={applicant.images}
                displayName={applicant.displayName}
              />
              <div
                className={cn(
                  "absolute top-2.5 flex gap-1.5",
                  bulkMode && !readOnly ? "left-12" : "left-2.5"
                )}
              >
                <Badge variant={status.variant}>{status.label}</Badge>
              </div>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => onTogglePin(applicant.id, !applicant.pinned)}
                  title={applicant.pinned ? "Unpin" : "Pin this artist"}
                  aria-label={applicant.pinned ? "Unpin" : "Pin this artist"}
                  className={cn(
                    "absolute right-2.5 top-2.5 grid size-8 place-items-center rounded-full backdrop-blur transition-all",
                    applicant.pinned
                      ? "bg-warning text-white"
                      : "bg-black/45 text-white/90 hover:bg-black/65"
                  )}
                >
                  {applicant.pinned ? (
                    <PinOff className="size-4" />
                  ) : (
                    <Pin className="size-4" />
                  )}
                </button>
              )}
            </div>
            <div className="p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-heading text-[14px] font-extrabold leading-tight">
                    {applicant.displayName}
                  </div>
                  {applicant.tableSizePreference && (
                    <div className="truncate font-mono text-[11.5px] text-muted-foreground">
                      Table: {applicant.tableSizePreference}
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-2.5 flex flex-wrap gap-1">
                {applicant.genres.slice(0, 3).map((genre) => (
                  <Badge key={genre} variant="default">
                    {genre}
                  </Badge>
                ))}
                {applicant.mediums.slice(0, 1).map((medium) => (
                  <Badge key={medium} variant="outline">
                    {medium}
                  </Badge>
                ))}
              </div>
              {!readOnly && (
                <div className="mt-2.5 flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => onSetStatus(applicant.id, "rejected")}
                    className={cn(
                      "flex h-8 flex-1 items-center justify-center gap-1 rounded-lg border text-[11.5px] font-semibold transition-colors",
                      applicant.status === "rejected"
                        ? "border-destructive/40 bg-tertiary-container text-on-tertiary-container"
                        : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <X className="size-3" />
                    Not this year
                  </button>
                  <button
                    type="button"
                    onClick={() => onSetStatus(applicant.id, "accepted")}
                    className={cn(
                      "flex h-8 flex-1 items-center justify-center gap-1 rounded-lg border text-[11.5px] font-semibold transition-colors",
                      applicant.status === "accepted"
                        ? "border-success/40 bg-success-container text-on-success-container"
                        : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Check className="size-3" />
                    Accept
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
