// Template tokens available in convention / event acceptance & rejection
// messages. When publishResults stamps a template onto an application it
// renders the text with the application-specific context. The same token
// list is exported so the organizer-facing textarea can show a live
// reference beside the input.

import { formatDateRangeNo } from "@/lib/utils/format-date-no";

export interface TemplateContext {
  artistName: string;
  artistPronouns: string | null;
  eventName: string;
  eventDates: string;
  venue: string;
  conventionName: string;
  organizerName: string;
}

export interface TemplateToken {
  token: string; // "artist_name"
  placeholder: string; // "{{ artist_name }}"
  label: string;
  description: string;
  getValue: (ctx: TemplateContext) => string;
}

export const TEMPLATE_TOKENS: TemplateToken[] = [
  {
    token: "artist_name",
    placeholder: "{{ artist_name }}",
    label: "Artist name",
    description: "The applicant's display name (from their profile).",
    getValue: (ctx) => ctx.artistName,
  },
  {
    token: "artist_pronouns",
    placeholder: "{{ artist_pronouns }}",
    label: "Artist pronouns",
    description: "Pronouns from the artist's profile (empty if unset).",
    getValue: (ctx) => ctx.artistPronouns ?? "",
  },
  {
    token: "event_name",
    placeholder: "{{ event_name }}",
    label: "Event name",
    description: "The event this application belongs to.",
    getValue: (ctx) => ctx.eventName,
  },
  {
    token: "event_dates",
    placeholder: "{{ event_dates }}",
    label: "Event dates",
    description: "Formatted date range, e.g. '20. \u2013 21. Juni 2026'.",
    getValue: (ctx) => ctx.eventDates,
  },
  {
    token: "venue",
    placeholder: "{{ venue }}",
    label: "Venue",
    description: "Venue name + city + country (if set on the event).",
    getValue: (ctx) => ctx.venue,
  },
  {
    token: "convention_name",
    placeholder: "{{ convention_name }}",
    label: "Convention name",
    description: "The parent convention.",
    getValue: (ctx) => ctx.conventionName,
  },
  {
    token: "organizer_name",
    placeholder: "{{ organizer_name }}",
    label: "Organizer name",
    description: "Display name of the convention's organizer account.",
    getValue: (ctx) => ctx.organizerName,
  },
];

// Renders `{{ token }}` occurrences (whitespace around the token name is
// ignored) against the provided context. Unknown tokens are left as-is so
// a typo is visible rather than silently eaten.
export function renderTemplate(text: string, ctx: TemplateContext): string {
  return text.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (match, raw: string) => {
    const def = TEMPLATE_TOKENS.find((t) => t.token === raw.toLowerCase());
    return def ? def.getValue(ctx) : match;
  });
}

// Build a TemplateContext from raw event / convention / applicant data.
// Exposed so the organizer UI can preview example substitutions without
// duplicating the derivation logic.
export function buildTemplateContext(input: {
  artistDisplayName: string;
  artistPronouns: string | null;
  eventName: string;
  eventStartDate: string;
  eventEndDate: string | null;
  venueName: string | null;
  venueCity: string | null;
  venueCountry: string | null;
  conventionName: string;
  organizerName: string;
}): TemplateContext {
  const venue = [input.venueName, input.venueCity, input.venueCountry]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(", ");
  return {
    artistName: input.artistDisplayName,
    artistPronouns: input.artistPronouns,
    eventName: input.eventName,
    eventDates: formatDateRangeNo(input.eventStartDate, input.eventEndDate),
    venue,
    conventionName: input.conventionName,
    organizerName: input.organizerName,
  };
}
