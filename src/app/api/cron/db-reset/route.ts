import { NextRequest, NextResponse } from "next/server";

import { secureCompare } from "@/lib/auth/secure-compare";
import { runResetSeedData } from "../../../../../scripts/seed-reset";
import { runSeedConventions } from "../../../../../scripts/seed-conventions";
import { runSeedArtists } from "../../../../../scripts/seed-artists";
import { runSeedApplications } from "../../../../../scripts/seed-applications";

// Demo-only endpoint: reads scripts/seed-assets/ from disk via
// process.cwd(). Works on Railway/Railpack today because the runtime
// image keeps the entire repo. If anyone enables Next.js
// `output: 'standalone'`, scripts/seed-assets/ would need to be
// included in the traced output for this route to keep working.
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  // ENABLE_DB_RESET gate goes first so the route is genuinely inert
  // on any service that did not deliberately opt in. If we checked
  // the bearer first, a service that happened to also set
  // CRON_RESET_SECRET (e.g. copy-pasted from another env) would
  // become a token-validation oracle even with the route disabled.
  if (process.env.ENABLE_DB_RESET !== "true") {
    return NextResponse.json(
      {
        error:
          "Disabled. Set ENABLE_DB_RESET=true on this service to enable.",
      },
      { status: 403 }
    );
  }

  const secret = process.env.CRON_RESET_SECRET;
  if (!secret) {
    console.error("[db-reset] CRON_RESET_SECRET not configured");
    return NextResponse.json(
      { error: "Server misconfiguration" },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get("authorization") ?? "";
  if (!secureCompare(authHeader, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fire-and-forget: return 202 immediately, let the seed work
  // continue in the background. cron-job.org's request times out
  // long before a full reset+seed completes (~minutes for image
  // processing). The .catch is defensive: every phase has its own
  // try/catch, but any future refactor introducing work outside
  // those blocks should not become an unhandledRejection.
  runResetAndSeed().catch((err) => {
    console.error("[db-reset] unhandled", err);
  });

  return NextResponse.json({ status: "accepted" }, { status: 202 });
}

async function runResetAndSeed(): Promise<void> {
  const log = (msg: string) => console.log(msg);
  const phases: { name: string; fn: () => Promise<unknown> }[] = [
    {
      name: "reset",
      fn: () => runResetSeedData({ logger: log }),
    },
    {
      name: "conventions",
      fn: () =>
        runSeedConventions({ logger: log, writeCredentialsFile: false }),
    },
    {
      name: "artists",
      fn: () =>
        runSeedArtists({
          count: 100,
          withPortfolios: true,
          logger: log,
        }),
    },
    {
      name: "applications",
      fn: () => runSeedApplications({ logger: log }),
    },
  ];

  const startedAt = Date.now();
  console.log("[db-reset] start");
  for (const phase of phases) {
    const phaseStart = Date.now();
    console.log(`[db-reset] phase=${phase.name} starting`);
    try {
      const result = await phase.fn();
      const phaseMs = Date.now() - phaseStart;
      console.log(
        `[db-reset] phase=${phase.name} done ms=${phaseMs}`,
        result
      );
    } catch (err) {
      const totalMs = Date.now() - startedAt;
      console.error(
        `[db-reset] phase=${phase.name} failed`,
        err
      );
      console.error(`[db-reset] aborted phase=${phase.name} ms=${totalMs}`);
      return;
    }
  }
  const totalMs = Date.now() - startedAt;
  console.log(`[db-reset] complete ms=${totalMs}`);
}
