import { cn } from "@/lib/utils";
import { pickCoverGradient } from "@/lib/landing/cover-gradient";
import { monthAbbrNo } from "@/lib/utils/format-date-no";
import { storage } from "@/lib/storage";

export interface EventCoverProps {
  conventionId: string;
  conventionName: string;
  logoPath: string | null;
  eventStartDate: string;
  variant: "card" | "hero";
  className?: string;
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

function dateStamp(iso: string): { month: string; day: string } {
  // Parse the date component directly so we don't shift across time zones.
  const [, , dayStr] = iso.split("-");
  return {
    month: monthAbbrNo(iso),
    day: String(Number.parseInt(dayStr ?? "1", 10)),
  };
}

// Cover rail for event cards + hero card. Shows the convention's logo when
// available; otherwise falls back to a deterministic gradient derived from
// the convention id, overlaid with the convention's initials.
export function EventCover({
  conventionId,
  conventionName,
  logoPath,
  eventStartDate,
  variant,
  className,
}: EventCoverProps) {
  const stamp = dateStamp(eventStartDate);
  const hasLogo = Boolean(logoPath);
  const gradientClass = hasLogo ? null : pickCoverGradient(conventionId);
  const bgStyle =
    hasLogo && logoPath
      ? {
          backgroundImage: `url(${storage.getUrl(logoPath)})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }
      : undefined;

  const layoutClass =
    variant === "card"
      ? "hidden sm:flex w-[168px] shrink-0 flex-col justify-between p-5"
      : "min-h-[180px] flex flex-col justify-between p-5";

  return (
    <div
      data-testid="event-cover"
      data-variant={variant}
      data-has-logo={hasLogo ? "true" : "false"}
      className={cn(
        "relative text-white",
        gradientClass,
        layoutClass,
        className
      )}
      style={bgStyle}
    >
      {hasLogo && (
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-black/60"
        />
      )}
      <div className="relative flex items-center justify-between">
        <div className="grid size-9 place-items-center rounded-lg bg-black/30 text-xs font-bold tracking-tight backdrop-blur-sm">
          {initialsFor(conventionName)}
        </div>
        {variant === "hero" && (
          <span className="rounded-full border border-white/25 bg-black/25 px-2 py-0.5 text-[10px] font-bold tracking-[0.12em] uppercase">
            Next up
          </span>
        )}
      </div>
      <div className="relative">
        <div className="text-[10.5px] font-bold tracking-[0.14em] uppercase opacity-85">
          {stamp.month}
        </div>
        <div
          className={cn(
            "font-heading font-extrabold leading-none tracking-[-0.03em]",
            variant === "card" ? "text-[36px]" : "text-[40px]"
          )}
        >
          {stamp.day}
        </div>
      </div>
    </div>
  );
}
