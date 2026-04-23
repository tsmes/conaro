"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { TEMPLATE_TOKENS } from "@/lib/messaging/template";

interface TemplateTokenReferenceProps {
  // Optional preview context. When supplied, each token shows "→ value"
  // next to its description so organizers can see what their specific
  // convention / event will render.
  preview?: Partial<Record<string, string>>;
  defaultOpen?: boolean;
}

export function TemplateTokenReference({
  preview,
  defaultOpen = false,
}: TemplateTokenReferenceProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-md border border-border bg-muted/40 text-[12.5px]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 font-semibold"
      >
        <span className="inline-flex items-center gap-1.5">
          {open ? (
            <ChevronDown className="size-3.5" />
          ) : (
            <ChevronRight className="size-3.5" />
          )}
          Available placeholders
        </span>
        <span className="font-mono text-[11px] text-muted-foreground">
          {TEMPLATE_TOKENS.length}
        </span>
      </button>
      {open && (
        <ul className="border-t border-border px-3 py-2 space-y-1.5">
          {TEMPLATE_TOKENS.map((t) => {
            const value = preview?.[t.token];
            return (
              <li
                key={t.token}
                className="grid grid-cols-[minmax(140px,auto)_1fr] gap-3"
              >
                <code className="font-mono text-[11.5px] text-primary">
                  {t.placeholder}
                </code>
                <div className="min-w-0">
                  <span className="text-muted-foreground">
                    {t.description}
                  </span>
                  {value !== undefined && (
                    <span className="ml-1 font-mono text-[11px] text-foreground">
                      \u2192 {value || <em className="opacity-60">(empty)</em>}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
