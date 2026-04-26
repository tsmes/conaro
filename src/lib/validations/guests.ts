import { z } from "zod";

const optionalString = (max: number) =>
  z
    .string()
    .max(max)
    .optional()
    .or(z.literal("").transform(() => undefined));

const optionalUrl = z
  .string()
  .url("Enter a full URL (https://…)")
  .max(500)
  .optional()
  .or(z.literal("").transform(() => undefined));

export const socialLinkSchema = z.object({
  type: z.string().min(1).max(40),
  url: z.string().min(1).max(500),
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
