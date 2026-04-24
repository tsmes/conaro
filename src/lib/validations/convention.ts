import { z } from "zod";
import { FIELD_REGISTRY } from "@/lib/db/field-registry";

// --- Convention Profile ---

export const conventionProfileSchema = z.object({
  name: z
    .string()
    .min(1, "Convention name is required")
    .max(200, "Convention name is too long"),
  description: z
    .string()
    .max(2000, "Description is too long")
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
  guidelines: z
    .string()
    .max(10_000, "Guidelines are too long")
    .optional()
    .default(""),
  acceptanceMessage: z
    .string()
    .max(5000, "Acceptance message is too long")
    .optional()
    .default(""),
  rejectionMessage: z
    .string()
    .max(5000, "Rejection message is too long")
    .optional()
    .default(""),
  waitlistEnabled: z
    .string()
    .optional()
    .default("")
    .transform((val) => val === "on"),
});

export type ConventionProfileInput = z.infer<typeof conventionProfileSchema>;

// --- Event ---

export const eventSchema = z
  .object({
    name: z
      .string()
      .min(1, "Event name is required")
      .max(200, "Event name is too long"),
    description: z
      .string()
      .max(5000, "Description is too long")
      .optional()
      .default(""),
    eventStartDate: z
      .string()
      .min(1, "Event start date is required")
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
    eventEndDate: z
      .string()
      .optional()
      .default("")
      .refine(
        (val) => val === "" || /^\d{4}-\d{2}-\d{2}$/.test(val),
        "Date must be in YYYY-MM-DD format"
      ),
    applicationOpenDate: z
      .string()
      .optional()
      .default("")
      .refine(
        (val) => val === "" || /^\d{4}-\d{2}-\d{2}$/.test(val),
        "Date must be in YYYY-MM-DD format"
      ),
    applicationCloseDate: z
      .string()
      .optional()
      .default("")
      .refine(
        (val) => val === "" || /^\d{4}-\d{2}-\d{2}$/.test(val),
        "Date must be in YYYY-MM-DD format"
      ),
    venueName: z
      .string()
      .max(200, "Venue name is too long")
      .optional()
      .default(""),
    venueAddress: z
      .string()
      .max(500, "Address is too long")
      .optional()
      .default(""),
    venueCity: z.string().max(200, "City is too long").optional().default(""),
    venueCountry: z
      .string()
      .max(200, "Country is too long")
      .optional()
      .default(""),
    mapEmbedUrl: z
      .string()
      .max(1000, "URL is too long")
      .refine(
        (val) => val === "" || /^https?:\/\/.+/.test(val),
        "Please enter a valid URL starting with http:// or https://"
      )
      .optional()
      .default(""),
    availableStands: z
      .string()
      .optional()
      .default("")
      .transform((val) => (val === "" ? null : Number(val)))
      .refine(
        (val) => val === null || (Number.isInteger(val) && val >= 1),
        "Available stands must be a positive whole number"
      ),
    tableDimensions: z
      .string()
      .max(200, "Table dimensions is too long")
      .optional()
      .default(""),
    priceInfo: z
      .string()
      .max(500, "Price info is too long")
      .optional()
      .default(""),
    setupTime: z
      .string()
      .max(200, "Setup time is too long")
      .optional()
      .default(""),
    teardownTime: z
      .string()
      .max(200, "Teardown time is too long")
      .optional()
      .default(""),
    amenities_electricity: z
      .string()
      .optional()
      .default("")
      .transform((val) => val === "on"),
    amenities_wifi: z
      .string()
      .optional()
      .default("")
      .transform((val) => val === "on"),
    amenities_tables: z
      .string()
      .optional()
      .default("")
      .transform((val) => val === "on"),
    amenities_chairs: z
      .string()
      .optional()
      .default("")
      .transform((val) => val === "on"),
    amenities_other: z
      .string()
      .max(500, "Amenities notes is too long")
      .optional()
      .default(""),
    guidelinesOverride: z
      .string()
      .max(10_000, "Guidelines override is too long")
      .optional()
      .default(""),
    tableSizeOptions: z
      .string()
      .optional()
      .default("[]")
      .transform((val, ctx) => {
        try {
          const parsed = JSON.parse(val || "[]");
          if (!Array.isArray(parsed)) throw new Error();
          return parsed;
        } catch {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Invalid table size options",
          });
          return z.NEVER;
        }
      })
      .pipe(
        z
          .array(
            z.object({
              id: z.string().min(1),
              label: z.string().min(1, "Label is required").max(100),
              priceNok: z
                .union([z.number().int().min(0), z.null()])
                .nullable()
                .optional(),
              widthCm: z.number().int().min(1).max(1000).optional(),
              depthCm: z.number().int().min(1).max(1000).optional(),
            })
          )
          .max(10)
      ),
    acceptanceMessage: z
      .string()
      .max(5000, "Acceptance message is too long")
      .optional()
      .default(""),
    rejectionMessage: z
      .string()
      .max(5000, "Rejection message is too long")
      .optional()
      .default(""),
    maxAssistants: z
      .string()
      .optional()
      .default("0")
      .transform((val) => Number(val))
      .refine(
        (n) => Number.isInteger(n) && n >= 0 && n <= 5,
        "Max assistants must be between 0 and 5"
      ),
    assistantFeeNok: z
      .string()
      .optional()
      .default("")
      .transform((val) => (val === "" ? null : Number(val)))
      .refine(
        (val) =>
          val === null || (Number.isInteger(val) && val >= 0 && val <= 100_000),
        "Fee must be a non-negative whole number"
      ),
  })
  .refine(
    (data) => {
      if (data.eventEndDate && data.eventStartDate) {
        return data.eventEndDate >= data.eventStartDate;
      }
      return true;
    },
    {
      message: "End date must be on or after start date",
      path: ["eventEndDate"],
    }
  )
  .refine(
    (data) => {
      if (data.applicationCloseDate && data.applicationOpenDate) {
        return data.applicationCloseDate >= data.applicationOpenDate;
      }
      return true;
    },
    {
      message: "Application close date must be on or after open date",
      path: ["applicationCloseDate"],
    }
  );

export type EventInput = z.infer<typeof eventSchema>;

// --- Field Configuration ---

const fieldStateEnum = z.enum(["required", "optional", "not_requested"]);

const fieldConfigShape: Record<string, z.ZodDefault<z.ZodEnum<["required", "optional", "not_requested"]>>> = {};
for (const field of FIELD_REGISTRY) {
  fieldConfigShape[field.key] = fieldStateEnum.default("not_requested");
}

export const fieldConfigSchema = z
  .object(fieldConfigShape)
  .extend({
    minPortfolioImages: z.coerce
      .number()
      .int()
      .min(0, "Must be 0 or more")
      .max(20, "Must be 20 or fewer")
      .default(0),
  });

export type FieldConfigInput = z.infer<typeof fieldConfigSchema>;
