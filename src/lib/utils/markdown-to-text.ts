// Strips Markdown syntax for plain-text surfaces (line-clamp teasers,
// <input placeholder>, etc.). Scoped to the six features our rich-text
// editor emits: bold, italic, H3, bullet list, ordered list, link.
// Existing plain-text values pass through unchanged.
export function markdownToText(source: string | null | undefined): string {
  if (!source) return "";
  let text = source;

  // Links: [text](url) → text
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1");

  // Headings: ###, ##, # at line start → drop the marker + space
  text = text.replace(/^#{1,6}\s+/gm, "");

  // Ordered list markers: "1. " / "12. " at line start → drop
  text = text.replace(/^\s*\d+\.\s+/gm, "");

  // Bullet list markers: "- " / "* " / "+ " at line start → drop
  text = text.replace(/^\s*[-*+]\s+/gm, "");

  // Bold: **x** / __x__ → x
  text = text.replace(/\*\*([^*]+)\*\*/g, "$1");
  text = text.replace(/__([^_]+)__/g, "$1");

  // Italic: *x* / _x_ → x (single marker, not intersecting the bold above)
  text = text.replace(/(^|[\s(])\*([^*\n]+)\*/g, "$1$2");
  text = text.replace(/(^|[\s(])_([^_\n]+)_/g, "$1$2");

  // Collapse whitespace runs (newlines, tabs) into single spaces.
  text = text.replace(/\s+/g, " ").trim();

  return text;
}
