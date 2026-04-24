import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ConventionProfileForm } from "@/components/conventions/convention-profile-form";

vi.mock(
  "@/app/(authenticated)/conventions/manage/actions",
  () => ({
    updateConventionProfile: vi.fn(async () => ({})),
  })
);

if (typeof globalThis.requestAnimationFrame === "undefined") {
  globalThis.requestAnimationFrame = (cb: FrameRequestCallback) =>
    setTimeout(() => cb(performance.now()), 16) as unknown as number;
  globalThis.cancelAnimationFrame = (id: number) =>
    clearTimeout(id as unknown as NodeJS.Timeout);
}

const defaults = {
  name: "Kawaiicon",
  description: "A **wonderful** time.",
  websiteUrl: "https://kawaii.test",
  guidelines: "1. Be kind\n2. Be cool",
  acceptanceMessage: "Hi **{{ artist_name }}**, congrats!",
  rejectionMessage: "Thanks for applying.",
  waitlistEnabled: true,
};

function getHiddenInput(name: string) {
  return document.querySelector(
    `input[type="hidden"][name="${name}"]`
  ) as HTMLInputElement | null;
}

describe("ConventionProfileForm", () => {
  it("renders rich-text editors for description, guidelines, acceptance, rejection", async () => {
    render(<ConventionProfileForm defaultValues={defaults} />);
    await waitFor(() => {
      // Four toolbars (one per rich-text editor)
      expect(screen.getAllByRole("toolbar")).toHaveLength(4);
    });
  });

  it("pre-fills the hidden textareas with the defaultValues markdown", async () => {
    render(<ConventionProfileForm defaultValues={defaults} />);
    await waitFor(() => {
      expect(getHiddenInput("description")).not.toBeNull();
    });
    expect(getHiddenInput("description")!.value).toBe(defaults.description);
    expect(getHiddenInput("guidelines")!.value).toBe(defaults.guidelines);
    expect(getHiddenInput("acceptanceMessage")!.value).toBe(
      defaults.acceptanceMessage
    );
    expect(getHiddenInput("rejectionMessage")!.value).toBe(
      defaults.rejectionMessage
    );
  });

  it("leaves plain inputs (name, websiteUrl) alone", () => {
    render(<ConventionProfileForm defaultValues={defaults} />);
    const nameInput = screen.getByLabelText(/Convention Name/i) as HTMLInputElement;
    expect(nameInput.tagName).toBe("INPUT");
    expect(nameInput.value).toBe(defaults.name);
  });
});
