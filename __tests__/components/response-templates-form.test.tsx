import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ResponseTemplatesForm } from "@/components/conventions/response-templates-form";

vi.mock(
  "@/app/(authenticated)/conventions/manage/events/[eventId]/applications/actions",
  () => ({
    updateResponseTemplates: vi.fn(async () => ({})),
  })
);

if (typeof globalThis.requestAnimationFrame === "undefined") {
  globalThis.requestAnimationFrame = (cb: FrameRequestCallback) =>
    setTimeout(() => cb(performance.now()), 16) as unknown as number;
  globalThis.cancelAnimationFrame = (id: number) =>
    clearTimeout(id as unknown as NodeJS.Timeout);
}

function getHiddenInput(name: string) {
  return document.querySelector(
    `input[type="hidden"][name="${name}"]`
  ) as HTMLInputElement | null;
}

describe("ResponseTemplatesForm", () => {
  it("mounts rich-text editors for both acceptance and rejection, populated from props", async () => {
    render(
      <ResponseTemplatesForm
        eventId="ev-1"
        acceptanceMessage="Welcome!"
        rejectionMessage="Sorry."
        otherEvents={[]}
        readOnly={false}
      />
    );
    await waitFor(() => {
      expect(screen.getAllByRole("toolbar")).toHaveLength(2);
    });
    expect(getHiddenInput("acceptanceMessage")?.value).toBe("Welcome!");
    expect(getHiddenInput("rejectionMessage")?.value).toBe("Sorry.");
  });

  it("overwrites editor contents when the Copy-from dropdown fires", async () => {
    const user = userEvent.setup();
    render(
      <ResponseTemplatesForm
        eventId="ev-1"
        acceptanceMessage="A"
        rejectionMessage="B"
        otherEvents={[
          {
            id: "src",
            name: "Other Event",
            acceptanceMessage: "Other **accept**",
            rejectionMessage: "Other *reject*",
          },
        ]}
        readOnly={false}
      />
    );
    await waitFor(() => {
      expect(screen.getAllByRole("toolbar")).toHaveLength(2);
    });
    await user.selectOptions(screen.getByRole("combobox"), "src");
    await waitFor(() => {
      expect(getHiddenInput("acceptanceMessage")?.value).toBe(
        "Other **accept**"
      );
    });
    expect(getHiddenInput("rejectionMessage")?.value).toBe("Other *reject*");
  });

  it("hides toolbar buttons behind the disabled prop in read-only mode", async () => {
    render(
      <ResponseTemplatesForm
        eventId="ev-1"
        acceptanceMessage="A"
        rejectionMessage="B"
        otherEvents={[]}
        readOnly={true}
      />
    );
    await waitFor(() => {
      expect(screen.getAllByRole("toolbar")).toHaveLength(2);
    });
    const boldButtons = screen.getAllByLabelText("Bold");
    boldButtons.forEach((b) => expect(b).toBeDisabled());
  });
});
