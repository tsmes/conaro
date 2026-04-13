"use client";

import { useActionState, useState } from "react";
import { FIELD_REGISTRY } from "@/lib/db/field-registry";
import type { FieldRequirements } from "@/lib/db/schema/events";
import { updateFieldConfig } from "@/app/(authenticated)/conventions/manage/events/[eventId]/fields/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface OtherEvent {
  id: string;
  name: string;
  fieldRequirements: FieldRequirements | null;
  minPortfolioImages: number | null;
}

interface FieldConfigFormProps {
  eventId: string;
  currentConfig: FieldRequirements | null;
  minPortfolioImages: number | null;
  otherEvents: OtherEvent[];
}

const SECTIONS = [
  { key: "basic", label: "Basic Info" },
  { key: "logistics", label: "Logistics" },
  { key: "portfolio", label: "Portfolio" },
] as const;

const STATE_OPTIONS = [
  { value: "not_requested", label: "Not requested" },
  { value: "optional", label: "Optional" },
  { value: "required", label: "Required" },
] as const;

export function FieldConfigForm({
  eventId,
  currentConfig,
  minPortfolioImages: currentMinImages,
  otherEvents,
}: FieldConfigFormProps) {
  const [state, formAction, pending] = useActionState(updateFieldConfig, {});

  const [fieldValues, setFieldValues] = useState<Record<string, string>>(() => {
    const values: Record<string, string> = {};
    for (const field of FIELD_REGISTRY) {
      values[field.key] = currentConfig?.[field.key] ?? "not_requested";
    }
    return values;
  });

  const [minImages, setMinImages] = useState(
    String(currentMinImages ?? 0)
  );

  function handleCopyFrom(sourceEventId: string) {
    const source = otherEvents.find((e) => e.id === sourceEventId);
    if (!source) return;

    const newValues: Record<string, string> = {};
    for (const field of FIELD_REGISTRY) {
      newValues[field.key] =
        source.fieldRequirements?.[field.key] ?? "not_requested";
    }
    setFieldValues(newValues);
    setMinImages(String(source.minPortfolioImages ?? 0));
  }

  const showMinImages =
    fieldValues.portfolioImages === "optional" ||
    fieldValues.portfolioImages === "required";

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="eventId" value={eventId} />

      {!pending && state.error && (
        <div
          className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
          role="alert"
        >
          {state.error}
        </div>
      )}
      {!pending && state.success && (
        <div
          className="rounded-md bg-green-500/10 p-3 text-sm text-green-700"
          role="status"
        >
          Field configuration saved successfully.
        </div>
      )}

      {otherEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Copy from Event</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                onChange={(e) => {
                  if (e.target.value) handleCopyFrom(e.target.value);
                }}
                defaultValue=""
              >
                <option value="">Select an event...</option>
                {otherEvents.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>
      )}

      {SECTIONS.map((section) => {
        const fields = FIELD_REGISTRY.filter(
          (f) => f.section === section.key
        );
        if (fields.length === 0) return null;

        return (
          <Card key={section.key}>
            <CardHeader>
              <CardTitle className="text-base">{section.label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {fields.map((field) => (
                <div
                  key={field.key}
                  className="flex items-center justify-between gap-4"
                >
                  <Label htmlFor={field.key} className="font-normal">
                    {field.label}
                  </Label>
                  <select
                    id={field.key}
                    name={field.key}
                    value={fieldValues[field.key]}
                    onChange={(e) =>
                      setFieldValues((prev) => ({
                        ...prev,
                        [field.key]: e.target.value,
                      }))
                    }
                    className="flex h-9 w-40 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                  >
                    {STATE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}

              {section.key === "portfolio" && showMinImages && (
                <div className="flex items-center justify-between gap-4 pl-4">
                  <Label htmlFor="minPortfolioImages" className="font-normal">
                    Minimum images required
                  </Label>
                  <Input
                    id="minPortfolioImages"
                    name="minPortfolioImages"
                    type="number"
                    min={0}
                    max={20}
                    value={minImages}
                    onChange={(e) => setMinImages(e.target.value)}
                    className="w-20"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {!showMinImages && (
        <input type="hidden" name="minPortfolioImages" value="0" />
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save Configuration"}
      </Button>
    </form>
  );
}
