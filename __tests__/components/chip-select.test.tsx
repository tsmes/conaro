import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ChipSelect } from "@/components/ui/chip-select";

const OPTIONS = ["Ink", "Digital", "Gouache"] as const;

function hiddenValues(container: HTMLElement): string[] {
  return Array.from(
    container.querySelectorAll<HTMLInputElement>("input[type=hidden]")
  ).map((input) => input.value);
}

describe("ChipSelect", () => {
  it("renders a removable chip per default value", () => {
    render(
      <ChipSelect name="mediums" options={OPTIONS} defaultValues={["Ink"]} />
    );
    // Selected chip surfaces as a remove button
    expect(
      screen.getByRole("button", { name: "Remove Ink" })
    ).toBeInTheDocument();
    // Unselected option shows as an add button
    expect(
      screen.getByRole("button", { name: /\+ Digital/ })
    ).toBeInTheDocument();
  });

  it("adds and removes selections when chips are clicked", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ChipSelect name="mediums" options={OPTIONS} defaultValues={["Ink"]} />
    );

    await user.click(screen.getByRole("button", { name: /\+ Digital/ }));
    expect(hiddenValues(container)).toEqual(["Ink", "Digital"]);

    await user.click(screen.getByRole("button", { name: "Remove Ink" }));
    expect(hiddenValues(container)).toEqual(["Digital"]);
  });

  it("enforces max selections", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ChipSelect name="mediums" options={OPTIONS} max={1} />
    );

    await user.click(screen.getByRole("button", { name: /\+ Ink/ }));
    // Once max is reached, remaining option chips are disabled
    expect(screen.getByRole("button", { name: /\+ Digital/ })).toBeDisabled();
    expect(hiddenValues(container)).toEqual(["Ink"]);
  });

  it("preserves custom defaultValues outside the options list", () => {
    const { container } = render(
      <ChipSelect
        name="mediums"
        options={OPTIONS}
        defaultValues={["Ink", "Glitter glue"]}
      />
    );
    expect(hiddenValues(container)).toEqual(["Ink", "Glitter glue"]);
    expect(
      screen.getByRole("button", { name: "Remove Glitter glue" })
    ).toBeInTheDocument();
    expect(screen.getByText(/Custom:/)).toBeInTheDocument();
  });

  it("lets the artist add a custom value via the input when allowCustom is on", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ChipSelect name="mediums" options={OPTIONS} allowCustom />
    );
    const input = screen.getByPlaceholderText("Add your own");
    await user.type(input, "Woodcut{Enter}");
    expect(hiddenValues(container)).toEqual(["Woodcut"]);
  });
});
