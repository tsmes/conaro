import { z } from "zod";
import type {
  FieldRequirements,
  TableSizeOption,
} from "@/lib/db/schema/events";
import type { ApplicationAnswers } from "@/lib/db/schema/applications";

export interface EventAnswerConfig {
  fieldRequirements: FieldRequirements | null;
  tableSizeOptions: TableSizeOption[];
  maxAssistants: number;
}

function isRequired(
  reqs: FieldRequirements | null,
  key: string
): boolean {
  return reqs?.[key] === "required";
}

function isPresented(
  reqs: FieldRequirements | null,
  key: string
): boolean {
  const state = reqs?.[key];
  return state === "required" || state === "optional";
}

// Builds a Zod schema for an application's answers based on the event's
// field requirements, available table-size options, and max assistants.
// `not_requested` fields are stripped from the parsed result.
export function buildApplicationAnswersSchema(
  config: EventAnswerConfig
): z.ZodType<ApplicationAnswers> {
  const validTableSizeIds = new Set(config.tableSizeOptions.map((o) => o.id));

  const schema = z
    .object({
      tableSizeOptionId: z.string().optional(),
      assistants: z
        .object({
          count: z.coerce.number().int().min(0),
          names: z.array(z.string()),
        })
        .optional(),
      sharingStand: z
        .object({
          sharing: z.boolean(),
          with: z.string().optional(),
        })
        .optional(),
      placementPreference: z.string().optional(),
      additionalComments: z.string().optional(),
      promotionConsent: z.boolean().optional(),
    })
    .superRefine((data, ctx) => {
      // tableSize: if presented and a value is provided, it must match an option.
      if (data.tableSizeOptionId !== undefined) {
        if (!isPresented(config.fieldRequirements, "tableSize")) {
          // Field wasn't offered for this event — silently strip.
          delete (data as { tableSizeOptionId?: string }).tableSizeOptionId;
        } else if (
          data.tableSizeOptionId &&
          !validTableSizeIds.has(data.tableSizeOptionId)
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Selected table size is no longer available.",
            path: ["tableSizeOptionId"],
          });
        }
      }
      if (
        isRequired(config.fieldRequirements, "tableSize") &&
        !data.tableSizeOptionId
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please pick a table size.",
          path: ["tableSizeOptionId"],
        });
      }

      // assistants: count must be within range; names list length must match count.
      if (data.assistants !== undefined) {
        if (!isPresented(config.fieldRequirements, "assistants")) {
          delete (data as { assistants?: unknown }).assistants;
        } else {
          if (data.assistants.count > config.maxAssistants) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `At most ${config.maxAssistants} assistants allowed.`,
              path: ["assistants", "count"],
            });
          }
          if (data.assistants.names.length !== data.assistants.count) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Please name each assistant.",
              path: ["assistants", "names"],
            });
          }
        }
      }
      if (
        isRequired(config.fieldRequirements, "assistants") &&
        data.assistants === undefined
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please tell us about assistants.",
          path: ["assistants"],
        });
      }

      // sharingStand: required-when-present means yes/no must be answered.
      if (
        data.sharingStand !== undefined &&
        !isPresented(config.fieldRequirements, "sharingStand")
      ) {
        delete (data as { sharingStand?: unknown }).sharingStand;
      }
      if (
        isRequired(config.fieldRequirements, "sharingStand") &&
        data.sharingStand === undefined
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please indicate whether you're sharing the stand.",
          path: ["sharingStand"],
        });
      }

      // Free-text optionals: strip when not presented; require when required.
      for (const key of [
        "placementPreference",
        "additionalComments",
      ] as const) {
        if (data[key] !== undefined && !isPresented(config.fieldRequirements, key)) {
          delete (data as Record<string, unknown>)[key];
        }
        if (
          isRequired(config.fieldRequirements, key) &&
          !data[key]?.trim()
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "This field is required.",
            path: [key],
          });
        }
      }

      // promotionConsent boolean: strip when not presented.
      if (
        data.promotionConsent !== undefined &&
        !isPresented(config.fieldRequirements, "promotionConsent")
      ) {
        delete (data as { promotionConsent?: boolean }).promotionConsent;
      }
      if (
        isRequired(config.fieldRequirements, "promotionConsent") &&
        data.promotionConsent === undefined
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please answer the promotion question.",
          path: ["promotionConsent"],
        });
      }
    }) as z.ZodType<ApplicationAnswers>;

  return schema;
}
