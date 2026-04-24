"use client";

import { useActionState, useMemo, useState } from "react";
import {
  applyToEvent,
  type ApplyResult,
} from "@/app/(public)/events/[eventId]/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Markdown } from "@/components/ui/markdown";
import type {
  FieldRequirements,
  TableSizeOption,
} from "@/lib/db/schema/events";

const LABEL_CLASS =
  "text-[11px] font-bold uppercase tracking-wider text-muted-foreground";

export interface ApplicationFormProps {
  eventId: string;
  guidelines: string | null;
  fieldRequirements: FieldRequirements | null;
  tableSizeOptions: TableSizeOption[];
  maxAssistants: number;
  assistantFeeNok: number | null;
}

function isPresented(reqs: FieldRequirements | null, key: string): boolean {
  return reqs?.[key] === "required" || reqs?.[key] === "optional";
}
function isRequired(reqs: FieldRequirements | null, key: string): boolean {
  return reqs?.[key] === "required";
}

export function ApplicationForm({
  eventId,
  guidelines,
  fieldRequirements,
  tableSizeOptions,
  maxAssistants,
  assistantFeeNok,
}: ApplicationFormProps) {
  const [state, formAction, pending] = useActionState<ApplyResult, FormData>(
    applyToEvent,
    {}
  );

  const [acknowledged, setAcknowledged] = useState(false);
  const [tableSizeId, setTableSizeId] = useState<string>("");
  const [assistantCount, setAssistantCount] = useState(0);
  const [assistantNames, setAssistantNames] = useState<string[]>([]);
  const [sharing, setSharing] = useState<"" | "yes" | "no">("");
  const [sharingWith, setSharingWith] = useState("");
  const [placement, setPlacement] = useState("");
  const [comments, setComments] = useState("");
  const [promoConsent, setPromoConsent] = useState<boolean>(true);

  const showTableSize =
    isPresented(fieldRequirements, "tableSize") && tableSizeOptions.length > 0;
  const showAssistants =
    isPresented(fieldRequirements, "assistants") && maxAssistants > 0;
  const showSharing = isPresented(fieldRequirements, "sharingStand");
  const showPlacement = isPresented(fieldRequirements, "placementPreference");
  const showComments = isPresented(fieldRequirements, "additionalComments");
  const showPromoConsent = isPresented(fieldRequirements, "promotionConsent");

  const adjustNames = (newCount: number) => {
    setAssistantCount(newCount);
    setAssistantNames((prev) => {
      const next = [...prev];
      while (next.length < newCount) next.push("");
      next.length = newCount;
      return next;
    });
  };

  const submitDisabled = useMemo(() => {
    if (pending) return true;
    if (!acknowledged) return true;
    if (showTableSize && isRequired(fieldRequirements, "tableSize") && !tableSizeId)
      return true;
    if (showAssistants && isRequired(fieldRequirements, "assistants")) {
      // 'required' for assistants means they must opt in (count >=1) AND name them
      if (assistantCount === 0) return true;
      if (assistantNames.some((n) => !n.trim())) return true;
    } else if (
      showAssistants &&
      assistantCount > 0 &&
      assistantNames.some((n) => !n.trim())
    ) {
      return true;
    }
    if (showSharing && isRequired(fieldRequirements, "sharingStand") && !sharing)
      return true;
    if (
      showPlacement &&
      isRequired(fieldRequirements, "placementPreference") &&
      !placement.trim()
    )
      return true;
    if (
      showComments &&
      isRequired(fieldRequirements, "additionalComments") &&
      !comments.trim()
    )
      return true;
    return false;
  }, [
    pending,
    acknowledged,
    showTableSize,
    showAssistants,
    showSharing,
    showPlacement,
    showComments,
    fieldRequirements,
    tableSizeId,
    assistantCount,
    assistantNames,
    sharing,
    placement,
    comments,
  ]);

  if (state.success) {
    return (
      <div className="rounded-md bg-success-container p-4 text-center text-on-success-container">
        <Badge variant="success" className="text-sm">
          Application submitted!
        </Badge>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="eventId" value={eventId} />
      {/* Hidden form fields carrying the structured answers */}
      <input
        type="hidden"
        name="answers"
        value={JSON.stringify({
          tableSizeOptionId: showTableSize ? tableSizeId || undefined : undefined,
          assistants: showAssistants
            ? { count: assistantCount, names: assistantNames }
            : undefined,
          sharingStand: showSharing
            ? sharing
              ? { sharing: sharing === "yes", with: sharingWith.trim() || undefined }
              : undefined
            : undefined,
          placementPreference: showPlacement
            ? placement.trim() || undefined
            : undefined,
          additionalComments: showComments
            ? comments.trim() || undefined
            : undefined,
          promotionConsent: showPromoConsent ? promoConsent : undefined,
        })}
      />
      <input
        type="hidden"
        name="guidelinesAcknowledged"
        value={acknowledged ? "true" : "false"}
      />

      {state.error && state.error !== "missing_fields" && (
        <div
          role="alert"
          className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
        >
          {state.error}
        </div>
      )}

      {guidelines && (
        <section className="space-y-3 rounded-md bg-muted p-4">
          <h3 className="font-heading text-base font-bold">Guidelines</h3>
          <Markdown source={guidelines} className="text-muted-foreground" />
        </section>
      )}

      <div className="flex items-start gap-3 rounded-md border border-border p-3">
        <Checkbox
          id="ack"
          checked={acknowledged}
          onCheckedChange={(v) => setAcknowledged(v === true)}
        />
        <Label htmlFor="ack" className="text-sm font-normal leading-snug">
          I have read and understood the guidelines. It is my responsibility
          to ensure that the stand and any products sold at it follow the
          guidelines.
        </Label>
      </div>

      {showTableSize && (
        <fieldset className="space-y-2">
          <legend className={LABEL_CLASS}>
            Table size
            {isRequired(fieldRequirements, "tableSize") && " *"}
          </legend>
          <div className="space-y-2">
            {tableSizeOptions.map((opt) => (
              <label
                key={opt.id}
                className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 ${
                  tableSizeId === opt.id
                    ? "border-primary bg-primary/5"
                    : "border-border"
                }`}
              >
                <input
                  type="radio"
                  name="tableSize_radio"
                  value={opt.id}
                  checked={tableSizeId === opt.id}
                  onChange={() => setTableSizeId(opt.id)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-semibold">{opt.label}</div>
                  {opt.widthCm && opt.depthCm && (
                    <div className="text-xs text-muted-foreground">
                      {opt.widthCm} × {opt.depthCm} cm
                    </div>
                  )}
                </div>
                {opt.priceNok !== null && opt.priceNok !== undefined && (
                  <div className="font-mono text-sm font-semibold">
                    {opt.priceNok} NOK
                  </div>
                )}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {showAssistants && (
        <div className="space-y-3">
          <Label htmlFor="assistantCount" className={LABEL_CLASS}>
            Assistants
            {isRequired(fieldRequirements, "assistants") && " *"}
          </Label>
          <div className="flex items-center gap-3">
            <Input
              id="assistantCount"
              type="number"
              min={0}
              max={maxAssistants}
              value={assistantCount}
              onChange={(e) => adjustNames(Number(e.target.value || 0))}
              className="w-24"
            />
            <span className="text-xs text-muted-foreground">
              up to {maxAssistants}
              {assistantFeeNok !== null && assistantCount > 0 && (
                <>
                  {" · adds "}
                  <span className="font-mono">
                    {assistantFeeNok * assistantCount} NOK
                  </span>
                </>
              )}
            </span>
          </div>
          {assistantNames.map((name, i) => (
            <Input
              key={i}
              placeholder={`Assistant ${i + 1} name`}
              value={name}
              onChange={(e) =>
                setAssistantNames((prev) =>
                  prev.map((n, idx) => (idx === i ? e.target.value : n))
                )
              }
            />
          ))}
        </div>
      )}

      {showSharing && (
        <fieldset className="space-y-2">
          <legend className={LABEL_CLASS}>
            Sharing the stand with another artist?
            {isRequired(fieldRequirements, "sharingStand") && " *"}
          </legend>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="sharing"
                checked={sharing === "no"}
                onChange={() => setSharing("no")}
              />
              No
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="sharing"
                checked={sharing === "yes"}
                onChange={() => setSharing("yes")}
              />
              Yes
            </label>
          </div>
          {sharing === "yes" && (
            <Input
              placeholder="Other artist's name"
              value={sharingWith}
              onChange={(e) => setSharingWith(e.target.value)}
            />
          )}
        </fieldset>
      )}

      {showPlacement && (
        <div className="space-y-2">
          <Label htmlFor="placement" className={LABEL_CLASS}>
            Placement preference
            {isRequired(fieldRequirements, "placementPreference") && " *"}
          </Label>
          <Textarea
            id="placement"
            rows={3}
            value={placement}
            onChange={(e) => setPlacement(e.target.value)}
            placeholder="e.g. I'd like to be placed next to Bizziton Crafts."
          />
        </div>
      )}

      {showComments && (
        <div className="space-y-2">
          <Label htmlFor="comments" className={LABEL_CLASS}>
            Anything else for the organizer?
            {isRequired(fieldRequirements, "additionalComments") && " *"}
          </Label>
          <Textarea
            id="comments"
            rows={3}
            value={comments}
            onChange={(e) => setComments(e.target.value)}
          />
        </div>
      )}

      {showPromoConsent && (
        <div className="flex items-start gap-3 rounded-md border border-border p-3">
          <Checkbox
            id="promo"
            checked={promoConsent}
            onCheckedChange={(v) => setPromoConsent(v === true)}
          />
          <Label htmlFor="promo" className="text-sm font-normal leading-snug">
            You may use my promo images and bio to promote my stand on this
            event&rsquo;s channels.
          </Label>
        </div>
      )}

      <Button type="submit" disabled={submitDisabled} className="w-full">
        {pending ? "Submitting..." : "Submit application"}
      </Button>
    </form>
  );
}
