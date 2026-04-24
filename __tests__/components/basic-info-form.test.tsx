import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { BasicInfoForm } from "@/components/profile/basic-info-form";

vi.mock("@/app/(authenticated)/dashboard/profile/actions", () => ({
  updateBasicInfo: vi.fn(async () => ({})),
}));

if (typeof globalThis.requestAnimationFrame === "undefined") {
  globalThis.requestAnimationFrame = (cb: FrameRequestCallback) =>
    setTimeout(() => cb(performance.now()), 16) as unknown as number;
  globalThis.cancelAnimationFrame = (id: number) =>
    clearTimeout(id as unknown as NodeJS.Timeout);
}

const defaults = {
  displayName: "Elena",
  realName: "",
  pronouns: "",
  contactEmail: "",
  phone: "",
  bio: "I make **watercolour** prints of cats.",
  websiteUrl: "",
  socialLinks: [],
  genres: [],
  mediums: [],
  priceRangeMinNok: null,
  priceRangeMaxNok: null,
};

describe("BasicInfoForm", () => {
  it("mounts a rich-text editor for the bio field", async () => {
    render(<BasicInfoForm defaultValues={defaults} />);
    await waitFor(() => {
      expect(screen.getAllByRole("toolbar").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("pre-fills the bio hidden input with the default Markdown", async () => {
    render(<BasicInfoForm defaultValues={defaults} />);
    await waitFor(() => {
      const hidden = document.querySelector(
        'input[type="hidden"][name="bio"]'
      ) as HTMLInputElement | null;
      expect(hidden?.value).toBe(defaults.bio);
    });
  });
});
