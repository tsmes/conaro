import Link from "next/link";
import { CheckCircle2, Hourglass, Info, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/ui/markdown";
import type { ApplicationStatus } from "@/lib/applications/status-styles";

type StatusVariantKey = "accepted" | "rejected" | "waitlisted" | "default";

interface VariantConfig {
  header: string;
  icon: React.ComponentType<{ className?: string }>;
  card: string;
  iconWrap: string;
  headerText: string;
  fallbackBody: string;
}

const VARIANTS: Record<StatusVariantKey, VariantConfig> = {
  accepted: {
    header: "You're in",
    icon: CheckCircle2,
    card: "border-emerald-300/70 bg-emerald-50 dark:border-emerald-700/50 dark:bg-emerald-950/30",
    iconWrap: "bg-emerald-200/60 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300",
    headerText: "text-emerald-900 dark:text-emerald-100",
    fallbackBody: "Congratulations! Your application has been accepted.",
  },
  waitlisted: {
    header: "You're on the waitlist",
    icon: Hourglass,
    card: "border-amber-300/70 bg-amber-50 dark:border-amber-700/50 dark:bg-amber-950/30",
    iconWrap: "bg-amber-200/60 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300",
    headerText: "text-amber-900 dark:text-amber-100",
    fallbackBody:
      "You're on the waitlist. If a spot opens up, the organizer may offer it to you — we'll let you know.",
  },
  rejected: {
    header: "Results",
    icon: Info,
    card: "border-border bg-muted/40",
    iconWrap: "bg-muted text-muted-foreground",
    headerText: "text-foreground",
    fallbackBody:
      "Thank you for applying. Unfortunately, we can't offer you a spot at this event.",
  },
  default: {
    header: "Your application",
    icon: Info,
    card: "border-border bg-card",
    iconWrap: "bg-muted text-muted-foreground",
    headerText: "text-foreground",
    fallbackBody: "Your application has been reviewed.",
  },
};

function variantKeyFor(status: ApplicationStatus): StatusVariantKey {
  switch (status) {
    case "accepted":
      return "accepted";
    case "rejected":
      return "rejected";
    case "waitlisted":
      return "waitlisted";
    case "submitted":
    case "under_review":
    case "pending":
    case "revoked":
      return "default";
    default: {
      // Compile-time exhaustiveness check: a new ApplicationStatus
      // value will fail typecheck here until a variant is chosen.
      const _exhaustive: never = status;
      void _exhaustive;
      return "default";
    }
  }
}

interface ApplicationStatusCardProps {
  status: ApplicationStatus;
  responseMessage: string | null;
  /** Required when status === "accepted" + hasAssignedTable is true,
   *  used to build the "Show me my table" link target. */
  eventId?: string;
  /** When true (and status === "accepted"), surface a button that
   *  links to the Floor plan tab with `?focus=table` so the canvas
   *  pulses the artist's table on arrival. */
  hasAssignedTable?: boolean;
  /** Trailing content rendered below the message body — typically
   *  the JoinWaitlistButton when status === "rejected" + waitlist
   *  is enabled. */
  children?: React.ReactNode;
}

export function ApplicationStatusCard({
  status,
  responseMessage,
  eventId,
  hasAssignedTable = false,
  children,
}: ApplicationStatusCardProps) {
  const key = variantKeyFor(status);
  const v = VARIANTS[key];
  const Icon = v.icon;

  return (
    <section
      className={cn(
        "rounded-xl border p-6 md:p-8",
        v.card
      )}
    >
      <div className="mb-4 flex items-center gap-3">
        <span
          className={cn(
            "flex size-8 items-center justify-center rounded-full",
            v.iconWrap
          )}
        >
          <Icon className="size-4" />
        </span>
        <h2
          className={cn("text-lg font-semibold tracking-tight", v.headerText)}
        >
          {v.header}
        </h2>
      </div>
      {key === "waitlisted" ? (
        <>
          <p className="text-sm leading-relaxed text-foreground">
            {v.fallbackBody}
          </p>
          {responseMessage && (
            <div className="mt-5 border-t border-border pt-5">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Original message from organizer
              </p>
              <Markdown source={responseMessage} className="text-foreground" />
            </div>
          )}
        </>
      ) : responseMessage ? (
        <Markdown source={responseMessage} className="text-foreground" />
      ) : (
        <p className="text-sm leading-relaxed text-foreground">
          {v.fallbackBody}
        </p>
      )}
      {status === "accepted" && hasAssignedTable && eventId && (
        <div className="mt-5">
          <Button
            variant="default"
            size="sm"
            nativeButton={false}
            render={
              <Link href={`/events/${eventId}/floor-plan?focus=table`}>
                <MapPin className="size-4" />
                Show me my table
              </Link>
            }
          />
        </div>
      )}
      {children}
    </section>
  );
}
