// Locks in the invariant documented in STANDARDS.md: every profile-source
// field-registry entry must correspond to a real piece of data on the artist
// profile. If you add a new editable profile field, add its registry entry
// AND a mapping here so this test stops being a rubber stamp.
import { describe, it, expect } from "vitest";
import {
  FIELD_REGISTRY,
  PROFILE_FIELDS,
  type FieldDefinition,
} from "@/lib/db/field-registry";
import { artistProfiles } from "@/lib/db/schema/artist-profiles";
import { profiles } from "@/lib/db/schema/profiles";

// Registry key → how it's sourced from the artist profile.
//   - "profile.displayName" / "artistProfiles.<col>" point at a real column
//   - "multi:<colA>,<colB>"                         for multi-column fields
//   - "derived:<description>"                       for non-column data
//     (portfolioImages count, etc.)
const SOURCE_MAP: Record<string, string> = {
  displayName: "profile.displayName",
  realName: "artistProfiles.realName",
  pronouns: "artistProfiles.pronouns",
  contactEmail: "artistProfiles.contactEmail",
  phone: "artistProfiles.phone",
  bio: "artistProfiles.bio",
  websiteUrl: "artistProfiles.websiteUrl",
  socialLinks: "artistProfiles.socialLinks",
  helpers: "artistProfiles.helpers",
  accessibilityNeeds: "artistProfiles.accessibilityNeeds",
  notes: "artistProfiles.notes",
  priceRange: "multi:priceRangeMinNok,priceRangeMaxNok",
  genres: "artistProfiles.genres",
  mediums: "artistProfiles.mediums",
  portfolioImages: "derived:count(portfolioImages)",
};

describe("field-registry ↔ artist profile mapping", () => {
  it("every profile-source registry entry has a declared source", () => {
    const missing = PROFILE_FIELDS.filter((f) => !SOURCE_MAP[f.key]);
    expect(missing).toEqual([]);
  });

  it("every profile column-backed source points at a real column", () => {
    const artistColumns = new Set(
      Object.keys(artistProfiles).filter(
        (k) => !k.startsWith("_") && k !== "getSQL" && k !== "enableRLS"
      )
    );
    const profileColumns = new Set(
      Object.keys(profiles).filter(
        (k) => !k.startsWith("_") && k !== "getSQL" && k !== "enableRLS"
      )
    );

    for (const field of PROFILE_FIELDS) {
      const source = SOURCE_MAP[field.key];
      if (!source) continue;
      if (source.startsWith("artistProfiles.")) {
        const col = source.split(".")[1];
        expect(artistColumns.has(col), `missing column ${col}`).toBe(true);
      } else if (source.startsWith("profile.")) {
        const col = source.split(".")[1];
        expect(profileColumns.has(col), `missing column ${col}`).toBe(true);
      } else if (source.startsWith("multi:")) {
        const cols = source.substring("multi:".length).split(",");
        for (const col of cols) {
          expect(artistColumns.has(col), `missing column ${col}`).toBe(true);
        }
      }
    }
  });

  it("no registry entry is orphaned — every key in SOURCE_MAP is registered", () => {
    const registeredKeys = new Set(FIELD_REGISTRY.map((f: FieldDefinition) => f.key));
    const orphans = Object.keys(SOURCE_MAP).filter(
      (k) => !registeredKeys.has(k)
    );
    expect(orphans).toEqual([]);
  });
});
