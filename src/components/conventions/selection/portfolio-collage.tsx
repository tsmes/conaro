/* eslint-disable @next/next/no-img-element */
import { cn } from "@/lib/utils";

interface PortfolioCollageProps {
  images: { id: string; url: string }[];
  className?: string;
}

export function PortfolioCollage({ images, className }: PortfolioCollageProps) {
  const cells = images.slice(0, 6);
  return (
    <div
      className={cn(
        "relative grid aspect-[5/4] grid-cols-3 grid-rows-2 gap-[2px] bg-muted",
        className
      )}
    >
      {cells.length === 0 && (
        <div className="col-span-3 row-span-2 grid place-items-center bg-muted text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          No portfolio
        </div>
      )}
      {cells.map((image, index) => (
        <img
          key={image.id}
          src={image.url}
          alt=""
          loading="lazy"
          className={cn(
            "h-full w-full object-cover",
            index === 0 && cells.length > 1 && "col-span-2 row-span-2"
          )}
        />
      ))}
    </div>
  );
}
