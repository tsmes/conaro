"use client";

import { useActionState } from "react";
import { updateNotificationPreferences } from "@/app/settings/notifications/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface PreferenceType {
  type: string;
  label: string;
  description: string;
  emailEnabled: boolean;
}

interface NotificationPreferencesFormProps {
  types: PreferenceType[];
}

export function NotificationPreferencesForm({
  types,
}: NotificationPreferencesFormProps) {
  const [state, formAction, pending] = useActionState(
    updateNotificationPreferences,
    {}
  );

  return (
    <form action={formAction} className="space-y-4">
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
          Preferences saved.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Email Notifications</CardTitle>
          <CardDescription>
            In-app notifications are always enabled. Toggle which notifications
            also send you an email.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {types.map((pref) => (
            <div key={pref.type} className="flex items-start gap-3">
              <Checkbox
                id={`email_${pref.type}`}
                name={`email_${pref.type}`}
                value="on"
                defaultChecked={pref.emailEnabled}
              />
              <div className="space-y-1">
                <Label
                  htmlFor={`email_${pref.type}`}
                  className="font-medium"
                >
                  {pref.label}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {pref.description}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save Preferences"}
      </Button>
    </form>
  );
}
