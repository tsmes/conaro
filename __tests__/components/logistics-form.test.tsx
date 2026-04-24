import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { LogisticsForm } from "@/components/profile/logistics-form";

vi.mock("@/app/(authenticated)/dashboard/profile/actions", () => ({
  updateLogistics: vi.fn(async () => ({})),
}));

if (typeof globalThis.requestAnimationFrame === "undefined") {
  globalThis.requestAnimationFrame = (cb: FrameRequestCallback) =>
    setTimeout(() => cb(performance.now()), 16) as unknown as number;
  globalThis.cancelAnimationFrame = (id: number) =>
    clearTimeout(id as unknown as NodeJS.Timeout);
}

const defaults = {
  helpers: 1,
  accessibilityNeeds: "**Wheelchair** access please.",
  notes: "I usually bring my own lamp.",
};

describe("LogisticsForm", () => {
  it("mounts rich-text editors for accessibility needs and notes", async () => {
    render(<LogisticsForm defaultValues={defaults} />);
    await waitFor(() => {
      expect(screen.getAllByRole("toolbar")).toHaveLength(2);
    });
  });

  it("pre-fills both hidden inputs with default Markdown", async () => {
    render(<LogisticsForm defaultValues={defaults} />);
    await waitFor(() => {
      const access = document.querySelector(
        'input[type="hidden"][name="accessibilityNeeds"]'
      ) as HTMLInputElement | null;
      expect(access?.value).toBe(defaults.accessibilityNeeds);
    });
    const notes = document.querySelector(
      'input[type="hidden"][name="notes"]'
    ) as HTMLInputElement | null;
    expect(notes?.value).toBe(defaults.notes);
  });
});
