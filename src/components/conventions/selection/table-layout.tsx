"use client";

import { Pin, PinOff, Undo2, Wallet } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getStatusDisplay } from "./applicant-visuals";
import { WaitlistControls } from "./waitlist-controls";
import type { SelectionApplicantView } from "./types";

type EventStatus =
  | "draft"
  | "published"
  | "accepting_applications"
  | "reviewing"
  | "results_published";

interface TableLayoutProps {
  applicants: SelectionApplicantView[];
  bulkMode: boolean;
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
  onTogglePin: (id: string, pinned: boolean) => void;
  onOpenDeep: (id: string) => void;
  onConfirmPayment: (id: string) => void;
  onRevoke: (id: string) => void;
  readOnly: boolean;
  eventStatus: EventStatus;
  eventId: string;
  waitlistEnabled: boolean;
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
  onConfirmPayment,
  onRevoke,
  readOnly,
  eventStatus,
  eventId,
  waitlistEnabled,
}: TableLayoutProps) {
  if (applicants.length === 0) {
    return (
      <Card className="shadow-gallery p-12 text-center">
        <p className="text-muted-foreground">No applicants in this filter.</p>
      </Card>
    );
  }

  const isPublished = eventStatus === "results_published";
  // Post-publish needs a wider trailing column to fit mark-paid, revoke,
  // and waitlist controls alongside the pin toggle.
  const gridCols = (() => {
    if (isPublished) {
      return bulkMode
        ? "grid-cols-[28px_1.4fr_0.9fr_0.7fr_120px_minmax(220px,auto)]"
        : "grid-cols-[1.4fr_0.9fr_0.7fr_120px_minmax(220px,auto)]";
    }
    return bulkMode
      ? "grid-cols-[28px_1.4fr_0.9fr_0.7fr_120px_44px]"
      : "grid-cols-[1.4fr_0.9fr_0.7fr_120px_44px]";
  })();

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
              className={cn(
                "grid items-center gap-3 border-b border-border px-5 py-3 last:border-b-0",
                gridCols,
                isSelected && "bg-primary-container/50"
              )}
            >
              {bulkMode && !readOnly && (
                <input
                  type="checkbox"
                  onChange={() => onToggleSelect(applicant.id)}
                  checked={isSelected}
                  aria-label={`Select ${applicant.displayName}`}
                  className="size-4 accent-primary"
                />
              )}
              {bulkMode && readOnly && <span />}
              <button
                type="button"
                onClick={() => onOpenDeep(applicant.id)}
                disabled={bulkMode}
                className="min-w-0 text-left disabled:cursor-default"
              >
                <div className="flex items-center gap-1.5 truncate text-[13px] font-semibold hover:underline">
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
              </button>
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
              <Badge variant={status.variant}>{status.label}</Badge>
              {isPublished ? (
                <div className="flex flex-wrap items-center justify-end gap-1.5">
                  {applicant.status === "accepted" && (
                    <>
                      <button
                        type="button"
                        onClick={() => onConfirmPayment(applicant.id)}
                        title={
                          applicant.paymentConfirmed
                            ? "Mark unconfirmed"
                            : "Mark confirmed"
                        }
                        aria-label={
                          applicant.paymentConfirmed
                            ? "Mark unconfirmed"
                            : "Mark confirmed"
                        }
                        className={cn(
                          "grid size-8 place-items-center rounded-lg",
                          applicant.paymentConfirmed
                            ? "bg-success-container text-on-success-container"
                            : "text-muted-foreground hover:bg-muted"
                        )}
                      >
                        <Wallet className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onRevoke(applicant.id)}
                        title="Revoke acceptance"
                        aria-label="Revoke acceptance"
                        className="grid size-8 place-items-center rounded-lg text-destructive hover:bg-destructive/10"
                      >
                        <Undo2 className="size-3.5" />
                      </button>
                    </>
                  )}
                  {waitlistEnabled && (
                    <WaitlistControls
                      applicationId={applicant.id}
                      eventId={eventId}
                      status={applicant.status}
                    />
                  )}
                </div>
              ) : !readOnly ? (
                <div className="flex justify-end">
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
