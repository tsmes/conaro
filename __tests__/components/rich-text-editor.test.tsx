import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { RichTextEditor } from "@/components/ui/rich-text-editor";

// Tiptap uses requestAnimationFrame in a few places; ensure it's available.
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

describe("RichTextEditor", () => {
  it("renders a toolbar with the expected formatting controls", async () => {
    render(<RichTextEditor name="bio" />);
    await waitFor(() => {
      expect(screen.getByRole("toolbar")).toBeInTheDocument();
    });
    expect(screen.getByLabelText("Bold")).toBeInTheDocument();
    expect(screen.getByLabelText("Italic")).toBeInTheDocument();
    expect(screen.getByLabelText("Heading")).toBeInTheDocument();
    expect(screen.getByLabelText("Bulleted list")).toBeInTheDocument();
    expect(screen.getByLabelText("Numbered list")).toBeInTheDocument();
    expect(screen.getByLabelText(/Add link/i)).toBeInTheDocument();
  });

  it("exposes a hidden input named after the `name` prop, pre-filled from defaultValue", async () => {
    render(<RichTextEditor name="bio" defaultValue="Hello **world**" />);
    await waitFor(() => {
      const hidden = getHiddenInput("bio");
      expect(hidden).not.toBeNull();
    });
    const hidden = getHiddenInput("bio")!;
    // defaultValue is set on the DOM input before the editor mounts,
    // so regardless of editor init, FormData would capture the default.
    expect(hidden.value).toBe("Hello **world**");
  });

  it("syncs the hidden input when a new controlled value arrives", async () => {
    const { rerender } = render(
      <RichTextEditor name="msg" value="Initial" />
    );
    await waitFor(() => {
      const hidden = getHiddenInput("msg");
      expect(hidden?.value).toBe("Initial");
    });
    rerender(<RichTextEditor name="msg" value="Second" />);
    await waitFor(() => {
      const hidden = getHiddenInput("msg");
      expect(hidden?.value).toBe("Second");
    });
  });

  it("opens the link editor popover when the link button is clicked", async () => {
    render(<RichTextEditor name="bio" />);
    await waitFor(() => {
      expect(screen.getByLabelText(/Add link/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByLabelText(/Add link/i));
    expect(screen.getByLabelText("Link URL")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apply" })).toBeInTheDocument();
  });

  it("disables the toolbar buttons when disabled=true", async () => {
    render(<RichTextEditor name="bio" disabled />);
    await waitFor(() => {
      expect(screen.getByLabelText("Bold")).toBeDisabled();
    });
    expect(screen.getByLabelText("Italic")).toBeDisabled();
    expect(screen.getByLabelText("Heading")).toBeDisabled();
  });
});
