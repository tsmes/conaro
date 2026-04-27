import { PROFILE_FIELDS } from "@/lib/db/field-registry";
import {
  isFieldFilled,
  type ArtistProfileData,
  type ProfileData,
} from "@/lib/applications/validation";

interface SectionStatus {
  complete: boolean;
  filled: number;
  total: number;
}

export interface CompletenessResult {
  basic: SectionStatus;
  logistics: SectionStatus;
  portfolio: SectionStatus;
  overall: number;
}

// Drive completeness off the same FIELD_REGISTRY + isFieldFilled
// used by the apply-flow validator. Adding a field to the registry
// (and the artist profile UI) automatically updates the dashboard
// indicator — no separate "list of fields to count" to keep in
// sync. The registry-vs-profile invariant is enforced by
// __tests__/unit/lib/field-registry-profile-match.test.ts.
export function computeCompleteness(
  profile: ProfileData | undefined,
  artistProfile: ArtistProfileData | undefined,
  imageCount: number
): CompletenessResult {
  // No profile yet → everything empty. The page should already
  // redirect / scaffold a profile in this case, but guard anyway.
  const safeProfile: ProfileData = profile ?? { displayName: "" };
  const safeArtistProfile: ArtistProfileData = artistProfile ?? {
    realName: null,
    pronouns: null,
    contactEmail: null,
    phone: null,
    bio: null,
    websiteUrl: null,
    socialLinks: null,
    helpers: null,
    accessibilityNeeds: null,
    notes: null,
    priceRangeMinNok: null,
    priceRangeMaxNok: null,
    genres: null,
    mediums: null,
  };

  let basicTotal = 0;
  let basicFilled = 0;
  let basicRequiredAllFilled = true;
  let logisticsTotal = 0;
  let logisticsFilled = 0;
  let portfolioTotal = 0;
  let portfolioFilled = 0;

  for (const field of PROFILE_FIELDS) {
    const filled = isFieldFilled(
      field,
      safeProfile,
      safeArtistProfile,
      imageCount
    );
    if (field.section === "basic") {
      basicTotal += 1;
      if (filled) basicFilled += 1;
      if (field.required && !filled) basicRequiredAllFilled = false;
    } else if (field.section === "logistics") {
      logisticsTotal += 1;
      if (filled) logisticsFilled += 1;
    } else if (field.section === "portfolio") {
      portfolioTotal += 1;
      if (filled) portfolioFilled += 1;
    }
  }

  const basic: SectionStatus = {
    complete: basicRequiredAllFilled,
    filled: basicFilled,
    total: basicTotal,
  };
  const logistics: SectionStatus = {
    complete: logisticsFilled > 0,
    filled: logisticsFilled,
    total: logisticsTotal,
  };
  const portfolio: SectionStatus = {
    complete: portfolioFilled > 0,
    filled: portfolioFilled,
    total: portfolioTotal,
  };

  const totalFields = basicTotal + logisticsTotal + portfolioTotal;
  const filledFields = basicFilled + logisticsFilled + portfolioFilled;
  const overall =
    totalFields === 0 ? 0 : Math.round((filledFields / totalFields) * 100);

  return { basic, logistics, portfolio, overall };
}
