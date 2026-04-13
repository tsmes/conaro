import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock next-themes at the module boundary. setTheme is a spy so we can
// assert which value each menu option dispatches.
const setTheme = vi.fn();
const useThemeMock = vi.fn(() => ({
  theme: "system",
  resolvedTheme: "light",
  setTheme,
}));

vi.mock("next-themes", () => ({
  useTheme: () => useThemeMock(),
}));

// Import after the mock is registered so next-themes resolves to the spy.
import { ThemeToggle } from "@/components/layout/theme-toggle";

describe("ThemeToggle", () => {
  beforeEach(() => {
    setTheme.mockClear();
    useThemeMock.mockImplementation(() => ({
      theme: "system",
      resolvedTheme: "light",
      setTheme,
    }));
  });

  it("renders a placeholder before mount (no icon, no trigger button)", () => {
    // Synchronous render catches pre-mount state; after useEffect fires the
    // trigger replaces the placeholder.
    const { container } = render(<ThemeToggle />);
    // Pre-effect DOM contains the placeholder div with aria-hidden.
    const placeholder = container.querySelector("[aria-hidden]");
    expect(placeholder).not.toBeNull();
  });

  it("shows the theme toggle button after mount and dispatches light/dark/system", async () => {
    render(<ThemeToggle />);
    // Let the mount effect run.
    await act(async () => {});
    const trigger = await screen.findByLabelText("Toggle theme");
    expect(trigger).toBeInTheDocument();

    await userEvent.click(trigger);
    await userEvent.click(await screen.findByText("Dark"));
    expect(setTheme).toHaveBeenCalledWith("dark");

    await userEvent.click(trigger);
    await userEvent.click(await screen.findByText("Light"));
    expect(setTheme).toHaveBeenCalledWith("light");

    await userEvent.click(trigger);
    await userEvent.click(await screen.findByText("System"));
    expect(setTheme).toHaveBeenCalledWith("system");
  });
});
