export const GENRES = [
  "Comics",
  "Illustration",
  "Zines",
  "Horror",
  "Folk",
  "Queer",
  "Slice of life",
  "Sci-fi",
  "Fantasy",
  "Nature",
] as const;

export const MEDIUMS = [
  "Ink",
  "Risograph",
  "Digital",
  "Watercolor",
  "Gouache",
  "Screenprint",
  "Pastel",
  "Acrylic",
] as const;

export type Genre = (typeof GENRES)[number];
export type Medium = (typeof MEDIUMS)[number];

export function isGenre(value: unknown): value is Genre {
  return typeof value === "string" && (GENRES as readonly string[]).includes(value);
}

export function isMedium(value: unknown): value is Medium {
  return typeof value === "string" && (MEDIUMS as readonly string[]).includes(value);
}
