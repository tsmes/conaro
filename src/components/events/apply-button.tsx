"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import type { MissingField } from "@/lib/applications/validation";
import type {
  FieldRequirements,
  TableSizeOption,
} from "@/lib/db/schema/events";
import { ApplicationForm } from "./application-form";

const SECTION_LINKS: Record<string, string> = {
  basic: "/dashboard/profile#basic-info",
  logistics: "/dashboard/profile#logistics",
  portfolio: "/dashboard/profile#promo",
  application: "/dashboard/profile",
};

interface ApplyButtonProps {
  eventId: string;
  hasExistingApplication: boolean;
  validationResult:
    | { valid: true }
    | { valid: false; missingFields: MissingField[] };
  guidelines: string | null;
  fieldRequirements: FieldRequirements | null;
  tableSizeOptions: TableSizeOption[];
  maxAssistants: number;
  assistantFeeNok: number | null;
}

export function ApplyButton({
  eventId,
  hasExistingApplication,
  validationResult,
  guidelines,
  fieldRequirements,
  tableSizeOptions,
  maxAssistants,
  assistantFeeNok,
}: ApplyButtonProps) {
  if (hasExistingApplication) {
    // success-container / on-success-container tokens are wired up
    // in both light and dark themes (globals.css), so contrast +
    // saturation stays sensible on either side. Switching off the
    // bare bg-green-500/10 + dark Badge pairing that read as a
    // grey-on-mint pill in light mode and washed out in dark.
    return (
      <div className="flex items-center justify-center gap-2 rounded-md bg-success-container px-4 py-3 text-on-success-container">
        <CheckCircle2 className="size-4" />
        <span className="text-sm font-semibold">Already applied</span>
      </div>
    );
  }

  if (!validationResult.valid) {
    return (
      <div className="space-y-3">
        <div
          className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
          role="alert"
        >
          Complete your profile before applying. The following fields are
          required:
        </div>
        <MissingFieldsList missingFields={validationResult.missingFields} />
      </div>
    );
  }

  return (
    <ApplicationForm
      eventId={eventId}
      guidelines={guidelines}
      fieldRequirements={fieldRequirements}
      tableSizeOptions={tableSizeOptions}
      maxAssistants={maxAssistants}
      assistantFeeNok={assistantFeeNok}
    />
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
          <span className="text-muted-foreground"> ({field.section})</span>
        </li>
      ))}
    </ul>
  );
}
