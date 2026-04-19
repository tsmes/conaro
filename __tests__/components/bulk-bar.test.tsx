import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { BulkBar } from "@/components/conventions/selection/bulk-bar";

describe("BulkBar", () => {
  it("renders nothing when count is zero", () => {
    const { container } = render(
      <BulkBar
        count={0}
        onAccept={() => {}}
        onReject={() => {}}
        onClear={() => {}}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders the count and fires each handler", async () => {
    const user = userEvent.setup();
    const onAccept = vi.fn();
    const onReject = vi.fn();
    const onClear = vi.fn();
    render(
      <BulkBar
        count={3}
        onAccept={onAccept}
        onReject={onReject}
        onClear={onClear}
      />
    );
    expect(screen.getByText("3 selected")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /accept all/i }));
    await user.click(screen.getByRole("button", { name: /reject all/i }));
    await user.click(screen.getByRole("button", { name: /clear/i }));

    expect(onAccept).toHaveBeenCalled();
    expect(onReject).toHaveBeenCalled();
    expect(onClear).toHaveBeenCalled();
  });
});
