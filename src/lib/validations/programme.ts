import { z } from "zod";

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const YMD = /^\d{4}-\d{2}-\d{2}$/;

// `z.string().optional().or(z.literal("").transform(...))` accepts
// "" through the left branch and never reaches the transform, so
// empty strings used to land in JSONB unchanged. preprocess() runs
// before the inner schema's optional check, so it's the only place
// that can normalise "" → undefined consistently.
const optionalString = (max: number) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().max(max).optional()
  );

const optionalHHMM = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().regex(HHMM, "Use HH:mm (24-hour)").optional()
);

// Round-trips through UTC so 2026-13-99 fails — Date "fixes" the
// overflow and toISOString no longer matches the input.
function isCalendarDate(value: string): boolean {
  if (!YMD.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return false;
  return date.toISOString().startsWith(value);
}

export const programmeItemSchema = z
  .object({
    id: z.string().min(1).max(64),
    date: z.string().refine(isCalendarDate, "Use YYYY-MM-DD"),
    startTime: z.string().regex(HHMM, "Use HH:mm (24-hour)"),
    endTime: optionalHHMM,
    title: z.string().min(1, "Required").max(200),
    room: optionalString(80),
    speaker: optionalString(200),
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
