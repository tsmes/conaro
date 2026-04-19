import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Segmented } from "@/components/ui/segmented";

const OPTIONS = [
  { value: "gallery", label: "Gallery" },
  { value: "table", label: "Table" },
  { value: "stacked", label: "Deep review" },
] as const;

describe("Segmented", () => {
  it("marks the active option with aria-checked", () => {
    render(
      <Segmented value="table" onChange={() => {}} options={OPTIONS} />
    );
    expect(screen.getByRole("radio", { name: "Table" })).toHaveAttribute(
      "aria-checked",
      "true"
    );
    expect(screen.getByRole("radio", { name: "Gallery" })).toHaveAttribute(
      "aria-checked",
      "false"
    );
  });

  it("fires onChange with the clicked option's value", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Segmented value="gallery" onChange={onChange} options={OPTIONS} />
    );

    await user.click(screen.getByRole("radio", { name: "Deep review" }));
    expect(onChange).toHaveBeenCalledWith("stacked");
  });
});
