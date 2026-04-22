import {
  FIELD_REGISTRY,
  type FieldDefinition,
  type FieldSection,
} from "@/lib/db/field-registry";
import type { FieldRequirements } from "@/lib/db/schema/events";

export interface MissingField {
  key: string;
  label: string;
  section: FieldSection;
}

export type ValidationResult =
  | { valid: true }
  | { valid: false; missingFields: MissingField[] };

interface ProfileData {
  displayName: string;
}

interface ArtistProfileData {
  realName: string | null;
  pronouns: string | null;
  contactEmail: string | null;
  phone: string | null;
  bio: string | null;
  websiteUrl: string | null;
  socialLinks: string | null;
  helpers: number | null;
  accessibilityNeeds: string | null;
  notes: string | null;
  priceRangeMinNok: number | null;
  priceRangeMaxNok: number | null;
  genres?: string[] | null;
  mediums?: string[] | null;
}

function isFieldFilled(
  field: FieldDefinition,
  profile: ProfileData,
  artistProfile: ArtistProfileData,
  imageCount: number
): boolean {
  if (field.key === "displayName") {
    return !!profile.displayName;
  }

  if (field.key === "portfolioImages") {
    return imageCount > 0;
  }

  // Multi-column / array fields need per-key checks rather than reading
  // a single column by name.
  if (field.key === "priceRange") {
    return (
      artistProfile.priceRangeMinNok !== null &&
      artistProfile.priceRangeMinNok !== undefined &&
      artistProfile.priceRangeMaxNok !== null &&
      artistProfile.priceRangeMaxNok !== undefined
    );
  }
  if (field.key === "genres") {
    return (artistProfile.genres?.length ?? 0) > 0;
  }
  if (field.key === "mediums") {
    return (artistProfile.mediums?.length ?? 0) > 0;
  }

  // Guard against field keys not present on the artist profile interface
  if (!(field.key in artistProfile)) {
    return true;
  }

  const value = artistProfile[field.key as keyof ArtistProfileData];

  if (field.type === "number") {
    return value !== null && value !== undefined;
  }

  return !!value;
}

export function validateProfileForEvent(
  fieldRequirements: FieldRequirements | null,
  minPortfolioImages: number | null,
  profile: ProfileData,
  artistProfile: ArtistProfileData,
  imageCount: number
): ValidationResult {
  if (!fieldRequirements) {
    return { valid: true };
  }

  const missingFields: MissingField[] = [];

  for (const field of FIELD_REGISTRY) {
    // This validator only checks profile-source fields. Application-source
    // fields are validated by applicationAnswersSchema in the apply action.
    if (field.source !== "profile") continue;
    const requirement = fieldRequirements[field.key];
    if (requirement !== "required") continue;

    if (field.key === "portfolioImages") {
      const minRequired = Math.max(minPortfolioImages ?? 1, 1);
      if (imageCount < minRequired) {
        missingFields.push({
          key: field.key,
          label:
            minRequired > 1
              ? `${field.label} (at least ${minRequired})`
              : field.label,
          section: field.section,
        });
      }
      continue;
    }

    if (!isFieldFilled(field, profile, artistProfile, imageCount)) {
      missingFields.push({
        key: field.key,
        label: field.label,
        section: field.section,
      });
    }
  }

  if (missingFields.length === 0) {
    return { valid: true };
  }

  return { valid: false, missingFields };
}
