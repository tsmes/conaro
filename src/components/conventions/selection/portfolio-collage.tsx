/* eslint-disable @next/next/no-img-element */
import { cn } from "@/lib/utils";

interface PortfolioCollageImage {
  id: string;
  url: string;
  caption?: string | null;
}

interface PortfolioCollageProps {
  images: PortfolioCollageImage[];
  displayName: string;
  className?: string;
}

export function PortfolioCollage({
  images,
  displayName,
  className,
}: PortfolioCollageProps) {
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
      {cells.map((image, index) => {
        const caption = image.caption?.trim();
        const altText =
          caption && caption.length > 0
            ? caption
            : `Portfolio image ${index + 1} from ${displayName}`;
        const heroCell = index === 0 && cells.length > 1;
        return (
          <figure
            key={image.id}
            className={cn(
              "relative overflow-hidden",
              heroCell && "col-span-2 row-span-2"
            )}
          >
            <img
              src={image.url}
              alt={altText}
              loading="lazy"
              className="h-full w-full object-cover"
            />
            {caption && caption.length > 0 && (
              <figcaption
                className={cn(
                  "pointer-events-none absolute inset-x-0 bottom-0 line-clamp-2 bg-gradient-to-t from-black/70 via-black/40 to-transparent px-2 py-1 text-[10px] font-medium leading-tight text-white",
                  heroCell && "text-[11px]"
                )}
              >
                {caption}
              </figcaption>
            )}
          </figure>
        );
      })}
    </div>
  );
}
