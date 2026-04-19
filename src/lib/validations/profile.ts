import { z } from "zod";
import { GENRES, MEDIUMS } from "@/lib/artist-profile/tags";

const genresSchema = z
  .array(z.enum(GENRES))
  .max(GENRES.length, "Too many genres selected")
  .refine((arr) => new Set(arr).size === arr.length, "Duplicate genres selected")
  .default([]);

const mediumsSchema = z
  .array(z.enum(MEDIUMS))
  .max(MEDIUMS.length, "Too many mediums selected")
  .refine((arr) => new Set(arr).size === arr.length, "Duplicate mediums selected")
  .default([]);

export const basicInfoSchema = z.object({
  displayName: z
    .string()
    .min(1, "Display name is required")
    .max(100, "Display name is too long"),
  realName: z.string().max(100, "Real name is too long").optional().default(""),
  contactEmail: z.string().email("Please enter a valid contact email"),
  phone: z.string().max(30, "Phone number is too long").optional().default(""),
  bio: z
    .string()
    .max(2000, "Bio must be at most 2000 characters")
    .optional()
    .default(""),
  websiteUrl: z
    .string()
    .max(500, "URL is too long")
    .refine(
      (val) => val === "" || /^https?:\/\/.+/.test(val),
      "Please enter a valid URL starting with http:// or https://"
    )
    .optional()
    .default(""),
  socialLinks: z
    .string()
    .max(500, "Social links is too long")
    .optional()
    .default(""),
  genres: genresSchema,
  mediums: mediumsSchema,
});

export type BasicInfoInput = z.infer<typeof basicInfoSchema>;

export const logisticsSchema = z.object({
  helpers: z.coerce
    .number()
    .int()
    .min(0, "Helpers must be 0 or more")
    .max(5, "Helpers must be 5 or fewer")
    .default(0),
  accessibilityNeeds: z
    .string()
    .max(1000, "Accessibility needs is too long")
    .optional()
    .default(""),
  tableSizePreference: z
    .string()
    .max(200, "Table size preference is too long")
    .optional()
    .default(""),
  notes: z
    .string()
    .max(2000, "Notes must be at most 2000 characters")
    .optional()
    .default(""),
});

export type LogisticsInput = z.infer<typeof logisticsSchema>;
