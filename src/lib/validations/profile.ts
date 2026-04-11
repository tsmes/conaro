import { z } from "zod";

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
    .url("Please enter a valid URL")
    .or(z.literal(""))
    .optional()
    .default(""),
  socialLinks: z
    .string()
    .max(500, "Social links is too long")
    .optional()
    .default(""),
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
