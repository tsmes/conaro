"use client";

import { useActionState } from "react";
import { updateConventionProfile } from "@/app/(authenticated)/conventions/manage/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TemplateTokenReference } from "./template-token-reference";

const LABEL_CLASS =
  "text-[11px] font-bold uppercase tracking-wider text-muted-foreground";
import { RichTextEditor } from "@/components/ui/rich-text-editor";

interface ConventionProfileFormProps {
  defaultValues: {
    name: string;
    description: string;
    websiteUrl: string;
    guidelines: string;
    acceptanceMessage: string;
    rejectionMessage: string;
    waitlistEnabled: boolean;
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
        <RichTextEditor
          id="description"
          name="description"
          defaultValue={defaultValues.description}
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

      <div className="space-y-2">
        <Label htmlFor="guidelines" className={LABEL_CLASS}>
          Guidelines
        </Label>
        <RichTextEditor
          id="guidelines"
          name="guidelines"
          defaultValue={defaultValues.guidelines}
          placeholder="Convention-wide guidelines artists must read and acknowledge before applying. Each event can override this text."
          aria-describedby={
            state.fieldErrors?.guidelines ? "guidelines-error" : undefined
          }
          aria-invalid={!!state.fieldErrors?.guidelines}
        />
        <p className="text-xs text-muted-foreground">
          Shown on every application form unless an event overrides it.
        </p>
        {state.fieldErrors?.guidelines && (
          <p
            id="guidelines-error"
            role="alert"
            className="text-sm text-destructive"
          >
            {state.fieldErrors.guidelines[0]}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="acceptanceMessage" className={LABEL_CLASS}>
          Default acceptance message
        </Label>
        <RichTextEditor
          id="acceptanceMessage"
          name="acceptanceMessage"
          defaultValue={defaultValues.acceptanceMessage}
          placeholder="The default message each event sends to accepted artists when results are published. Events can override this."
        />
        <p className="text-xs text-muted-foreground">
          Used for every event unless the event sets its own.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="rejectionMessage" className={LABEL_CLASS}>
          Default rejection message
        </Label>
        <RichTextEditor
          id="rejectionMessage"
          name="rejectionMessage"
          defaultValue={defaultValues.rejectionMessage}
          placeholder="Default message sent to rejected artists. Events can override this."
        />
      </div>

      <TemplateTokenReference />
      <p className="text-xs text-muted-foreground">
        These placeholders work in either message. They're substituted with
        each applicant's details when results are published.
      </p>

      <div className="flex items-start gap-3 rounded-md border border-border p-3">
        <Checkbox
          id="waitlistEnabled"
          name="waitlistEnabled"
          value="on"
          defaultChecked={defaultValues.waitlistEnabled}
        />
        <div className="space-y-1">
          <Label htmlFor="waitlistEnabled">Enable waitlist</Label>
          <p className="text-xs text-muted-foreground">
            When on, rejected artists can opt in to a waitlist after
            results are published, and you can promote them to accepted
            from the selection workspace.
          </p>
        </div>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}
