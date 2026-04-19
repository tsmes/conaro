import type { ComponentProps } from "react";
import type { Badge } from "@/components/ui/badge";

type BadgeVariant = NonNullable<ComponentProps<typeof Badge>["variant"]>;

export interface StatusDisplay {
  label: string;
  variant: BadgeVariant;
}

export function getStatusDisplay(status: string, pinned: boolean): StatusDisplay {
  if (status === "accepted") return { label: "Accepted", variant: "success" };
  if (status === "rejected")
    return { label: "Not this year", variant: "destructive" };
  if (status === "revoked") return { label: "Revoked", variant: "destructive" };
  if (pinned) return { label: "Pinned", variant: "warning" };
  return { label: "Undecided", variant: "outline" };
}

const COLLAGE_PLACEHOLDERS = ["cover-a", "cover-b", "cover-c", "cover-d", "cover-e", "cover-f"] as const;

export function placeholderCover(id: string): string {
  const idx = id.charCodeAt(0) % COLLAGE_PLACEHOLDERS.length;
  return COLLAGE_PLACEHOLDERS[idx];
}
