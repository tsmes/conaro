"use client";

import { useMemo, useState, useTransition } from "react";
import { Eye, Grid3x3, List } from "lucide-react";

import { Segmented } from "@/components/ui/segmented";
import {
  setApplicationDecision,
  setBulkDecision,
  toggleApplicationPin,
  confirmPayment,
  revokeApplication,
} from "@/app/(authenticated)/conventions/manage/events/[eventId]/applications/actions";
import { BulkBar } from "./bulk-bar";
import { DeepReviewLayout } from "./deep-review-layout";
import { GalleryLayout } from "./gallery-layout";
import { SelectionProgress } from "./selection-progress";
import { SelectionSidebar } from "./selection-sidebar";
import { TableLayout } from "./table-layout";
import type {
  SelectionApplicantView,
  SelectionFilter,
  SelectionLayout,
} from "./types";

type EventStatus =
  | "draft"
  | "published"
  | "accepting_applications"
  | "reviewing"
  | "results_published";

interface SelectionWorkspaceProps {
  eventId: string;
  eventStatus: EventStatus;
  availableStands: number | null;
  applicants: SelectionApplicantView[];
}

const LAYOUT_OPTIONS = [
  { value: "gallery" as const, label: "Gallery", icon: <Grid3x3 className="size-3.5" /> },
  { value: "table" as const, label: "Table", icon: <List className="size-3.5" /> },
  { value: "stacked" as const, label: "Deep review", icon: <Eye className="size-3.5" /> },
];

function matchesFilter(
  applicant: SelectionApplicantView,
  filter: SelectionFilter
): boolean {
  switch (filter) {
    case "all":
      return true;
    case "undecided":
      return applicant.status === "submitted" || applicant.status === "under_review";
    case "pinned":
      return applicant.pinned;
    case "accepted":
      return applicant.status === "accepted";
    case "rejected":
      return applicant.status === "rejected" || applicant.status === "revoked";
  }
}

export function SelectionWorkspace({
  eventId,
  eventStatus,
  availableStands,
  applicants: initialApplicants,
}: SelectionWorkspaceProps) {
  const [applicants, setApplicants] =
    useState<SelectionApplicantView[]>(initialApplicants);
  const [filter, setFilter] = useState<SelectionFilter>("all");
  const [layout, setLayout] = useState<SelectionLayout>("gallery");
  const [deepIndex, setDeepIndex] = useState(0);
  const [bulkMode, setBulkMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Organizers can act on applications while they're still coming in, too —
  // only lock the workspace once results have been published.
  const readOnly = eventStatus === "results_published";

  const filtered = useMemo(
    () => applicants.filter((a) => matchesFilter(a, filter)),
    [applicants, filter]
  );

  const counts = useMemo<Record<SelectionFilter, number>>(() => {
    return {
      all: applicants.length,
      undecided: applicants.filter((a) => matchesFilter(a, "undecided")).length,
      pinned: applicants.filter((a) => a.pinned).length,
      accepted: applicants.filter((a) => a.status === "accepted").length,
      rejected: applicants.filter((a) => matchesFilter(a, "rejected")).length,
    };
  }, [applicants]);

  const genresSummary = useMemo(() => {
    const set = new Set<string>();
    for (const applicant of applicants) {
      for (const genre of applicant.genres) {
        set.add(genre);
      }
    }
    return Array.from(set).sort();
  }, [applicants]);

  function handleFilterChange(next: SelectionFilter) {
    setFilter(next);
    setDeepIndex(0);
  }

  function handleLayoutChange(next: SelectionLayout) {
    setLayout(next);
  }

  function handleToggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleToggleBulkMode() {
    setBulkMode((prev) => {
      const next = !prev;
      if (!next) setSelected(new Set());
      return next;
    });
  }

  function applyOptimistic(
    update: (list: SelectionApplicantView[]) => SelectionApplicantView[],
    action: () => Promise<{ error?: string }>
  ) {
    let previous: SelectionApplicantView[] = [];
    setApplicants((current) => {
      previous = current;
      return update(current);
    });
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result?.error) {
        setApplicants(previous);
        setError(result.error);
      }
    });
  }

  function handleTogglePin(id: string, pinned: boolean) {
    applyOptimistic(
      (list) => list.map((a) => (a.id === id ? { ...a, pinned } : a)),
      async () => {
        const formData = new FormData();
        formData.set("applicationId", id);
        formData.set("eventId", eventId);
        formData.set("pinned", pinned ? "true" : "false");
        return toggleApplicationPin({}, formData);
      }
    );
  }

  function handleSetStatus(id: string, status: "accepted" | "rejected") {
    applyOptimistic(
      (list) => list.map((a) => (a.id === id ? { ...a, status } : a)),
      async () => {
        const formData = new FormData();
        formData.set("applicationId", id);
        formData.set("eventId", eventId);
        formData.set("decision", status);
        return setApplicationDecision({}, formData);
      }
    );
  }

  function handleBulkDecision(status: "accepted" | "rejected") {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    const idSet = new Set(ids);
    applyOptimistic(
      (list) => list.map((a) => (idSet.has(a.id) ? { ...a, status } : a)),
      async () => {
        const formData = new FormData();
        formData.set("eventId", eventId);
        formData.set("decision", status);
        for (const id of ids) {
          formData.append("applicationIds", id);
        }
        const result = await setBulkDecision({}, formData);
        if (!result.error) setSelected(new Set());
        return result;
      }
    );
  }

  function handleOpenDeep(id: string) {
    const index = filtered.findIndex((a) => a.id === id);
    setDeepIndex(index >= 0 ? index : 0);
    setLayout("stacked");
  }

  function handleConfirmPayment(id: string) {
    applyOptimistic(
      (list) =>
        list.map((a) =>
          a.id === id ? { ...a, paymentConfirmed: !a.paymentConfirmed } : a
        ),
      async () => {
        const formData = new FormData();
        formData.set("applicationId", id);
        formData.set("eventId", eventId);
        return confirmPayment({}, formData);
      }
    );
  }

  function handleRevoke(id: string) {
    const message = typeof window !== "undefined"
      ? window.prompt("Reason for revoking (optional):")
      : "";
    if (message === null) return;
    applyOptimistic(
      (list) =>
        list.map((a) => (a.id === id ? { ...a, status: "revoked" } : a)),
      async () => {
        const formData = new FormData();
        formData.set("applicationId", id);
        formData.set("eventId", eventId);
        formData.set("message", message);
        return revokeApplication({}, formData);
      }
    );
  }

  return (
    <div className="space-y-5">
      <SelectionProgress
        applied={counts.all}
        accepted={counts.accepted}
        pinned={counts.pinned}
        target={availableStands}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          value={layout}
          onChange={handleLayoutChange}
          options={LAYOUT_OPTIONS}
          aria-label="Layout"
        />
        {pending && (
          <span className="text-xs text-muted-foreground">Saving…</span>
        )}
      </div>
      {error && (
        <div
          role="alert"
          className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr]">
        <aside>
          <SelectionSidebar
            counts={counts}
            active={filter}
            onChange={handleFilterChange}
            genresSummary={genresSummary}
            bulkMode={bulkMode}
            onToggleBulkMode={handleToggleBulkMode}
            canBulk={!readOnly}
          />
        </aside>
        <div className="min-w-0 space-y-4">
          {!readOnly && bulkMode && (
            <BulkBar
              count={selected.size}
              onAccept={() => handleBulkDecision("accepted")}
              onReject={() => handleBulkDecision("rejected")}
              onClear={() => setSelected(new Set())}
              disabled={pending}
            />
          )}
          {layout === "gallery" && (
            <GalleryLayout
              applicants={filtered}
              bulkMode={bulkMode && !readOnly}
              selected={selected}
              onToggleSelect={handleToggleSelect}
              onTogglePin={handleTogglePin}
              onSetStatus={handleSetStatus}
              readOnly={readOnly}
            />
          )}
          {layout === "table" && (
            <TableLayout
              applicants={filtered}
              bulkMode={bulkMode && !readOnly}
              selected={selected}
              onToggleSelect={handleToggleSelect}
              onTogglePin={handleTogglePin}
              onOpenDeep={handleOpenDeep}
              readOnly={readOnly}
            />
          )}
          {layout === "stacked" && (
            <DeepReviewLayout
              applicants={filtered}
              index={deepIndex}
              onIndexChange={setDeepIndex}
              onTogglePin={handleTogglePin}
              onSetStatus={handleSetStatus}
              onConfirmPayment={handleConfirmPayment}
              onRevoke={handleRevoke}
              readOnly={readOnly}
              eventStatus={eventStatus}
            />
          )}
        </div>
      </div>
    </div>
  );
}
