import Link from "next/link";
import {
  Palette,
  CalendarDays,
  UserCircle,
  Search,
  Send,
  PlusSquare,
  SlidersHorizontal,
  ClipboardCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { HomepageFooter } from "@/components/layout/homepage-footer";

// Determine the destination + label for the two hero CTA buttons based on
// session state. Logged-out users hit registration; logged-in users get a
// useful link into their authenticated surface so the homepage isn't
// wasted real estate after login.
function ctaForRole(role: "artist" | "organizer" | undefined): {
  artistHref: string;
  artistLabel: string;
  organizerHref: string;
  organizerLabel: string;
  finalLeftHref: string;
  finalLeftLabel: string;
} {
  if (role === "artist") {
    return {
      artistHref: "/dashboard",
      artistLabel: "Go to Dashboard",
      organizerHref: "/dashboard",
      organizerLabel: "Go to Dashboard",
      finalLeftHref: "/dashboard",
      finalLeftLabel: "Go to Dashboard",
    };
  }
  if (role === "organizer") {
    return {
      artistHref: "/conventions/manage",
      artistLabel: "Manage Conventions",
      organizerHref: "/conventions/manage",
      organizerLabel: "Manage Conventions",
      finalLeftHref: "/conventions/manage",
      finalLeftLabel: "Manage Conventions",
    };
  }
  return {
    artistHref: "/register/artist",
    artistLabel: "Join as Creator",
    organizerHref: "/register/organizer",
    organizerLabel: "Manage Events",
    finalLeftHref: "/register/artist",
    finalLeftLabel: "Get Started",
  };
}

function StepRow({
  Icon,
  title,
  description,
}: {
  Icon: typeof Palette;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-6">
      <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-card shadow-gallery">
        <Icon className="size-6 text-primary" />
      </div>
      <div>
        <h4 className="font-heading text-lg font-bold tracking-tight">{title}</h4>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}

export function HomepageView({
  role,
}: {
  role?: "artist" | "organizer";
}) {
  const cta = ctaForRole(role);

  return (
    <>
      {/* Section A — Hero (left-aligned per the no-centralization rule) */}
      <section className="mx-auto max-w-7xl px-6 pt-32 pb-24 md:px-8">
        <div className="max-w-3xl">
          <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
            The Digital Curator
          </span>
          <h1 className="mt-4 font-heading text-5xl font-extrabold leading-[1.05] tracking-tighter text-foreground md:text-display-lg">
            Apply to conventions.{" "}
            <span className="italic text-primary">Once.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-xl leading-relaxed text-muted-foreground">
            Build your profile once, apply everywhere. The central hub for
            artists and convention organizers to connect without the paperwork
            friction.
          </p>
        </div>
      </section>

      {/* Section B — Two CTA bento cards */}
      <section className="mx-auto max-w-7xl px-6 pb-32 md:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* Artist card — light */}
          <div className="relative overflow-hidden rounded-3xl bg-card p-12 shadow-gallery transition-transform hover:scale-[1.01]">
            <div
              aria-hidden
              className="pointer-events-none absolute -top-20 -right-20 size-64 rounded-full bg-primary/5 blur-3xl"
            />
            <div className="relative z-10 flex h-full flex-col">
              <Palette className="mb-8 size-12 text-primary" />
              <h2 className="font-heading text-3xl font-bold tracking-tight">
                I&apos;m an Artist
              </h2>
              <p className="mt-4 mb-12 text-lg text-muted-foreground">
                Join as a creator and simplify your applications. Stop
                re-uploading your portfolio for every single event.
              </p>
              <div className="mt-auto">
                <Button
                  size="lg"
                  nativeButton={false}
                  render={<Link href={cta.artistHref}>{cta.artistLabel}</Link>}
                />
              </div>
            </div>
          </div>

          {/* Organizer card — dark inverted */}
          <div className="relative overflow-hidden rounded-3xl bg-foreground p-12 text-background transition-transform hover:scale-[1.01]">
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-20 -right-20 size-80 rounded-full bg-background/5 blur-3xl"
            />
            <div className="relative z-10 flex h-full flex-col">
              <CalendarDays className="mb-8 size-12 text-primary-container" />
              <h2 className="font-heading text-3xl font-bold tracking-tight">
                I&apos;m an Organizer
              </h2>
              <p className="mt-4 mb-12 text-lg text-background/70">
                Manage your events and review artists with ease. A streamlined
                dashboard for selecting the best talent.
              </p>
              <div className="mt-auto">
                <Link
                  href={cta.organizerHref}
                  className="inline-flex h-12 items-center justify-center rounded-[10px] bg-card px-8 text-base font-semibold tracking-tight text-foreground transition-all hover:brightness-95"
                >
                  {cta.organizerLabel}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section C — "Designed for Focus" 3-step explainer */}
      <section className="bg-secondary py-32">
        <div className="mx-auto max-w-7xl px-6 md:px-8">
          <div className="mb-20 text-center">
            <h2 className="font-heading text-4xl font-extrabold tracking-tight md:text-display-md">
              Designed for Focus
            </h2>
            <div className="mx-auto mt-6 h-1.5 w-24 rounded-full bg-primary" />
          </div>
          <div className="grid grid-cols-1 gap-16 lg:grid-cols-2 lg:gap-24">
            <div>
              <h3 className="mb-12 flex items-center gap-4 font-heading text-2xl font-bold tracking-tight">
                <span className="flex size-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  1
                </span>
                For Artists
              </h3>
              <div className="space-y-12">
                <StepRow
                  Icon={UserCircle}
                  title="Profile"
                  description="Create a comprehensive artist portfolio with your best work, socials, and legal details once."
                />
                <StepRow
                  Icon={Search}
                  title="Browse"
                  description="Explore a curated directory of upcoming conventions and events."
                />
                <StepRow
                  Icon={Send}
                  title="Apply"
                  description="Submit your application with a single click. No forms, no repetitive uploads, no hassle."
                />
              </div>
            </div>
            <div>
              <h3 className="mb-12 flex items-center gap-4 font-heading text-2xl font-bold tracking-tight">
                <span className="flex size-10 items-center justify-center rounded-full bg-foreground text-sm font-bold text-background">
                  2
                </span>
                For Organizers
              </h3>
              <div className="space-y-12">
                <StepRow
                  Icon={PlusSquare}
                  title="Create"
                  description="Launch your convention page in minutes. List dates, booth details, and requirements."
                />
                <StepRow
                  Icon={SlidersHorizontal}
                  title="Configure"
                  description="Set up the application fields, helper limits, and deadlines that fit your event."
                />
                <StepRow
                  Icon={ClipboardCheck}
                  title="Review"
                  description="Review applicants in a unified view. Compare portfolios and send decisions in one place."
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section D — Final CTA */}
      <section className="bg-background py-32 md:py-40">
        <div className="mx-auto max-w-7xl px-6 text-center md:px-8">
          <div className="inline-block rounded-full bg-primary/10 px-6 py-2 text-xs font-bold uppercase tracking-widest text-primary">
            Ready to start?
          </div>
          <h2 className="mx-auto mt-8 max-w-4xl font-heading text-4xl font-extrabold leading-tight tracking-tighter md:text-display-lg">
            Spend more time creating, less time applying.
          </h2>
          <div className="mt-12 flex flex-col items-center justify-center gap-4 md:flex-row md:gap-6">
            <Button
              size="lg"
              nativeButton={false}
              render={<Link href={cta.finalLeftHref}>{cta.finalLeftLabel}</Link>}
            />
            <Button
              variant="outline"
              size="lg"
              nativeButton={false}
              render={<Link href="/conventions">View Our Directory</Link>}
            />
          </div>
        </div>
      </section>

      <HomepageFooter />
    </>
  );
}
