import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Conaro — for conventions",
  description:
    "Run your artist alley without the spreadsheet chaos. Conaro replaces the form, the spreadsheet, the email blasts, and the floor plan you redrew six times.",
};

const FEATURES = [
  {
    n: "01",
    title: "You pick the artists, not a jury.",
    body: "Browse every applicant in a gallery or table. Pin the ones you want, accept in bulk. No scoring, no sub-committees, no consensus rounds — your alley, your call.",
  },
  {
    n: "02",
    title: "A floor plan that's actually a floor plan.",
    body: "Drag artists onto stands. See power outlets, table sizes, and assistant fees at a glance. Send the whole layout to artists with one button.",
  },
  {
    n: "03",
    title: "Tell everyone at once.",
    body: "Mass-message accepted artists, the waitlist, or the whole roster. Reusable templates for confirmations, deadlines, and last-minute changes — without copy-pasting from the family Gmail.",
  },
  {
    n: "04",
    title: "You're in the listings, free.",
    body: "Every event you create shows up in Conaro's public calendar — discoverable by con-goers and artists looking for their next show. No extra step.",
  },
];

function ScribbleWaves({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      className={`pointer-events-none absolute opacity-70 [&_path]:fill-none [&_path]:stroke-rose-700 [&_path]:[stroke-linecap:round] [&_path]:[stroke-linejoin:round] [&_path]:[stroke-width:2.4] dark:[&_path]:stroke-rose-300 ${className ?? ""}`}
    >
      <path d="M10 50 Q30 10 50 50 T90 50" />
      <path d="M20 70 Q40 30 60 70" />
    </svg>
  );
}

function ScribbleDiagonals({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      className={`pointer-events-none absolute opacity-60 [&_path]:fill-none [&_path]:stroke-primary [&_path]:[stroke-linecap:round] [&_path]:[stroke-linejoin:round] [&_path]:[stroke-width:2.4] ${className ?? ""}`}
    >
      <path d="M20 80 L80 20" />
      <path d="M30 80 L80 30" />
      <path d="M40 80 L80 40" />
    </svg>
  );
}

function ScribbleArc({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      className={`pointer-events-none absolute opacity-30 [&_path]:fill-none [&_path]:stroke-primary [&_path]:[stroke-linecap:round] [&_path]:[stroke-linejoin:round] [&_path]:[stroke-width:2.4] ${className ?? ""}`}
    >
      <path d="M10 90 Q50 10 90 90" />
      <path d="M20 90 Q50 30 80 90" />
      <path d="M30 90 Q50 50 70 90" />
    </svg>
  );
}

function PrimaryUnderlineWave({ children }: { children: React.ReactNode }) {
  // Wavy underline beneath an italic word. Stroke flips dark/light by
  // swapping the inline SVG via CSS background-image (purple in light,
  // lavender in dark), matching the design.
  return (
    <span className="relative inline-block italic">
      {children}
      <span
        aria-hidden
        className="absolute -bottom-[0.18em] -left-[2%] -right-[2%] block h-[0.36em] bg-no-repeat [background-size:100%_100%] dark:hidden"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 16'><path d='M2 8 Q15 2 30 8 T58 8 T86 8 T118 8' fill='none' stroke='%236a37d4' stroke-width='3' stroke-linecap='round'/></svg>\")",
        }}
      />
      <span
        aria-hidden
        className="absolute -bottom-[0.18em] -left-[2%] -right-[2%] hidden h-[0.36em] bg-no-repeat [background-size:100%_100%] dark:block"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 16'><path d='M2 8 Q15 2 30 8 T58 8 T86 8 T118 8' fill='none' stroke='%23c4a5ff' stroke-width='3' stroke-linecap='round'/></svg>\")",
        }}
      />
    </span>
  );
}

function AudienceChip() {
  return (
    <span className="mx-auto inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-[11px] font-semibold text-muted-foreground">
      <span className="size-1.5 rounded-full bg-rose-700 dark:bg-rose-300" />
      For artist alley organizers
    </span>
  );
}

export default function ForConventionsPage() {
  return (
    <div className="-mt-[1px] flex flex-col bg-[radial-gradient(circle_at_1px_1px,rgba(0,0,0,0.04)_1px,transparent_0)] bg-[size:4px_4px] dark:bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.04)_1px,transparent_0)]">
      {/* Hero */}
      <section className="relative pb-10 pt-12 sm:pb-16 sm:pt-20">
        <ScribbleWaves className="left-2 top-10 hidden h-24 w-24 sm:left-8 sm:block" />
        <ScribbleDiagonals className="right-4 top-24 hidden h-20 w-20 sm:block" />
        <div className="mx-auto max-w-[920px] px-4 text-center sm:px-6">
          <div className="mb-6">
            <AudienceChip />
          </div>
          <h1 className="font-serif text-[40px] font-medium leading-[1.02] tracking-[-0.025em] text-foreground sm:text-[64px]">
            Run your artist alley
            <br />
            without the{" "}
            <PrimaryUnderlineWave>spreadsheet</PrimaryUnderlineWave> chaos.
          </h1>
          <p className="mx-auto mt-6 max-w-[640px] text-[16px] leading-relaxed text-muted-foreground sm:mt-7 sm:text-[19px]">
            Conaro replaces the Google Form, the spreadsheet, the email blasts,
            and the floor plan you redrew six times. Built for the people who
            actually pick the artists.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:mt-10">
            <Button
              size="lg"
              nativeButton={false}
              render={
                <Link href="/register/organizer">
                  Create account
                  <ArrowRight className="size-4" />
                </Link>
              }
            />
            <Link
              href="/"
              className="group flex items-center gap-1 text-[14px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              See an example event{" "}
              <span className="transition-transform group-hover:translate-x-1">
                →
              </span>
            </Link>
          </div>
          <p className="mt-4 font-mono text-[12px] text-muted-foreground">
            Free during beta · No card needed
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto w-full max-w-[1040px] px-4 py-12 sm:px-6 sm:py-20">
        <div className="grid gap-x-10 gap-y-12 sm:grid-cols-2 sm:gap-y-16">
          {FEATURES.map((f) => (
            <div key={f.n}>
              <div className="mb-3 font-serif text-[28px] italic font-medium text-rose-700 dark:text-rose-300">
                {f.n}
              </div>
              <h2 className="mb-3 font-serif text-[24px] font-medium leading-[1.15] text-foreground sm:text-[28px]">
                {f.title}
              </h2>
              <p className="text-[15px] leading-relaxed text-muted-foreground">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="mx-auto w-full max-w-[920px] px-4 pb-20 sm:px-6 sm:pb-32">
        <div className="relative overflow-hidden rounded-[24px] border border-border bg-card p-8 text-center sm:p-12">
          <ScribbleArc className="-right-2 -top-2 h-32 w-32" />
          <h2 className="font-serif text-[28px] font-medium leading-[1.05] text-foreground sm:text-[40px]">
            Set up your event in{" "}
            <span className="italic">an evening</span>.
          </h2>
          <p className="mx-auto mt-4 max-w-[520px] text-[15px] text-muted-foreground sm:text-[16px]">
            Bring last year&apos;s artist list if you want — we&apos;ll import
            it. Otherwise, start fresh.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Button
              size="lg"
              nativeButton={false}
              render={
                <Link href="/register/organizer">
                  Create account
                  <ArrowRight className="size-4" />
                </Link>
              }
            />
            <a
              href="mailto:hello@conaro.app"
              className="text-[14px] font-semibold text-muted-foreground hover:text-foreground"
            >
              Or talk to us first →
            </a>
          </div>
        </div>
      </section>

      {/* Page-scoped footer */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-3 px-4 py-8 text-[12px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="font-mono">conaro · curator&apos;s canvas</div>
          <div className="flex items-center gap-5">
            <Link href="/" className="hover:text-foreground">
              Browse events
            </Link>
            <Link href="/for-artists" className="hover:text-foreground">
              For artists
            </Link>
            <a
              href="mailto:hello@conaro.app"
              className="hover:text-foreground"
            >
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
