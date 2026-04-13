"use client";

import { useActionState } from "react";
import { updateConventionProfile } from "@/app/(authenticated)/conventions/manage/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const LABEL_CLASS =
  "text-[11px] font-bold uppercase tracking-wider text-muted-foreground";
import { Textarea } from "@/components/ui/textarea";

interface ConventionProfileFormProps {
  defaultValues: {
    name: string;
    description: string;
    websiteUrl: string;
  };
}

export function ConventionProfileForm({
  defaultValues,
}: ConventionProfileFormProps) {
  const [state, formAction, pending] = useActionState(
    updateConventionProfile,
    {}
  );

  return (
    <form
      action={formAction}
      className="space-y-4"
      key={JSON.stringify(defaultValues)}
    >
      {!pending && state.error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive" role="alert">
          {state.error}
        </div>
      )}
      {!pending && state.success && (
        <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-700" role="status">
          Convention profile updated successfully.
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name" className={LABEL_CLASS}>Convention Name</Label>
        <Input
          id="name"
          name="name"
          defaultValue={defaultValues.name}
          aria-describedby={state.fieldErrors?.name ? "name-error" : undefined}
          aria-invalid={!!state.fieldErrors?.name}
        />
        {state.fieldErrors?.name && (
          <p id="name-error" role="alert" className="text-sm text-destructive">
            {state.fieldErrors.name[0]}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className={LABEL_CLASS}>Description</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={defaultValues.description}
          rows={4}
          aria-describedby={
            state.fieldErrors?.description ? "description-error" : undefined
          }
          aria-invalid={!!state.fieldErrors?.description}
        />
        {state.fieldErrors?.description && (
          <p
            id="description-error"
            role="alert"
            className="text-sm text-destructive"
          >
            {state.fieldErrors.description[0]}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="websiteUrl" className={LABEL_CLASS}>Website URL</Label>
        <Input
          id="websiteUrl"
          name="websiteUrl"
          type="url"
          placeholder="https://..."
          defaultValue={defaultValues.websiteUrl}
          aria-describedby={
            state.fieldErrors?.websiteUrl ? "websiteUrl-error" : undefined
          }
          aria-invalid={!!state.fieldErrors?.websiteUrl}
        />
        {state.fieldErrors?.websiteUrl && (
          <p
            id="websiteUrl-error"
            role="alert"
            className="text-sm text-destructive"
          >
            {state.fieldErrors.websiteUrl[0]}
          </p>
        )}
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}
