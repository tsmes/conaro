import { z } from "zod";

export const basicInfoSchema = z.object({
  displayName: z.string().min(1, "Display name is required"),
  realName: z.string().optional().default(""),
  contactEmail: z.string().email("Please enter a valid contact email"),
  phone: z.string().optional().default(""),
  bio: z.string().max(2000, "Bio must be at most 2000 characters").optional().default(""),
  websiteUrl: z
    .string()
    .url("Please enter a valid URL")
    .or(z.literal(""))
    .optional()
    .default(""),
  socialLinks: z.string().optional().default(""),
});

export type BasicInfoInput = z.infer<typeof basicInfoSchema>;

export const logisticsSchema = z.object({
  helpers: z.coerce
    .number()
    .int()
    .min(0, "Helpers must be 0 or more")
    .max(5, "Helpers must be 5 or fewer")
    .default(0),
  accessibilityNeeds: z.string().optional().default(""),
  tableSizePreference: z.string().optional().default(""),
  notes: z.string().optional().default(""),
});

export type LogisticsInput = z.infer<typeof logisticsSchema>;
