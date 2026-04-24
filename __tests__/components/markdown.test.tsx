import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Markdown } from "@/components/ui/markdown";

describe("Markdown", () => {
  it("renders nothing when source is empty", () => {
    const { container } = render(<Markdown source="" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when source is only whitespace", () => {
    const { container } = render(<Markdown source={"   \n  "} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders bold and italic formatting", () => {
    render(<Markdown source="Hello **bold** and *italic*." />);
    const strong = screen.getByText("bold");
    const em = screen.getByText("italic");
    expect(strong.tagName).toBe("STRONG");
    expect(em.tagName).toBe("EM");
  });

  it("renders an H3 heading", () => {
    render(<Markdown source="### Section title" />);
    const heading = screen.getByRole("heading", { level: 3 });
    expect(heading).toHaveTextContent("Section title");
  });

  it("renders a bulleted list", () => {
    const { container } = render(
      <Markdown source={"- one\n- two\n- three"} />
    );
    const ul = container.querySelector("ul");
    expect(ul).not.toBeNull();
    const items = container.querySelectorAll("li");
    expect(items).toHaveLength(3);
    expect(items[0].textContent).toContain("one");
  });

  it("renders a numbered list", () => {
    const { container } = render(<Markdown source={"1. first\n2. second"} />);
    const ol = container.querySelector("ol");
    expect(ol).not.toBeNull();
    expect(container.querySelectorAll("li")).toHaveLength(2);
  });

  it("renders a link with target=_blank and rel=noopener noreferrer", () => {
    render(<Markdown source="See [docs](https://example.com)." />);
    const anchor = screen.getByRole("link", { name: "docs" });
    expect(anchor).toHaveAttribute("href", "https://example.com");
    expect(anchor).toHaveAttribute("target", "_blank");
    expect(anchor).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("strips a script tag in raw HTML", () => {
    const { container } = render(
      <Markdown source={"Hi\n<script>alert('xss')</script>\nbye"} />
    );
    expect(container.querySelector("script")).toBeNull();
    expect(container.textContent).toContain("Hi");
    expect(container.textContent).toContain("bye");
  });

  it("strips an iframe tag", () => {
    const { container } = render(
      <Markdown source={'<iframe src="https://evil.test"></iframe>Hi'} />
    );
    expect(container.querySelector("iframe")).toBeNull();
  });

  it("strips a disallowed img tag", () => {
    const { container } = render(
      <Markdown source={"![alt](https://example.com/img.png)"} />
    );
    expect(container.querySelector("img")).toBeNull();
  });

  it("renders plain text (existing non-markdown values) unchanged", () => {
    render(<Markdown source="Just a plain sentence." />);
    expect(screen.getByText("Just a plain sentence.")).toBeInTheDocument();
  });

  it("preserves literal template placeholders", () => {
    render(<Markdown source="Hi **{{ artist_name }}**, welcome." />);
    expect(screen.getByText("{{ artist_name }}")).toBeInTheDocument();
  });

  it("strips a javascript: link href", () => {
    const { container } = render(
      <Markdown source={"[click](javascript:alert(1))"} />
    );
    const anchor = container.querySelector("a");
    // rehype-sanitize removes disallowed protocol hrefs
    expect(anchor?.getAttribute("href")).not.toBe("javascript:alert(1)");
  });
});
