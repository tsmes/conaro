import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Curator's Canvas badge — pill-shaped with uppercase tracked label. Used
// extensively for application statuses and section tags across the app.
// Status variants intentionally use off-palette amber/emerald tones for
// "Under Review" / "Accepted" so they read as distinct semantic states
// against the violet-dominant palette.
const badgeVariants = cva(
  "group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-ring has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 aria-invalid:ring-2 aria-invalid:ring-destructive [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary/10 text-primary [a]:hover:bg-primary/15",
        secondary:
          "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 [a]:hover:bg-amber-200",
        success:
          "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 [a]:hover:bg-emerald-200",
        destructive:
          "bg-tertiary-container text-on-tertiary-container [a]:hover:brightness-95",
        outline:
          "border border-border text-foreground [a]:hover:bg-muted",
        ghost:
          "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
