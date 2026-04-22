import { describe, it, expect } from "vitest";
import { buildApplicationAnswersSchema } from "@/lib/validations/application";
import type { TableSizeOption } from "@/lib/db/schema/events";

const tableOptions: TableSizeOption[] = [
  { id: "size-a", label: "Standard", dimensions: "90x120", priceNok: 280 },
  { id: "size-b", label: "Double", dimensions: "90x240", priceNok: 580 },
];

describe("buildApplicationAnswersSchema", () => {
  it("strips fields whose registry state is not_requested", () => {
    const schema = buildApplicationAnswersSchema({
      fieldRequirements: {
        tableSize: "not_requested",
        assistants: "not_requested",
        sharingStand: "not_requested",
        placementPreference: "not_requested",
        additionalComments: "not_requested",
        promotionConsent: "not_requested",
      },
      tableSizeOptions: tableOptions,
      maxAssistants: 0,
    });
    const parsed = schema.parse({
      tableSizeOptionId: "size-a",
      assistants: { count: 1, names: ["Alex"] },
      sharingStand: { sharing: false },
      placementPreference: "Anywhere",
      additionalComments: "Hi",
      promotionConsent: true,
    });
    expect(parsed).toEqual({});
  });

  it("requires tableSize when state is required and rejects unknown option ids", () => {
    const schema = buildApplicationAnswersSchema({
      fieldRequirements: { tableSize: "required" },
      tableSizeOptions: tableOptions,
      maxAssistants: 0,
    });
    expect(() => schema.parse({})).toThrow(/pick a table size/);
    expect(() =>
      schema.parse({ tableSizeOptionId: "nope" })
    ).toThrow(/no longer available/);
    expect(schema.parse({ tableSizeOptionId: "size-b" })).toEqual({
      tableSizeOptionId: "size-b",
    });
  });

  it("caps assistants count at maxAssistants and requires names per count", () => {
    const schema = buildApplicationAnswersSchema({
      fieldRequirements: { assistants: "optional" },
      tableSizeOptions: [],
      maxAssistants: 1,
    });
    expect(() =>
      schema.parse({ assistants: { count: 2, names: ["A", "B"] } })
    ).toThrow(/At most 1 assistants/);
    expect(() =>
      schema.parse({ assistants: { count: 1, names: [] } })
    ).toThrow(/name each assistant/);
    expect(
      schema.parse({ assistants: { count: 1, names: ["Sofie"] } })
    ).toEqual({ assistants: { count: 1, names: ["Sofie"] } });
  });

  it("requires placementPreference text when set to required", () => {
    const schema = buildApplicationAnswersSchema({
      fieldRequirements: { placementPreference: "required" },
      tableSizeOptions: [],
      maxAssistants: 0,
    });
    expect(() => schema.parse({ placementPreference: "  " })).toThrow();
    expect(
      schema.parse({ placementPreference: "next to Bizziton" })
    ).toEqual({ placementPreference: "next to Bizziton" });
  });

  it("requires promotionConsent answer when state is required", () => {
    const schema = buildApplicationAnswersSchema({
      fieldRequirements: { promotionConsent: "required" },
      tableSizeOptions: [],
      maxAssistants: 0,
    });
    expect(() => schema.parse({})).toThrow(/promotion question/);
    expect(schema.parse({ promotionConsent: true })).toEqual({
      promotionConsent: true,
    });
  });
});
