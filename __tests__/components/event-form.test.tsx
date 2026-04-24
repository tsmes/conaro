import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { EventForm } from "@/components/conventions/event-form";

if (typeof globalThis.requestAnimationFrame === "undefined") {
  globalThis.requestAnimationFrame = (cb: FrameRequestCallback) =>
    setTimeout(() => cb(performance.now()), 16) as unknown as number;
  globalThis.cancelAnimationFrame = (id: number) =>
    clearTimeout(id as unknown as NodeJS.Timeout);
}

const noopAction = vi.fn(async () => ({}));

describe("EventForm", () => {
  it("renders rich-text editors for description, guidelines, acceptance, rejection (4 toolbars)", async () => {
    render(
      <EventForm
        action={noopAction}
        submitLabel="Save"
        defaultValues={{
          description: "A **bold** description",
          guidelinesOverride: "- one\n- two",
          acceptanceMessage: "Welcome!",
          rejectionMessage: "Sorry.",
          priceInfo: "100 NOK",
        }}
      />
    );
    await waitFor(() => {
      expect(screen.getAllByRole("toolbar")).toHaveLength(4);
    });
  });

  it("keeps priceInfo as a plain textarea (no toolbar for it)", async () => {
    render(
      <EventForm
        action={noopAction}
        submitLabel="Save"
        defaultValues={{ priceInfo: "100 NOK" }}
      />
    );
    const priceInput = screen.getByLabelText(/Price Info/i) as HTMLTextAreaElement;
    expect(priceInput.tagName).toBe("TEXTAREA");
    expect(priceInput.value).toBe("100 NOK");
  });

  it("pre-fills the hidden Markdown inputs from defaultValues", async () => {
    render(
      <EventForm
        action={noopAction}
        submitLabel="Save"
        defaultValues={{
          description: "Hello **there**",
          guidelinesOverride: "### Rules\n- be kind",
        }}
      />
    );
    await waitFor(() => {
      const descHidden = document.querySelector(
        'input[type="hidden"][name="description"]'
      ) as HTMLInputElement | null;
      expect(descHidden?.value).toBe("Hello **there**");
    });
    const guidelinesHidden = document.querySelector(
      'input[type="hidden"][name="guidelinesOverride"]'
    ) as HTMLInputElement | null;
    // Tiptap's markdown serializer inserts blank lines between block
    // elements — accept either form.
    expect(guidelinesHidden?.value).toMatch(/^### Rules\n+- be kind$/);
  });

  it("carries widthCm + depthCm on tableSizeOptions through to the hidden input", async () => {
    render(
      <EventForm
        action={noopAction}
        submitLabel="Save"
        defaultValues={{
          tableSizeOptions: [
            {
              id: "ts-1",
              label: "Standard",
              dimensions: "120x80 cm",
              priceNok: 1200,
              widthCm: 120,
              depthCm: 80,
            },
          ],
        }}
      />
    );
    const hidden = document.querySelector(
      'input[type="hidden"][name="tableSizeOptions"]'
    ) as HTMLInputElement | null;
    expect(hidden).not.toBeNull();
    const parsed = JSON.parse(hidden!.value) as Array<Record<string, unknown>>;
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({
      id: "ts-1",
      label: "Standard",
      widthCm: 120,
      depthCm: 80,
    });
  });
});
