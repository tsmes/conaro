"use client";

import { useActionState, useState } from "react";
import { updateResponseTemplates } from "@/app/(authenticated)/conventions/manage/events/[eventId]/applications/actions";
import { Button } from "@/components/ui/button";
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

interface OtherEvent {
  id: string;
  name: string;
  acceptanceMessage: string | null;
  rejectionMessage: string | null;
}

interface ResponseTemplatesFormProps {
  eventId: string;
  acceptanceMessage: string;
  rejectionMessage: string;
  otherEvents: OtherEvent[];
  readOnly: boolean;
}

export function ResponseTemplatesForm({
  eventId,
  acceptanceMessage: initialAcceptance,
  rejectionMessage: initialRejection,
  otherEvents,
  readOnly,
}: ResponseTemplatesFormProps) {
  const [state, formAction, pending] = useActionState(
    updateResponseTemplates,
    {}
  );

  const [acceptance, setAcceptance] = useState(initialAcceptance);
  const [rejection, setRejection] = useState(initialRejection);

  function handleCopyFrom(sourceEventId: string) {
    const source = otherEvents.find((e) => e.id === sourceEventId);
    if (!source) return;
    setAcceptance(source.acceptanceMessage ?? "");
    setRejection(source.rejectionMessage ?? "");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Response Templates</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
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
              Templates saved.
            </div>
          )}

          {otherEvents.length > 0 && !readOnly && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Copy from:</span>
              <select
                className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
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
          )}

          <div className="space-y-2">
            <Label htmlFor="acceptanceMessage" className={LABEL_CLASS}>Acceptance Message</Label>
            <Textarea
              id="acceptanceMessage"
              name="acceptanceMessage"
              value={acceptance}
              onChange={(e) => setAcceptance(e.target.value)}
              rows={4}
              placeholder="Message sent to accepted artists..."
              disabled={readOnly}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rejectionMessage" className={LABEL_CLASS}>Rejection Message</Label>
            <Textarea
              id="rejectionMessage"
              name="rejectionMessage"
              value={rejection}
              onChange={(e) => setRejection(e.target.value)}
              rows={4}
              placeholder="Message sent to rejected artists..."
              disabled={readOnly}
            />
          </div>

          {!readOnly && (
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Saving..." : "Save Templates"}
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
