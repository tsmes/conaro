// Suggested genres and mediums shown as pre-selectable chips on the artist
// profile. Artists can also add their own free-form tags via the chip input
// field; these are persisted as-is and show up in applications.
export const GENRE_SUGGESTIONS = [
  "Anime / Manga",
  "Chibi",
  "Comics",
  "Cyberpunk",
  "Dark / Horror",
  "Fanart",
  "Fantasy",
  "Folk",
  "Furry",
  "Gothic",
  "Illustration",
  "Nature",
  "Original characters",
  "Pop culture",
  "Queer",
  "Retro / Vintage",
  "Sci-fi",
  "Slice of life",
  "Steampunk",
  "Wholesome / Cute",
  "Zines",
] as const;

export const MEDIUM_SUGGESTIONS = [
  "3D print",
  "Acrylic",
  "Charms / Keyrings",
  "Clay / Polymer clay",
  "Copic markers",
  "Digital",
  "Embroidery",
  "Enamel pins",
  "Gouache",
  "Ink",
  "Knitting / Crochet",
  "Lasercut / Woodwork",
  "Leather",
  "Metalwork",
  "Oil",
  "Pastel",
  "Photography",
  "Plushies",
  "Resin",
  "Risograph",
  "Screenprint",
  "Sculpture",
  "Sewing / Textile",
  "Stickers",
  "Vinyl cut",
  "Watercolor",
] as const;

// Aliases kept for call sites that used the original names.
export const GENRES = GENRE_SUGGESTIONS;
export const MEDIUMS = MEDIUM_SUGGESTIONS;

export type GenreSuggestion = (typeof GENRE_SUGGESTIONS)[number];
export type MediumSuggestion = (typeof MEDIUM_SUGGESTIONS)[number];

// Normalise a user-entered tag: collapse whitespace, trim, cap at 40 chars.
export function normalizeTag(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, 40);
}
