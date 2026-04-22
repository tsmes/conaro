"use client";

import { useActionState } from "react";
import { updateBasicInfo } from "@/app/(authenticated)/dashboard/profile/actions";
import { Button } from "@/components/ui/button";
import { ChipSelect } from "@/components/ui/chip-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GENRES, MEDIUMS } from "@/lib/artist-profile/tags";
import type { SocialLink } from "@/lib/artist-profile/social-links";
import { SocialLinksEditor } from "./social-links-editor";

const LABEL_CLASS =
  "text-[11px] font-bold uppercase tracking-wider text-muted-foreground";
import { Textarea } from "@/components/ui/textarea";

interface BasicInfoFormProps {
  defaultValues: {
    displayName: string;
    realName: string;
    pronouns: string;
    contactEmail: string;
    phone: string;
    bio: string;
    websiteUrl: string;
    socialLinks: SocialLink[];
    genres: string[];
    mediums: string[];
    priceRangeMinNok: number | null;
    priceRangeMaxNok: number | null;
  };
}

export function BasicInfoForm({ defaultValues }: BasicInfoFormProps) {
  const [state, formAction, pending] = useActionState(updateBasicInfo, {});

  // Key forces remount after save so defaultValues are picked up cleanly
  // (avoids Base UI FieldControl warning about changing defaultValue)
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
          Profile updated successfully
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="displayName" className={LABEL_CLASS}>Display name *</Label>
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
          <Label htmlFor="realName" className={LABEL_CLASS}>Real name</Label>
          <Input
            id="realName"
            name="realName"
            defaultValue={defaultValues.realName}
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="pronouns" className={LABEL_CLASS}>
            Pronouns
          </Label>
          <Input
            id="pronouns"
            name="pronouns"
            defaultValue={defaultValues.pronouns}
            placeholder="e.g. she/her, they/them"
            aria-describedby={
              state.fieldErrors?.pronouns ? "pronouns-error" : undefined
            }
            aria-invalid={!!state.fieldErrors?.pronouns}
          />
          {state.fieldErrors?.pronouns && (
            <p
              id="pronouns-error"
              role="alert"
              className="text-sm text-destructive"
            >
              {state.fieldErrors.pronouns[0]}
            </p>
          )}
        </div>
        <div />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="contactEmail" className={LABEL_CLASS}>Contact email *</Label>
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
          <Label htmlFor="phone" className={LABEL_CLASS}>Phone number</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={defaultValues.phone}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="bio" className={LABEL_CLASS}>Bio / description</Label>
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
          <Label htmlFor="websiteUrl" className={LABEL_CLASS}>Website</Label>
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
      </div>
      <div className="space-y-2">
        <span className={LABEL_CLASS}>Social links</span>
        <p className="text-sm text-muted-foreground">
          Pick a platform for each link so organizers can render them cleanly.
        </p>
        <SocialLinksEditor
          name="socialLinks"
          defaultValues={defaultValues.socialLinks}
        />
      </div>
      <div className="space-y-2">
        <span className={LABEL_CLASS}>Typical price range (NOK)</span>
        <p className="text-sm text-muted-foreground">
          Rough low and high prices of what you sell. Helps organizers plan
          a varied marketplace.
        </p>
        <div className="flex items-center gap-2">
          <Input
            id="priceRangeMinNok"
            name="priceRangeMinNok"
            type="number"
            min={0}
            placeholder="Min"
            defaultValue={defaultValues.priceRangeMinNok ?? ""}
            className="w-32"
            aria-describedby={
              state.fieldErrors?.priceRangeMinNok
                ? "priceRangeMinNok-error"
                : undefined
            }
            aria-invalid={!!state.fieldErrors?.priceRangeMinNok}
          />
          <span className="text-sm text-muted-foreground">to</span>
          <Input
            id="priceRangeMaxNok"
            name="priceRangeMaxNok"
            type="number"
            min={0}
            placeholder="Max"
            defaultValue={defaultValues.priceRangeMaxNok ?? ""}
            className="w-32"
            aria-describedby={
              state.fieldErrors?.priceRangeMaxNok
                ? "priceRangeMaxNok-error"
                : undefined
            }
            aria-invalid={!!state.fieldErrors?.priceRangeMaxNok}
          />
        </div>
        {state.fieldErrors?.priceRangeMinNok && (
          <p
            id="priceRangeMinNok-error"
            role="alert"
            className="text-sm text-destructive"
          >
            {state.fieldErrors.priceRangeMinNok[0]}
          </p>
        )}
        {state.fieldErrors?.priceRangeMaxNok && (
          <p
            id="priceRangeMaxNok-error"
            role="alert"
            className="text-sm text-destructive"
          >
            {state.fieldErrors.priceRangeMaxNok[0]}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <span className={LABEL_CLASS}>Genres</span>
        <p className="text-sm text-muted-foreground">
          Pick the genres your work lives in. Helps organizers filter their pool.
        </p>
        <ChipSelect
          name="genres"
          options={GENRES}
          defaultValues={defaultValues.genres}
          allowCustom
          addLabel="Add your own genre…"
          max={25}
          aria-label="Genres"
        />
      </div>
      <div className="space-y-2">
        <span className={LABEL_CLASS}>Mediums</span>
        <p className="text-sm text-muted-foreground">
          What you make with. Select all that apply, or add your own.
        </p>
        <ChipSelect
          name="mediums"
          options={MEDIUMS}
          defaultValues={defaultValues.mediums}
          allowCustom
          addLabel="Add your own medium…"
          max={25}
          aria-label="Mediums"
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save basic info"}
      </Button>
    </form>
  );
}
