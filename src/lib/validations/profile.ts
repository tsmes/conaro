import { z } from "zod";

// Genres and mediums accept free-form tags (not limited to the suggested
// list), with sane caps on count, length, and duplicates.
const tagArraySchema = (label: string) =>
  z
    .array(z.string().trim().min(1).max(40))
    .max(25, `Too many ${label} selected`)
    .refine(
      (arr) => new Set(arr.map((v) => v.toLowerCase())).size === arr.length,
      `Duplicate ${label} selected`
    )
    .default([]);

const genresSchema = tagArraySchema("genres");
const mediumsSchema = tagArraySchema("mediums");

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
  // socialLinks arrives as a JSON-encoded array of { type, url }. We accept
  // the JSON string here so the server action can round-trip it to the text
  // column without a new DB migration. Shape is validated after parsing.
  socialLinks: z
    .string()
    .max(10_000, "Social links is too long")
    .optional()
    .default("")
    .transform((val, ctx) => {
      if (!val.trim()) return "";
      try {
        const parsed = JSON.parse(val);
        if (!Array.isArray(parsed)) throw new Error();
        const cleaned: Array<{ type: string; url: string }> = [];
        for (const item of parsed) {
          if (
            !item ||
            typeof item !== "object" ||
            typeof item.type !== "string" ||
            typeof item.url !== "string"
          ) {
            continue;
          }
          const type = item.type.trim().slice(0, 40);
          const url = item.url.trim().slice(0, 500);
          if (!type || !url) continue;
          if (!/^https?:\/\/.+/i.test(url)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `URL must start with http(s):// — check your ${type} link.`,
            });
            return z.NEVER;
          }
          cleaned.push({ type, url });
        }
        if (cleaned.length > 20) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Too many social links (max 20).",
          });
          return z.NEVER;
        }
        return cleaned.length === 0 ? "" : JSON.stringify(cleaned);
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Could not read your social links.",
        });
        return z.NEVER;
      }
    }),
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
  notes: z
    .string()
    .max(2000, "Notes must be at most 2000 characters")
    .optional()
    .default(""),
});

export type LogisticsInput = z.infer<typeof logisticsSchema>;
