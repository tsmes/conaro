import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ChipSelect } from "@/components/ui/chip-select";

const OPTIONS = ["Ink", "Digital", "Gouache"] as const;

describe("ChipSelect", () => {
  it("marks defaultValues as pressed", () => {
    render(
      <ChipSelect name="mediums" options={OPTIONS} defaultValues={["Ink"]} />
    );
    expect(screen.getByRole("button", { name: "Ink" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByRole("button", { name: "Digital" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  it("toggles selection when clicked", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ChipSelect name="mediums" options={OPTIONS} defaultValues={["Ink"]} />
    );

    await user.click(screen.getByRole("button", { name: "Digital" }));
    expect(screen.getByRole("button", { name: "Digital" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );

    const hiddenValues = Array.from(
      container.querySelectorAll<HTMLInputElement>("input[type=hidden]")
    ).map((input) => input.value);
    expect(hiddenValues).toEqual(["Ink", "Digital"]);

    await user.click(screen.getByRole("button", { name: "Ink" }));
    expect(screen.getByRole("button", { name: "Ink" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  it("enforces max selections", async () => {
    const user = userEvent.setup();
    render(<ChipSelect name="mediums" options={OPTIONS} max={1} />);

    await user.click(screen.getByRole("button", { name: "Ink" }));
    await user.click(screen.getByRole("button", { name: "Digital" }));

    expect(screen.getByRole("button", { name: "Ink" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByRole("button", { name: "Digital" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  it("ignores defaultValues that are not in the options", () => {
    const { container } = render(
      <ChipSelect
        name="mediums"
        options={OPTIONS}
        defaultValues={["Ink", "Not-a-real-medium"]}
      />
    );
    const hiddenValues = Array.from(
      container.querySelectorAll<HTMLInputElement>("input[type=hidden]")
    ).map((input) => input.value);
    expect(hiddenValues).toEqual(["Ink"]);
  });
});
