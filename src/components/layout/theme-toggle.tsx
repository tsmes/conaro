"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Theme switcher used by both PublicShell and AuthShell. Renders a
// placeholder-sized div during SSR so the icon can hydrate to the resolved
// theme without a mismatch warning.
export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // The shadcn / next-themes canonical pattern — flipping a mounted flag
    // in an effect is how we gate rendering until we know the resolved theme
    // on the client. The synchronous setState warning is expected here; no
    // cascading render occurs because the component body short-circuits to
    // the placeholder on the pre-mount render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) {
    // Same footprint as the Button size="icon" (size-8), but nothing renders
    // inside until the client theme is known. Avoids the flicker of the
    // wrong icon on first paint.
    return <div className="size-8" aria-hidden />;
  }

  const effective = theme === "system" ? resolvedTheme : theme;
  const Icon =
    theme === "system" ? Monitor : effective === "dark" ? Moon : Sun;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={(props) => (
          <Button
            {...props}
            variant="ghost"
            size="icon"
            aria-label="Toggle theme"
          >
            <Icon className="size-4" />
          </Button>
        )}
      />
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="size-4" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="size-4" />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <Monitor className="size-4" />
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
