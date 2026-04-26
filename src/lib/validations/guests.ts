import { z } from "zod";

// preprocess() runs before the inner schema's optional check, so
// "" → undefined happens consistently. The fluent
// `.optional().or(z.literal(""))` form accepts "" through the
// optional branch and silently lands empty strings in JSONB.
const optionalString = (max: number) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().max(max).optional()
  );

const optionalUrl = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().url("Enter a full URL (https://…)").max(500).optional()
);

// Social link URLs are stored as a single text column on artist
// profiles too; we accept http(s) / mailto here so a guest can list
// "mailto:hello@…" alongside profile URLs. Any other scheme
// (javascript:, data:, …) is rejected to keep the public viewer's
// <a href> safe to render without scheme escaping.
const socialUrlSchema = z
  .string()
  .min(1)
  .max(500)
  .refine(
    (v) => /^(https?:\/\/|mailto:)/i.test(v.trim()),
    "Use a full URL (https://…) or mailto:"
  );

export const socialLinkSchema = z.object({
  type: z.string().min(1).max(40),
  url: socialUrlSchema,
});

export const guestSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1, "Required").max(200),
  title: z.string().min(1, "Required").max(80),
  role: optionalString(200),
  pronouns: optionalString(40),
  bio: optionalString(4000),
  // imagePath is the storage key returned by the upload route. We
  // don't validate URL shape — the storage adapter owns that — only
  // a defensive max length so an odd payload can't bloat the row.
  imagePath: optionalString(500),
  websiteUrl: optionalUrl,
  socialLinks: z.array(socialLinkSchema).max(20).optional(),
});

export const guestsSchema = z.array(guestSchema);

export type GuestInput = z.infer<typeof guestSchema>;
export type GuestsInput = z.infer<typeof guestsSchema>;
