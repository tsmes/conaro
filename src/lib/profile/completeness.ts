interface ProfileData {
  displayName: string;
}

interface ArtistProfileData {
  contactEmail: string | null;
  realName: string | null;
  phone: string | null;
  bio: string | null;
  websiteUrl: string | null;
  socialLinks: string | null;
  helpers: number | null;
  accessibilityNeeds: string | null;
  tableSizePreference: string | null;
  notes: string | null;
}

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

export function computeCompleteness(
  profile: ProfileData | undefined,
  artistProfile: ArtistProfileData | undefined,
  imageCount: number
): CompletenessResult {
  // Basic info: displayName and contactEmail are required, others are optional
  const basicFields = [
    { value: profile?.displayName, required: true },
    { value: artistProfile?.contactEmail, required: true },
    { value: artistProfile?.realName, required: false },
    { value: artistProfile?.phone, required: false },
    { value: artistProfile?.bio, required: false },
    { value: artistProfile?.websiteUrl, required: false },
    { value: artistProfile?.socialLinks, required: false },
  ];

  const basicFilled = basicFields.filter((f) => !!f.value).length;
  const basicRequiredFilled = basicFields
    .filter((f) => f.required)
    .every((f) => !!f.value);

  // Logistics: no required fields, complete when any field is filled
  const logisticsFields = [
    artistProfile?.helpers !== null && artistProfile?.helpers !== undefined
      && artistProfile.helpers > 0,
    !!artistProfile?.accessibilityNeeds,
    !!artistProfile?.tableSizePreference,
    !!artistProfile?.notes,
  ];

  const logisticsFilled = logisticsFields.filter(Boolean).length;

  // Portfolio: complete when at least 1 image
  const portfolio: SectionStatus = {
    complete: imageCount > 0,
    filled: imageCount,
    total: 20,
  };

  const basic: SectionStatus = {
    complete: basicRequiredFilled,
    filled: basicFilled,
    total: basicFields.length,
  };

  const logistics: SectionStatus = {
    complete: logisticsFilled > 0,
    filled: logisticsFilled,
    total: logisticsFields.length,
  };

  const sections = [basic, logistics, portfolio];
  const completeSections = sections.filter((s) => s.complete).length;
  const overall = Math.round((completeSections / sections.length) * 100);

  return { basic, logistics, portfolio, overall };
}
