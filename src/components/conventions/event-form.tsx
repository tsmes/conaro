"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const LABEL_CLASS =
  "text-[11px] font-bold uppercase tracking-wider text-muted-foreground";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ActionState } from "@/lib/validations/auth";

interface EventFormProps {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  defaultValues?: {
    eventId?: string;
    name?: string;
    description?: string;
    eventStartDate?: string;
    eventEndDate?: string;
    applicationOpenDate?: string;
    applicationCloseDate?: string;
    venueName?: string;
    venueAddress?: string;
    venueCity?: string;
    venueCountry?: string;
    mapEmbedUrl?: string;
    availableStands?: number | null;
    tableDimensions?: string;
    priceInfo?: string;
    setupTime?: string;
    teardownTime?: string;
    amenities_electricity?: boolean;
    amenities_wifi?: boolean;
    amenities_tables?: boolean;
    amenities_chairs?: boolean;
    amenities_other?: string;
  };
  submitLabel: string;
}

function FieldError({
  state,
  field,
}: {
  state: ActionState;
  field: string;
}) {
  const errors = state.fieldErrors?.[field];
  if (!errors) return null;
  return (
    <p id={`${field}-error`} role="alert" className="text-sm text-destructive">
      {errors[0]}
    </p>
  );
}

export function EventForm({ action, defaultValues, submitLabel }: EventFormProps) {
  const [state, formAction, pending] = useActionState(action, {});
  const dv = defaultValues ?? {};

  return (
    <form
      action={formAction}
      className="space-y-6"
      key={JSON.stringify(defaultValues)}
    >
      {dv.eventId && (
        <input type="hidden" name="eventId" value={dv.eventId} />
      )}

      {!pending && state.error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive" role="alert">
          {state.error}
        </div>
      )}
      {!pending && state.success && (
        <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-700" role="status">
          Event saved successfully.
        </div>
      )}

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className={LABEL_CLASS}>Event Name *</Label>
            <Input
              id="name"
              name="name"
              defaultValue={dv.name ?? ""}
              aria-describedby={state.fieldErrors?.name ? "name-error" : undefined}
              aria-invalid={!!state.fieldErrors?.name}
            />
            <FieldError state={state} field="name" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className={LABEL_CLASS}>Description</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={dv.description ?? ""}
              rows={4}
            />
            <FieldError state={state} field="description" />
          </div>
        </CardContent>
      </Card>

      {/* Dates */}
      <Card>
        <CardHeader>
          <CardTitle>Dates</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="eventStartDate" className={LABEL_CLASS}>Event Start Date *</Label>
            <Input
              id="eventStartDate"
              name="eventStartDate"
              type="date"
              defaultValue={dv.eventStartDate ?? ""}
              aria-describedby={
                state.fieldErrors?.eventStartDate
                  ? "eventStartDate-error"
                  : undefined
              }
              aria-invalid={!!state.fieldErrors?.eventStartDate}
            />
            <FieldError state={state} field="eventStartDate" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="eventEndDate" className={LABEL_CLASS}>Event End Date</Label>
            <Input
              id="eventEndDate"
              name="eventEndDate"
              type="date"
              defaultValue={dv.eventEndDate ?? ""}
            />
            <FieldError state={state} field="eventEndDate" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="applicationOpenDate" className={LABEL_CLASS}>Application Open Date</Label>
            <Input
              id="applicationOpenDate"
              name="applicationOpenDate"
              type="date"
              defaultValue={dv.applicationOpenDate ?? ""}
            />
            <FieldError state={state} field="applicationOpenDate" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="applicationCloseDate" className={LABEL_CLASS}>Application Close Date</Label>
            <Input
              id="applicationCloseDate"
              name="applicationCloseDate"
              type="date"
              defaultValue={dv.applicationCloseDate ?? ""}
            />
            <FieldError state={state} field="applicationCloseDate" />
          </div>
        </CardContent>
      </Card>

      {/* Location */}
      <Card>
        <CardHeader>
          <CardTitle>Location</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="venueName" className={LABEL_CLASS}>Venue Name</Label>
              <Input
                id="venueName"
                name="venueName"
                defaultValue={dv.venueName ?? ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="venueCity" className={LABEL_CLASS}>City</Label>
              <Input
                id="venueCity"
                name="venueCity"
                defaultValue={dv.venueCity ?? ""}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="venueAddress" className={LABEL_CLASS}>Address</Label>
            <Input
              id="venueAddress"
              name="venueAddress"
              defaultValue={dv.venueAddress ?? ""}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="venueCountry" className={LABEL_CLASS}>Country</Label>
              <Input
                id="venueCountry"
                name="venueCountry"
                defaultValue={dv.venueCountry ?? ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mapEmbedUrl" className={LABEL_CLASS}>Map Embed URL</Label>
              <Input
                id="mapEmbedUrl"
                name="mapEmbedUrl"
                type="url"
                placeholder="https://..."
                defaultValue={dv.mapEmbedUrl ?? ""}
              />
              <FieldError state={state} field="mapEmbedUrl" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logistics */}
      <Card>
        <CardHeader>
          <CardTitle>Artist Logistics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="availableStands" className={LABEL_CLASS}>Available Stands</Label>
              <Input
                id="availableStands"
                name="availableStands"
                type="number"
                min={1}
                defaultValue={dv.availableStands ?? ""}
              />
              <FieldError state={state} field="availableStands" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tableDimensions" className={LABEL_CLASS}>Table Dimensions</Label>
              <Input
                id="tableDimensions"
                name="tableDimensions"
                placeholder="e.g., 2m x 1m"
                defaultValue={dv.tableDimensions ?? ""}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="priceInfo" className={LABEL_CLASS}>Price Info</Label>
            <Textarea
              id="priceInfo"
              name="priceInfo"
              placeholder="e.g., $50 per table"
              defaultValue={dv.priceInfo ?? ""}
              rows={2}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="setupTime" className={LABEL_CLASS}>Setup Time</Label>
              <Input
                id="setupTime"
                name="setupTime"
                placeholder="e.g., 8:00 AM - 10:00 AM"
                defaultValue={dv.setupTime ?? ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="teardownTime" className={LABEL_CLASS}>Teardown Time</Label>
              <Input
                id="teardownTime"
                name="teardownTime"
                placeholder="e.g., 6:00 PM - 8:00 PM"
                defaultValue={dv.teardownTime ?? ""}
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label>Provided Amenities</Label>
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["amenities_electricity", "Electricity"],
                  ["amenities_wifi", "Wi-Fi"],
                  ["amenities_tables", "Tables"],
                  ["amenities_chairs", "Chairs"],
                ] as const
              ).map(([name, label]) => (
                <div key={name} className="flex items-center gap-2">
                  <Checkbox
                    id={name}
                    name={name}
                    value="on"
                    defaultChecked={dv[name] ?? false}
                  />
                  <Label htmlFor={name} className="font-normal">
                    {label}
                  </Label>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="amenities_other" className={LABEL_CLASS}>Other amenities</Label>
              <Input
                id="amenities_other"
                name="amenities_other"
                placeholder="e.g., Display racks, lighting"
                defaultValue={dv.amenities_other ?? ""}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}
