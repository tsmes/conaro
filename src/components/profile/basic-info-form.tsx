"use client";

import { useActionState } from "react";
import { updateBasicInfo } from "@/app/dashboard/profile/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface BasicInfoFormProps {
  defaultValues: {
    displayName: string;
    realName: string;
    contactEmail: string;
    phone: string;
    bio: string;
    websiteUrl: string;
    socialLinks: string;
  };
}

export function BasicInfoForm({ defaultValues }: BasicInfoFormProps) {
  const [state, formAction, pending] = useActionState(updateBasicInfo, {});

  return (
    <form action={formAction} className="space-y-4">
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
          Profile updated successfully
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="displayName">Display name *</Label>
          <Input
            id="displayName"
            name="displayName"
            defaultValue={defaultValues.displayName}
            required
            aria-describedby={
              state.fieldErrors?.displayName ? "displayName-error" : undefined
            }
            aria-invalid={!!state.fieldErrors?.displayName}
          />
          {state.fieldErrors?.displayName && (
            <p id="displayName-error" role="alert" className="text-sm text-destructive">
              {state.fieldErrors.displayName[0]}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="realName">Real name</Label>
          <Input
            id="realName"
            name="realName"
            defaultValue={defaultValues.realName}
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="contactEmail">Contact email *</Label>
          <Input
            id="contactEmail"
            name="contactEmail"
            type="email"
            defaultValue={defaultValues.contactEmail}
            required
            aria-describedby={
              state.fieldErrors?.contactEmail ? "contactEmail-error" : undefined
            }
            aria-invalid={!!state.fieldErrors?.contactEmail}
          />
          {state.fieldErrors?.contactEmail && (
            <p id="contactEmail-error" role="alert" className="text-sm text-destructive">
              {state.fieldErrors.contactEmail[0]}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone number</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={defaultValues.phone}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="bio">Bio / description</Label>
        <Textarea
          id="bio"
          name="bio"
          rows={4}
          defaultValue={defaultValues.bio}
          placeholder="Tell conventions about yourself and your work..."
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="websiteUrl">Website</Label>
          <Input
            id="websiteUrl"
            name="websiteUrl"
            type="url"
            defaultValue={defaultValues.websiteUrl}
            placeholder="https://..."
            aria-describedby={
              state.fieldErrors?.websiteUrl ? "websiteUrl-error" : undefined
            }
            aria-invalid={!!state.fieldErrors?.websiteUrl}
          />
          {state.fieldErrors?.websiteUrl && (
            <p id="websiteUrl-error" role="alert" className="text-sm text-destructive">
              {state.fieldErrors.websiteUrl[0]}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="socialLinks">Social links</Label>
          <Input
            id="socialLinks"
            name="socialLinks"
            defaultValue={defaultValues.socialLinks}
            placeholder="Instagram, Twitter, etc."
          />
        </div>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save basic info"}
      </Button>
    </form>
  );
}
