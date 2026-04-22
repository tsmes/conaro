"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  Pin,
  PinOff,
  X,
  Wallet,
  Undo2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatDateNo } from "@/lib/utils/format-date-no";
import { getStatusDisplay } from "./applicant-visuals";
import { PortfolioCollage } from "./portfolio-collage";
import type {
  ApplicationAnswersView,
  SelectionApplicantView,
} from "./types";

function ApplicationAnswersPanel({
  answers,
}: {
  answers: ApplicationAnswersView;
}) {
  const hasAny =
    answers.tableSizeLabel ||
    answers.assistantsCount !== null ||
    answers.sharingStand ||
    answers.placementPreference ||
    answers.additionalComments ||
    answers.promotionConsent !== null;

  if (!hasAny && !answers.guidelinesAcknowledgedAt) return null;

  return (
    <div className="space-y-3 rounded-md border border-border p-3">
      <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
        Application answers
      </p>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
        {answers.tableSizeLabel && (
          <div className="col-span-2">
            <dt className="text-[11px] font-semibold uppercase text-muted-foreground">
              Table size
            </dt>
            <dd className="font-mono">
              {answers.tableSizeLabel}
              {answers.tableSizeDimensions
                ? ` · ${answers.tableSizeDimensions}`
                : ""}
              {answers.tableSizePriceNok !== null
                ? ` · ${answers.tableSizePriceNok} NOK`
                : ""}
            </dd>
          </div>
        )}
        {answers.assistantsCount !== null && (
          <div className="col-span-2">
            <dt className="text-[11px] font-semibold uppercase text-muted-foreground">
              Assistants
            </dt>
            <dd>
              {answers.assistantsCount === 0
                ? "None"
                : `${answers.assistantsCount} (${answers.assistantsNames.join(", ")})`}
            </dd>
          </div>
        )}
        {answers.sharingStand && (
          <div className="col-span-2">
            <dt className="text-[11px] font-semibold uppercase text-muted-foreground">
              Sharing stand
            </dt>
            <dd>
              {answers.sharingStand.sharing
                ? `Yes${answers.sharingStand.with ? ` — ${answers.sharingStand.with}` : ""}`
                : "No"}
            </dd>
          </div>
        )}
        {answers.placementPreference && (
          <div className="col-span-2">
            <dt className="text-[11px] font-semibold uppercase text-muted-foreground">
              Placement preference
            </dt>
            <dd>{answers.placementPreference}</dd>
          </div>
        )}
        {answers.additionalComments && (
          <div className="col-span-2">
            <dt className="text-[11px] font-semibold uppercase text-muted-foreground">
              Additional comments
            </dt>
            <dd>{answers.additionalComments}</dd>
          </div>
        )}
        {answers.promotionConsent !== null && (
          <div>
            <dt className="text-[11px] font-semibold uppercase text-muted-foreground">
              Promotion
            </dt>
            <dd>{answers.promotionConsent ? "Consented" : "Declined"}</dd>
          </div>
        )}
        {answers.guidelinesAcknowledgedAt && (
          <div>
            <dt className="text-[11px] font-semibold uppercase text-muted-foreground">
              Guidelines ack
            </dt>
            <dd className="font-mono">
              {formatDateNo(
                answers.guidelinesAcknowledgedAt.toISOString().slice(0, 10)
              )}
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}

type EventStatus =
  | "draft"
  | "published"
  | "accepting_applications"
  | "reviewing"
  | "results_published";

interface DeepReviewLayoutProps {
  applicants: SelectionApplicantView[];
  index: number;
  onIndexChange: (index: number) => void;
  onTogglePin: (id: string, pinned: boolean) => void;
  onSetStatus: (id: string, status: "accepted" | "rejected") => void;
  onConfirmPayment: (id: string) => void;
  onRevoke: (id: string) => void;
  readOnly: boolean;
  eventStatus: EventStatus;
}

export function DeepReviewLayout({
  applicants,
  index,
  onIndexChange,
  onTogglePin,
  onSetStatus,
  onConfirmPayment,
  onRevoke,
  readOnly,
  eventStatus,
}: DeepReviewLayoutProps) {
  if (applicants.length === 0) {
    return (
      <Card className="shadow-gallery p-10 text-center text-muted-foreground">
        Nothing matches this filter.
      </Card>
    );
  }

  const clampedIndex = Math.min(Math.max(index, 0), applicants.length - 1);
  const applicant = applicants[clampedIndex];
  const status = getStatusDisplay(applicant.status, applicant.pinned);
  const isPublished = eventStatus === "results_published";
  const canConfirmPayment =
    isPublished && applicant.status === "accepted";
  const canRevoke = isPublished && applicant.status === "accepted";

  return (
    <Card className="shadow-gallery overflow-hidden p-0">
      <div className="grid lg:grid-cols-[1.15fr_1fr]">
        <div className="relative bg-muted">
          <PortfolioCollage
            images={applicant.images}
            displayName={applicant.displayName}
            className="aspect-[4/3]"
          />
          <div className="absolute left-3 top-3 flex gap-2">
            <Badge variant={status.variant}>{status.label}</Badge>
            <Badge
              variant="outline"
              className="bg-card/85 font-mono backdrop-blur"
            >
              {clampedIndex + 1}/{applicants.length}
            </Badge>
          </div>
          {!readOnly && (
            <button
              type="button"
              onClick={() => onTogglePin(applicant.id, !applicant.pinned)}
              aria-label={applicant.pinned ? "Unpin" : "Pin"}
              className={cn(
                "absolute right-3 top-3 inline-flex h-9 items-center gap-1.5 rounded-[10px] px-3 text-[12px] font-semibold backdrop-blur transition-all",
                applicant.pinned
                  ? "bg-warning text-white"
                  : "bg-black/45 text-white hover:bg-black/65"
              )}
            >
              {applicant.pinned ? (
                <PinOff className="size-3.5" />
              ) : (
                <Pin className="size-3.5" />
              )}
              {applicant.pinned ? "Pinned" : "Pin"}
            </button>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-5 p-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
              Applicant
            </p>
            <h2 className="truncate font-heading text-[24px] font-extrabold leading-tight tracking-tight">
              {applicant.displayName}
            </h2>
            {(applicant.genres.length > 0 ||
              applicant.mediums.length > 0) && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {applicant.genres.map((genre) => (
                  <Badge key={genre} variant="default">
                    {genre}
                  </Badge>
                ))}
                {applicant.mediums.map((medium) => (
                  <Badge key={medium} variant="outline">
                    {medium}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {applicant.bio && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
                Statement
              </p>
              <p className="mt-1.5 text-[13.5px] leading-[1.55] text-foreground">
                {applicant.bio}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 rounded-[12px] bg-muted p-3">
            <div>
              <div className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
                Helpers
              </div>
              <div className="font-mono text-[13px] font-semibold">
                {applicant.helpers ?? 0}
              </div>
            </div>
            <div>
              <div className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
                Accessibility
              </div>
              <div className="font-mono text-[13px] font-semibold">
                {applicant.accessibilityNeeds ? "Noted" : "—"}
              </div>
            </div>
          </div>

          {applicant.accessibilityNeeds && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
                Accessibility needs
              </p>
              <p className="mt-1.5 text-[13px] text-foreground">
                {applicant.accessibilityNeeds}
              </p>
            </div>
          )}

          <ApplicationAnswersPanel answers={applicant.answers} />

          <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onIndexChange(Math.max(0, clampedIndex - 1))}
              disabled={clampedIndex === 0}
            >
              <ArrowLeft className="size-3.5" />
              Prev
            </Button>
            <div className="flex-1" />
            {!readOnly && (
              <>
                <Button
                  type="button"
                  variant={
                    applicant.status === "rejected" ? "destructive" : "outline"
                  }
                  size="sm"
                  onClick={() => onSetStatus(applicant.id, "rejected")}
                >
                  <X className="size-3.5" />
                  Not this year
                </Button>
                <Button
                  type="button"
                  variant={
                    applicant.status === "accepted" ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => onSetStatus(applicant.id, "accepted")}
                >
                  <Check className="size-3.5" />
                  Accept
                </Button>
              </>
            )}
            {canConfirmPayment && (
              <Button
                type="button"
                variant={applicant.paymentConfirmed ? "outline" : "default"}
                size="sm"
                onClick={() => onConfirmPayment(applicant.id)}
              >
                <Wallet className="size-3.5" />
                {applicant.paymentConfirmed ? "Mark unpaid" : "Mark paid"}
              </Button>
            )}
            {canRevoke && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => onRevoke(applicant.id)}
              >
                <Undo2 className="size-3.5" />
                Revoke
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              onClick={() =>
                onIndexChange(Math.min(applicants.length - 1, clampedIndex + 1))
              }
              disabled={clampedIndex >= applicants.length - 1}
            >
              Next
              <ArrowRight className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
