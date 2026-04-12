"use client";

import { useActionState } from "react";
import Link from "next/link";
import { applyToEvent, type ApplyResult } from "@/app/events/[eventId]/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { MissingField } from "@/lib/applications/validation";

const SECTION_LINKS: Record<string, string> = {
  basic: "/dashboard/profile#basic-info",
  logistics: "/dashboard/profile#logistics",
  portfolio: "/dashboard/profile#portfolio",
};

interface ApplyButtonProps {
  eventId: string;
  hasExistingApplication: boolean;
  validationResult:
    | { valid: true }
    | { valid: false; missingFields: MissingField[] };
}

export function ApplyButton({
  eventId,
  hasExistingApplication,
  validationResult,
}: ApplyButtonProps) {
  const [state, formAction, pending] = useActionState<ApplyResult, FormData>(
    applyToEvent,
    {}
  );

  if (hasExistingApplication || state.success) {
    return (
      <div className="rounded-md bg-green-500/10 p-4 text-center">
        <Badge variant="default" className="text-sm">
          {state.success ? "Application submitted!" : "Already Applied"}
        </Badge>
      </div>
    );
  }

  // Server returned missing fields
  if (state.error === "missing_fields" && state.missingFields) {
    return (
      <div className="space-y-3">
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive" role="alert">
          Your profile is missing required information for this event.
        </div>
        <MissingFieldsList missingFields={state.missingFields} />
      </div>
    );
  }

  // Client-side pre-check: show missing fields before submitting
  if (!validationResult.valid) {
    return (
      <div className="space-y-3">
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive" role="alert">
          Complete your profile before applying. The following fields are
          required:
        </div>
        <MissingFieldsList missingFields={validationResult.missingFields} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {state.error && state.error !== "missing_fields" && (
        <div
          className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
          role="alert"
        >
          {state.error}
        </div>
      )}
      <form action={formAction}>
        <input type="hidden" name="eventId" value={eventId} />
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Submitting..." : "Apply Now"}
        </Button>
      </form>
    </div>
  );
}

function MissingFieldsList({
  missingFields,
}: {
  missingFields: MissingField[];
}) {
  return (
    <ul className="space-y-1">
      {missingFields.map((field) => (
        <li key={field.key} className="text-sm">
          <Link
            href={SECTION_LINKS[field.section] ?? "/dashboard/profile"}
            className="text-primary underline underline-offset-4"
          >
            {field.label}
          </Link>
          <span className="text-muted-foreground">
            {" "}
            ({field.section})
          </span>
        </li>
      ))}
    </ul>
  );
}
