import { describe, it, expect } from "vitest";
import { markdownToText } from "@/lib/utils/markdown-to-text";

describe("markdownToText", () => {
  it("returns empty string for null / undefined / empty", () => {
    expect(markdownToText(null)).toBe("");
    expect(markdownToText(undefined)).toBe("");
    expect(markdownToText("")).toBe("");
  });

  it("passes plain text through unchanged", () => {
    expect(markdownToText("Just a plain sentence.")).toBe(
      "Just a plain sentence."
    );
  });

  it("strips bold markers", () => {
    expect(markdownToText("Hi **there**, friend.")).toBe("Hi there, friend.");
  });

  it("strips italic markers", () => {
    expect(markdownToText("A *special* night.")).toBe("A special night.");
    expect(markdownToText("An _emphasised_ claim.")).toBe(
      "An emphasised claim."
    );
  });

  it("strips an H3 heading marker", () => {
    expect(markdownToText("### Section title\nBody text.")).toBe(
      "Section title Body text."
    );
  });

  it("flattens a bullet list", () => {
    expect(markdownToText("- one\n- two\n- three")).toBe("one two three");
  });

  it("flattens a numbered list", () => {
    expect(markdownToText("1. first\n2. second\n3. third")).toBe(
      "first second third"
    );
  });

  it("replaces a link with its text", () => {
    expect(
      markdownToText("See [the docs](https://example.com) for more.")
    ).toBe("See the docs for more.");
  });

  it("handles nested bold + italic in the same sentence", () => {
    expect(markdownToText("Hi **bold** and *italic*.")).toBe(
      "Hi bold and italic."
    );
  });

  it("preserves template placeholder tokens verbatim", () => {
    expect(markdownToText("Hi **{{ artist_name }}**, welcome.")).toBe(
      "Hi {{ artist_name }}, welcome."
    );
  });

  it("collapses repeated whitespace and trims", () => {
    expect(markdownToText("   hello\n\n\nworld   ")).toBe("hello world");
  });
});
