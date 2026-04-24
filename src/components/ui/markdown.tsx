import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import type { Schema } from "hast-util-sanitize";

import { cn } from "@/lib/utils";

// Schema narrowed to exactly the formatting set our rich-text editor emits.
// Everything else (images, tables, code, blockquote, script/iframe/etc.) is
// stripped by rehype-sanitize.
const SANITIZE_SCHEMA: Schema = {
  ...defaultSchema,
  tagNames: ["p", "strong", "em", "h3", "ul", "ol", "li", "a", "br"],
  attributes: {
    a: ["href", "title"],
  },
  protocols: {
    href: ["http", "https", "mailto"],
  },
  clobberPrefix: "md-",
};

interface MarkdownProps {
  source: string | null | undefined;
  className?: string;
}

export function Markdown({ source, className }: MarkdownProps) {
  if (!source || source.trim() === "") return null;

  return (
    <div
      className={cn(
        "markdown space-y-3 text-sm leading-relaxed [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_h3]:font-heading [&_h3]:text-base [&_h3]:font-semibold [&_h3]:tracking-tight [&_ol]:ml-5 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-1",
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeSanitize, SANITIZE_SCHEMA]]}
        components={{
          a: ({ href, children, ...rest }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>
              {children}
            </a>
          ),
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
