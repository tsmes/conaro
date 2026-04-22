// Social links are stored as a JSON-encoded array in the existing
// `artist_profiles.social_links` text column (no schema migration required).
// Each entry is a platform + URL pair.

export const SOCIAL_PLATFORMS = [
  "Instagram",
  "TikTok",
  "YouTube",
  "X / Twitter",
  "Facebook",
  "BlueSky",
  "Threads",
  "Cara",
  "Artdeck",
  "DeviantArt",
  "Etsy",
  "Shopify",
  "Pinterest",
  "Tumblr",
  "Linktree",
  "Website",
  "Other",
] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export interface SocialLink {
  type: SocialPlatform | string;
  url: string;
}

// Parse a raw `socialLinks` column value into an array. Handles three cases:
//   - null/empty               → []
//   - valid JSON array         → parsed entries (with bad entries dropped)
//   - legacy free-text string  → one "Other" entry with the raw text as url
export function parseSocialLinks(raw: string | null | undefined): SocialLink[] {
  if (!raw) return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (!Array.isArray(parsed)) {
      return [{ type: "Other", url: trimmed }];
    }
    const out: SocialLink[] = [];
    for (const item of parsed) {
      if (
        item &&
        typeof item === "object" &&
        typeof (item as SocialLink).type === "string" &&
        typeof (item as SocialLink).url === "string" &&
        (item as SocialLink).url.trim() !== ""
      ) {
        out.push({
          type: (item as SocialLink).type.trim().slice(0, 40),
          url: (item as SocialLink).url.trim().slice(0, 500),
        });
      }
    }
    return out;
  } catch {
    // Legacy multi-line / free text — collapse into one "Other" entry so it
    // surfaces for the artist to edit; URL validation will highlight if it's
    // not actually a URL.
    return [{ type: "Other", url: trimmed }];
  }
}

export function serializeSocialLinks(links: SocialLink[]): string {
  const cleaned = links
    .map((l) => ({
      type: l.type.trim().slice(0, 40),
      url: l.url.trim().slice(0, 500),
    }))
    .filter((l) => l.type && l.url);
  return cleaned.length === 0 ? "" : JSON.stringify(cleaned);
}

export function isLikelyUrl(value: string): boolean {
  return /^https?:\/\/.+/i.test(value.trim());
}
