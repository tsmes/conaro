import { z } from "zod";

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

// Accepts a 6-digit hex (e.g. "#3366ff") or null/undefined to clear
// the override. We don't accept the 3-digit shorthand or 8-digit
// alpha form — uniform serialisation makes the cascade comparison
// predictable.
export const headerColorBodySchema = z.object({
  color: z
    .string()
    .regex(HEX_RE, "Use a 6-digit hex like #3366ff.")
    .nullable()
    .or(z.undefined())
    .transform((v) => v ?? null),
});

export type HeaderColorBody = z.infer<typeof headerColorBodySchema>;
