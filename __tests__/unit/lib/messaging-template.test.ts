import { describe, it, expect } from "vitest";
import {
  TEMPLATE_TOKENS,
  buildTemplateContext,
  renderTemplate,
  type TemplateContext,
} from "@/lib/messaging/template";

const ctx: TemplateContext = {
  artistName: "Maya Kleven",
  artistPronouns: "she/her",
  eventName: "Kawaiicon 2026",
  eventDates: "20. - 21. Juni 2026",
  venue: "Hall C, Oslo, NO",
  conventionName: "Kawaiicon",
  organizerName: "Ines Tremblay",
};

describe("renderTemplate", () => {
  it("substitutes known tokens", () => {
    expect(
      renderTemplate("Hi {{ artist_name }}, welcome to {{ event_name }}", ctx)
    ).toBe("Hi Maya Kleven, welcome to Kawaiicon 2026");
  });

  it("ignores whitespace inside the braces", () => {
    expect(renderTemplate("{{artist_name}} · {{  event_name  }}", ctx)).toBe(
      "Maya Kleven · Kawaiicon 2026"
    );
  });

  it("is case-insensitive on token names", () => {
    expect(renderTemplate("{{ EVENT_NAME }}", ctx)).toBe("Kawaiicon 2026");
  });

  it("leaves unknown tokens intact so typos are visible", () => {
    expect(renderTemplate("{{ nope }} and {{ artist_name }}", ctx)).toBe(
      "{{ nope }} and Maya Kleven"
    );
  });

  it("returns empty string for null pronouns", () => {
    expect(
      renderTemplate("Hi {{ artist_pronouns }}", {
        ...ctx,
        artistPronouns: null,
      })
    ).toBe("Hi ");
  });

  it("exposes every token declared in TEMPLATE_TOKENS", () => {
    for (const def of TEMPLATE_TOKENS) {
      expect(renderTemplate(def.placeholder, ctx)).toBe(def.getValue(ctx));
    }
  });
});

describe("buildTemplateContext", () => {
  it("joins venue parts and formats the date range", () => {
    const out = buildTemplateContext({
      artistDisplayName: "Artist",
      artistPronouns: null,
      eventName: "E",
      eventStartDate: "2026-06-20",
      eventEndDate: "2026-06-21",
      venueName: "Hall C",
      venueCity: "Oslo",
      venueCountry: "NO",
      conventionName: "C",
      organizerName: "Org",
    });
    expect(out.venue).toBe("Hall C, Oslo, NO");
    expect(out.eventDates).toBe("20. - 21. Juni 2026");
  });

  it("omits empty venue parts without leaving double commas", () => {
    const out = buildTemplateContext({
      artistDisplayName: "A",
      artistPronouns: null,
      eventName: "E",
      eventStartDate: "2026-06-20",
      eventEndDate: null,
      venueName: null,
      venueCity: "Oslo",
      venueCountry: null,
      conventionName: "C",
      organizerName: "Org",
    });
    expect(out.venue).toBe("Oslo");
  });
});
