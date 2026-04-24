"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const LABEL_CLASS =
  "text-[11px] font-bold uppercase tracking-wider text-muted-foreground";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { markdownToText } from "@/lib/utils/markdown-to-text";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ActionState } from "@/lib/validations/auth";
import type { TableSizeOption } from "@/lib/db/schema/events";
import { TemplateTokenReference } from "./template-token-reference";
import {
  buildTemplateContext,
  TEMPLATE_TOKENS,
} from "@/lib/messaging/template";

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
    guidelinesOverride?: string;
    tableSizeOptions?: TableSizeOption[];
    maxAssistants?: number;
    assistantFeeNok?: number | null;
    acceptanceMessage?: string;
    rejectionMessage?: string;
    // Convention defaults shown as placeholder text so the organizer can
    // see what will be used when the event-level field is left blank.
    conventionAcceptanceMessage?: string | null;
    conventionRejectionMessage?: string | null;
    // Used by the messaging section's live placeholder preview.
    conventionName?: string;
    organizerName?: string;
  };
  submitLabel: string;
}

function TableSizeOptionsEditor({
  initial,
}: {
  initial: TableSizeOption[];
}) {
  const [options, setOptions] = useState<TableSizeOption[]>(initial);

  const add = () =>
    setOptions((prev) => [
      ...prev,
      { id: crypto.randomUUID(), label: "", priceNok: null },
    ]);
  const remove = (id: string) =>
    setOptions((prev) => prev.filter((o) => o.id !== id));
  const update = (id: string, patch: Partial<TableSizeOption>) =>
    setOptions((prev) =>
      prev.map((o) => (o.id === id ? { ...o, ...patch } : o))
    );

  const HEADER_CLASS =
    "text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground";

  return (
    <div className="space-y-3">
      <input
        type="hidden"
        name="tableSizeOptions"
        value={JSON.stringify(options)}
      />
      {options.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No structured options yet. Add one to let artists pick a table size
          and price at apply time.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full border-collapse">
            <thead className="bg-muted/40">
              <tr>
                <th scope="col" className={`${HEADER_CLASS} px-3 py-2`}>
                  Name
                </th>
                <th
                  scope="col"
                  className={`${HEADER_CLASS} w-[120px] px-3 py-2`}
                >
                  Width (cm)
                </th>
                <th
                  scope="col"
                  className={`${HEADER_CLASS} w-[120px] px-3 py-2`}
                >
                  Depth (cm)
                </th>
                <th
                  scope="col"
                  className={`${HEADER_CLASS} w-[120px] px-3 py-2`}
                >
                  Price (NOK)
                </th>
                <th scope="col" className="w-[80px] px-3 py-2">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {options.map((opt, i) => (
                <tr
                  key={opt.id}
                  className={i > 0 ? "border-t border-border" : undefined}
                >
                  <td className="px-3 py-2">
                    <Input
                      aria-label="Name"
                      placeholder="Standard"
                      value={opt.label}
                      onChange={(e) =>
                        update(opt.id, { label: e.target.value })
                      }
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      aria-label="Width (cm)"
                      type="number"
                      min={1}
                      max={1000}
                      value={opt.widthCm ?? ""}
                      onChange={(e) =>
                        update(opt.id, {
                          widthCm:
                            e.target.value === ""
                              ? undefined
                              : Number(e.target.value),
                        })
                      }
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      aria-label="Depth (cm)"
                      type="number"
                      min={1}
                      max={1000}
                      value={opt.depthCm ?? ""}
                      onChange={(e) =>
                        update(opt.id, {
                          depthCm:
                            e.target.value === ""
                              ? undefined
                              : Number(e.target.value),
                        })
                      }
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      aria-label="Price (NOK)"
                      type="number"
                      min={0}
                      value={opt.priceNok ?? ""}
                      onChange={(e) =>
                        update(opt.id, {
                          priceNok:
                            e.target.value === ""
                              ? null
                              : Number(e.target.value),
                        })
                      }
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`Remove ${opt.label || "table size"}`}
                      onClick={() => remove(opt.id)}
                    >
                      Remove
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Button type="button" variant="outline" size="sm" onClick={add}>
        Add table size
      </Button>
    </div>
  );
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
            <RichTextEditor
              id="description"
              name="description"
              defaultValue={dv.description ?? ""}
              aria-invalid={!!state.fieldErrors?.description}
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
              <Label htmlFor="setupTime" className={LABEL_CLASS}>Setup</Label>
              <Input
                id="setupTime"
                name="setupTime"
                placeholder="e.g., Fri 20. Jun 18:00 – 22:00"
                defaultValue={dv.setupTime ?? ""}
              />
              <p className="text-xs text-muted-foreground">
                Include the date so artists know which day to arrive — not
                every event opens on its start date.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="teardownTime" className={LABEL_CLASS}>Teardown</Label>
              <Input
                id="teardownTime"
                name="teardownTime"
                placeholder="e.g., Sun 22. Jun 18:00 – 20:00"
                defaultValue={dv.teardownTime ?? ""}
              />
              <p className="text-xs text-muted-foreground">
                Include the date so artists know which day to tear down.
              </p>
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

      {/* Application offering: structured table sizes, assistants, guidelines */}
      <Card>
        <CardHeader>
          <CardTitle>Application Form</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="guidelinesOverride" className={LABEL_CLASS}>
              Guidelines (event override)
            </Label>
            <RichTextEditor
              id="guidelinesOverride"
              name="guidelinesOverride"
              defaultValue={dv.guidelinesOverride ?? ""}
              placeholder="Leave blank to use the convention's guidelines."
            />
            <p className="text-xs text-muted-foreground">
              Artists must check &ldquo;I have read and understood the
              guidelines&rdquo; before submitting.
            </p>
          </div>

          <div className="space-y-2">
            <Label className={LABEL_CLASS}>Table sizes</Label>
            <p className="text-xs text-muted-foreground">
              Define one or more table sizes the artist can pick from at
              apply time.
            </p>
            <TableSizeOptionsEditor initial={dv.tableSizeOptions ?? []} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="maxAssistants" className={LABEL_CLASS}>
                Max assistants per stand
              </Label>
              <Input
                id="maxAssistants"
                name="maxAssistants"
                type="number"
                min={0}
                max={5}
                defaultValue={dv.maxAssistants ?? 0}
              />
              <p className="text-xs text-muted-foreground">
                0 disables the assistants question on the application form.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="assistantFeeNok" className={LABEL_CLASS}>
                Fee per assistant (NOK)
              </Label>
              <Input
                id="assistantFeeNok"
                name="assistantFeeNok"
                type="number"
                min={0}
                placeholder="e.g., 300"
                defaultValue={dv.assistantFeeNok ?? ""}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Decision messaging: event-level accept/reject templates. Blank =
          inherit the convention default shown in the placeholder. */}
      <Card>
        <CardHeader>
          <CardTitle>Messaging</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="acceptanceMessage" className={LABEL_CLASS}>
              Acceptance message
            </Label>
            <RichTextEditor
              id="acceptanceMessage"
              name="acceptanceMessage"
              defaultValue={dv.acceptanceMessage ?? ""}
              placeholder={
                dv.conventionAcceptanceMessage
                  ? `(uses convention default) \u2014 ${markdownToText(dv.conventionAcceptanceMessage)}`
                  : "Message sent to accepted artists when results are published. Leave blank to use the convention default."
              }
            />
            <p className="text-xs text-muted-foreground">
              {dv.conventionAcceptanceMessage
                ? "Leave blank to use the convention default shown in the placeholder."
                : "No convention-level default set \u2014 leaving this blank will send an empty message."}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="rejectionMessage" className={LABEL_CLASS}>
              Rejection message
            </Label>
            <RichTextEditor
              id="rejectionMessage"
              name="rejectionMessage"
              defaultValue={dv.rejectionMessage ?? ""}
              placeholder={
                dv.conventionRejectionMessage
                  ? `(uses convention default) \u2014 ${markdownToText(dv.conventionRejectionMessage)}`
                  : "Message sent to rejected artists. Leave blank to use the convention default."
              }
            />
          </div>

          <TemplateTokenReference
            preview={(() => {
              const ctx = buildTemplateContext({
                artistDisplayName: "Maya Kleven",
                artistPronouns: "she/her",
                eventName: dv.name ?? "This event",
                eventStartDate: dv.eventStartDate ?? "2026-06-20",
                eventEndDate: dv.eventEndDate || null,
                venueName: dv.venueName ?? null,
                venueCity: dv.venueCity ?? null,
                venueCountry: dv.venueCountry ?? null,
                conventionName: dv.conventionName ?? "Your convention",
                organizerName: dv.organizerName ?? "Organizer",
              });
              return Object.fromEntries(
                TEMPLATE_TOKENS.map((t) => [t.token, t.getValue(ctx)])
              );
            })()}
          />
          <p className="text-xs text-muted-foreground">
            Sample artist values shown for preview; actual substitutions
            use each applicant's profile.
          </p>
        </CardContent>
      </Card>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}
