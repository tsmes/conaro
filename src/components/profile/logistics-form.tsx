"use client";

import { useActionState } from "react";
import { updateLogistics } from "@/app/(authenticated)/dashboard/profile/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const LABEL_CLASS =
  "text-[11px] font-bold uppercase tracking-wider text-muted-foreground";
import { Textarea } from "@/components/ui/textarea";

interface LogisticsFormProps {
  defaultValues: {
    helpers: number;
    accessibilityNeeds: string;
    notes: string;
  };
}

export function LogisticsForm({ defaultValues }: LogisticsFormProps) {
  const [state, formAction, pending] = useActionState(updateLogistics, {});

  const formKey = JSON.stringify(defaultValues);

  return (
    <form key={formKey} action={formAction} className="space-y-4">
      {!pending && state.error && (
        <p
          role="alert"
          className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {state.error}
        </p>
      )}
      {!pending && state.success && (
        <p
          role="status"
          className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-300"
        >
          Logistics updated successfully
        </p>
      )}
      <div className="space-y-2">
        <Label htmlFor="helpers" className={LABEL_CLASS}>Number of helpers</Label>
        <Input
          id="helpers"
          name="helpers"
          type="number"
          min={0}
          max={5}
          defaultValue={defaultValues.helpers}
          aria-describedby={
            state.fieldErrors?.helpers ? "helpers-error" : undefined
          }
          aria-invalid={!!state.fieldErrors?.helpers}
          className="max-w-[180px]"
        />
        {state.fieldErrors?.helpers && (
          <p id="helpers-error" role="alert" className="text-sm text-destructive">
            {state.fieldErrors.helpers[0]}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="accessibilityNeeds" className={LABEL_CLASS}>Accessibility needs</Label>
        <Textarea
          id="accessibilityNeeds"
          name="accessibilityNeeds"
          rows={3}
          defaultValue={defaultValues.accessibilityNeeds}
          placeholder="Any accessibility requirements..."
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes" className={LABEL_CLASS}>Additional notes</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={defaultValues.notes}
          placeholder="Anything else conventions should know..."
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save logistics"}
      </Button>
    </form>
  );
}
