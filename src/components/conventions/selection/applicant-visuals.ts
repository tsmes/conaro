import type { ComponentProps } from "react";
import type { Badge } from "@/components/ui/badge";
import type { ApplicationStatus } from "./types";

type BadgeVariant = NonNullable<ComponentProps<typeof Badge>["variant"]>;

export interface StatusDisplay {
  label: string;
  variant: BadgeVariant;
}

export function getStatusDisplay(
  status: ApplicationStatus,
  pinned: boolean
): StatusDisplay {
  switch (status) {
    case "accepted":
      return { label: "Accepted", variant: "success" };
    case "rejected":
      return { label: "Not this year", variant: "destructive" };
    case "revoked":
      return { label: "Revoked", variant: "destructive" };
    case "submitted":
    case "under_review":
      return pinned
        ? { label: "Pinned", variant: "warning" }
        : { label: "Undecided", variant: "outline" };
  }
}
