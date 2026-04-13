import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
        Art Apply
      </h1>
      <p className="mt-4 max-w-lg text-lg text-muted-foreground">
        The platform for artists and conventions. Build your profile once, apply
        everywhere with a single click.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/register/artist"
          className={cn(buttonVariants({ size: "lg" }))}
        >
          I&apos;m an Artist
        </Link>
        <Link
          href="/register/organizer"
          className={cn(buttonVariants({ size: "lg", variant: "outline" }))}
        >
          I organize Conventions
        </Link>
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="underline underline-offset-4">
          Log in
        </Link>
      </p>
    </div>
  );
}
