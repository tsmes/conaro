import Link from "next/link";
import { ArrowRight, Heart } from "lucide-react";

import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Conaro — for artists",
  description:
    "Apply to a hundred conventions with one click. Build your artist profile once and reuse it for every open call.",
};

const FEATURES = [
  {
    n: "01",
    title: "Your profile is the application.",
    body: "Bio, portfolio, mediums, table preferences, assistants, power needs — fill it in once. Every application uses the same profile, instantly. No more retyping the same artist statement at 11pm before a deadline.",
  },
  {
    n: "02",
    title: "See where every application stands.",
    body: "A pipeline of every con you've applied to: submitted, under review, accepted, waitlisted. No more digging through five organizers' inboxes wondering if you got in.",
  },
  {
    n: "03",
    title: "Reminders before things close.",
    body: "We tell you when applications open, when deadlines loom, and when accepted artists need to confirm. Never miss a window because the organizer's email landed in promotions.",
  },
  {
    n: "04",
    title: "Discover open calls worth your time.",
    body: "Filter by region, dates, table size, and stand fee. Skip the cons that aren't right for you, find the ones that are.",
  },
];

function ScribbleLeft({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      className={`pointer-events-none absolute opacity-70 [&_path]:fill-none [&_path]:stroke-emerald-600 [&_path]:[stroke-linecap:round] [&_path]:[stroke-linejoin:round] [&_path]:[stroke-width:2.4] dark:[&_path]:stroke-emerald-400 ${className ?? ""}`}
    >
      <path d="M50 10 L50 90" />
      <path d="M30 30 L70 30" />
      <path d="M25 70 L75 70" />
    </svg>
  );
}

function ScribbleRight({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      className={`pointer-events-none absolute opacity-60 [&_path]:fill-none [&_path]:stroke-primary [&_path]:[stroke-linecap:round] [&_path]:[stroke-linejoin:round] [&_path]:[stroke-width:2.4] [&_circle]:fill-none [&_circle]:stroke-primary [&_circle]:[stroke-width:2.4] ${className ?? ""}`}
    >
      <circle cx="50" cy="50" r="30" />
      <path d="M50 35 L50 65 M35 50 L65 50" />
    </svg>
  );
}

function ScribbleHatch({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      className={`pointer-events-none absolute opacity-30 [&_path]:fill-none [&_path]:stroke-emerald-600 [&_path]:[stroke-linecap:round] [&_path]:[stroke-linejoin:round] [&_path]:[stroke-width:2.4] dark:[&_path]:stroke-emerald-400 ${className ?? ""}`}
    >
      <path d="M10 10 L90 90" />
      <path d="M10 30 L70 90" />
      <path d="M30 10 L90 70" />
    </svg>
  );
}

function UnderlineWave({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative inline-block italic">
      {children}
      <span
        aria-hidden
        className="absolute -bottom-[0.18em] -left-[2%] -right-[2%] block h-[0.36em] bg-no-repeat [background-size:100%_100%]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 16'><path d='M2 8 Q15 2 30 8 T58 8 T86 8 T118 8' fill='none' stroke='%2310b981' stroke-width='3' stroke-linecap='round'/></svg>\")",
        }}
      />
    </span>
  );
}

function FreeStamp() {
  return (
    <span className="inline-flex -rotate-3 items-center gap-1.5 rounded-full border-2 border-emerald-600 px-3.5 py-1.5 font-serif italic font-medium text-emerald-700 dark:border-emerald-400 dark:text-emerald-300">
      <Heart className="size-3.5 fill-current" />
      free, forever
    </span>
  );
}

export default function ForArtistsPage() {
  return (
    <div className="-mt-[1px] flex flex-col bg-[radial-gradient(circle_at_1px_1px,rgba(0,0,0,0.04)_1px,transparent_0)] bg-[size:4px_4px] dark:bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.04)_1px,transparent_0)]">
      {/* Hero */}
      <section className="relative pb-10 pt-12 sm:pb-16 sm:pt-20">
        <ScribbleLeft className="left-2 top-10 hidden h-24 w-24 sm:block sm:left-8" />
        <ScribbleRight className="right-4 top-24 hidden h-20 w-20 sm:block" />
        <div className="mx-auto max-w-[920px] px-4 text-center sm:px-6">
          <div className="mb-6">
            <FreeStamp />
          </div>
          <h1 className="font-serif text-[40px] font-medium leading-[1.02] tracking-[-0.025em] text-foreground sm:text-[64px]">
            Apply to a hundred conventions
            <br />
            with <UnderlineWave>one click</UnderlineWave>.
          </h1>
          <p className="mx-auto mt-6 max-w-[640px] text-[16px] leading-relaxed text-muted-foreground sm:mt-7 sm:text-[19px]">
            Build your artist profile once. Apply to any open call without
            re-typing your bio, re-uploading your portfolio, or fishing for the
            right pricing PDF in your downloads folder.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:mt-10">
            <Button
              size="lg"
              nativeButton={false}
              render={
                <Link href="/register/artist">
                  Create account
                  <ArrowRight className="size-4" />
                </Link>
              }
            />
            <Link
              href="/"
              className="group flex items-center gap-1 text-[14px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              Browse open calls first{" "}
              <span className="transition-transform group-hover:translate-x-1">
                →
              </span>
            </Link>
          </div>
          <p className="mt-4 font-mono text-[12px] text-muted-foreground">
            No fees. No commission. Ever.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto w-full max-w-[1040px] px-4 py-12 sm:px-6 sm:py-20">
        <div className="grid gap-x-10 gap-y-12 sm:grid-cols-2 sm:gap-y-16">
          {FEATURES.map((f) => (
            <div key={f.n}>
              <div className="mb-3 font-serif text-[28px] italic font-medium text-emerald-700 dark:text-emerald-400">
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
          <ScribbleHatch className="-left-2 -top-2 h-32 w-32" />
          <h2 className="font-serif text-[28px] font-medium leading-[1.05] text-foreground sm:text-[40px]">
            Stop dreading{" "}
            <span className="italic">application season</span>.
          </h2>
          <p className="mx-auto mt-4 max-w-[520px] text-[15px] text-muted-foreground sm:text-[16px]">
            Set up your profile in fifteen minutes. Apply to your first three
            cons in under five.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Button
              size="lg"
              nativeButton={false}
              render={
                <Link href="/register/artist">
                  Create account
                  <ArrowRight className="size-4" />
                </Link>
              }
            />
            <Link
              href="/"
              className="text-[14px] font-semibold text-muted-foreground hover:text-foreground"
            >
              See what&apos;s open →
            </Link>
          </div>
        </div>
      </section>

      {/* Page-scoped footer (the rest of the app has no footer convention) */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-3 px-4 py-8 text-[12px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="font-mono">conaro · curator&apos;s canvas</div>
          <div className="flex items-center gap-5">
            <Link href="/" className="hover:text-foreground">
              Browse events
            </Link>
            <Link href="/for-conventions" className="hover:text-foreground">
              For conventions
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
