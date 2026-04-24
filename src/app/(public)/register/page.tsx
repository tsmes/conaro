import Link from "next/link";
import { ArrowRight, Palette, Building2 } from "lucide-react";
import { Card } from "@/components/ui/card";

// Drop: "Help Center" link and "Contact Support" CTA from stitch — no
// support page exists yet (PRD cut list).
export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-20 md:px-8">
      <div className="mb-16 text-center">
        <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
          Get started
        </p>
        <h1 className="mt-4 font-heading text-4xl font-extrabold tracking-tight md:text-5xl">
          Join Conaro
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Choose your role to get started with Conaros&apos;s platform.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Link href="/register/artist" className="block">
          <Card interactive className="h-full p-10">
            <div className="mb-6 flex size-12 items-center justify-center rounded-xl bg-primary-container">
              <Palette className="size-6 text-on-primary-container" />
            </div>
            <h2 className="font-heading text-2xl font-bold tracking-tight">
              Artist
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Exhibit your portfolio, track applications for conventions, and
              connect with organizers through a streamlined editorial interface.
            </p>
            <div className="mt-8 flex items-center gap-1 text-sm font-semibold text-primary">
              Create artist profile
              <ArrowRight className="size-4 transition-transform group-hover/card:translate-x-1" />
            </div>
          </Card>
        </Link>
        <Link href="/register/organizer" className="block">
          <Card interactive className="h-full p-10">
            <div className="mb-6 flex size-12 items-center justify-center rounded-xl bg-secondary-container">
              <Building2 className="size-6 text-on-secondary-container" />
            </div>
            <h2 className="font-heading text-2xl font-bold tracking-tight">
              Organizer
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Manage conventions, review submissions, and curate the artists who
              fill your floor.
            </p>
            <div className="mt-8 flex items-center gap-1 text-sm font-semibold text-primary">
              Launch organization
              <ArrowRight className="size-4 transition-transform group-hover/card:translate-x-1" />
            </div>
          </Card>
        </Link>
      </div>
      <p className="mt-12 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-primary underline underline-offset-4"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}
