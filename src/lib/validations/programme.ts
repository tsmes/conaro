import { z } from "zod";

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const YMD = /^\d{4}-\d{2}-\d{2}$/;

export const programmeItemSchema = z
  .object({
    id: z.string().min(1).max(64),
    date: z.string().regex(YMD, "Use YYYY-MM-DD"),
    startTime: z.string().regex(HHMM, "Use HH:mm (24-hour)"),
    endTime: z
      .string()
      .regex(HHMM, "Use HH:mm (24-hour)")
      .optional()
      .or(z.literal("").transform(() => undefined)),
    title: z.string().min(1, "Required").max(200),
    room: z
      .string()
      .max(80)
      .optional()
      .or(z.literal("").transform(() => undefined)),
    speaker: z
      .string()
      .max(200)
      .optional()
      .or(z.literal("").transform(() => undefined)),
  })
  .refine(
    (item) => !item.endTime || item.endTime > item.startTime,
    {
      message: "End time must be after start time",
      path: ["endTime"],
    }
  );

export const programmeSchema = z.array(programmeItemSchema);

export type ProgrammeItemInput = z.infer<typeof programmeItemSchema>;
export type ProgrammeInput = z.infer<typeof programmeSchema>;

// Date-within-event-range is parameterised so the action can pass
// the event's current dates in. Treats null end date as a single-day
// event matching the start date.
export function isDateWithinEvent(
  date: string,
  eventStartDate: string,
  eventEndDate: string | null
): boolean {
  const end = eventEndDate ?? eventStartDate;
  return date >= eventStartDate && date <= end;
}
