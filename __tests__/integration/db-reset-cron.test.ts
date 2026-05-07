import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock the four seed runners so the test exercises the route's auth /
// guard / dispatch logic without ever touching the DB or filesystem.
// vi.hoisted ensures these vi.fn() instances are constructed before
// the hoisted vi.mock calls reference them.
const {
  runResetSeedDataMock,
  runSeedConventionsMock,
  runSeedArtistsMock,
  runSeedApplicationsMock,
} = vi.hoisted(() => ({
  runResetSeedDataMock: vi.fn().mockResolvedValue({
    deleted: 0,
    total: 0,
    emails: [],
  }),
  runSeedConventionsMock: vi.fn().mockResolvedValue({
    manifests: 0,
    organizersCreated: 0,
    conventionsCreated: 0,
    eventsUpserted: 0,
    assetsUploaded: 0,
    guestsSeeded: 0,
    programmeItemsSeeded: 0,
  }),
  runSeedArtistsMock: vi.fn().mockResolvedValue({
    total: 0,
    created: 0,
    existing: 0,
    portfoliosSeeded: 0,
    imagesUploaded: 0,
  }),
  runSeedApplicationsMock: vi.fn().mockResolvedValue({
    eventsSeeded: 0,
    alreadyPresent: 0,
    newlyCreated: 0,
    byStatus: { submitted: 0, under_review: 0, accepted: 0, rejected: 0 },
    imagesCopied: 0,
    artistsCreatedOnTheFly: 0,
  }),
}));

vi.mock("../../scripts/seed-reset", () => ({
  runResetSeedData: runResetSeedDataMock,
}));
vi.mock("../../scripts/seed-conventions", () => ({
  runSeedConventions: runSeedConventionsMock,
}));
vi.mock("../../scripts/seed-artists", () => ({
  runSeedArtists: runSeedArtistsMock,
}));
vi.mock("../../scripts/seed-applications", () => ({
  runSeedApplications: runSeedApplicationsMock,
}));

import { POST } from "@/app/api/cron/db-reset/route";

const RESET_SECRET = "test-reset-secret";

function makeRequest(authHeader?: string): NextRequest {
  const headers = new Headers();
  if (authHeader) headers.set("authorization", authHeader);
  return new NextRequest("http://localhost:3000/api/cron/db-reset", {
    method: "POST",
    headers,
  });
}

// Wait long enough for the route's fire-and-forget background work to
// resolve. The mocked runners resolve synchronously on the
// microtask queue, so a single setImmediate hop is sufficient.
function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

describe("cron POST /api/cron/db-reset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // ENABLE_DB_RESET is checked first by the route, so most tests
    // need it set to "true" to exercise the auth path. Tests that
    // verify the disabled-state behavior override it.
    vi.stubEnv("CRON_RESET_SECRET", RESET_SECRET);
    vi.stubEnv("ENABLE_DB_RESET", "true");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 403 when ENABLE_DB_RESET is not 'true' (checked before auth)", async () => {
    vi.stubEnv("ENABLE_DB_RESET", "false");
    const response = await POST(makeRequest(`Bearer ${RESET_SECRET}`));
    expect(response.status).toBe(403);
    expect(runResetSeedDataMock).not.toHaveBeenCalled();
  });

  it("returns 403 even with a wrong bearer when disabled (no auth oracle)", async () => {
    vi.stubEnv("ENABLE_DB_RESET", "false");
    const response = await POST(makeRequest("Bearer wrong"));
    expect(response.status).toBe(403);
    expect(runResetSeedDataMock).not.toHaveBeenCalled();
  });

  it("returns 500 when CRON_RESET_SECRET is empty", async () => {
    vi.stubEnv("CRON_RESET_SECRET", "");
    const response = await POST(makeRequest(`Bearer ${RESET_SECRET}`));
    expect(response.status).toBe(500);
    expect(runResetSeedDataMock).not.toHaveBeenCalled();
  });

  it("returns 401 without authorization header", async () => {
    const response = await POST(makeRequest());
    expect(response.status).toBe(401);
    expect(runResetSeedDataMock).not.toHaveBeenCalled();
  });

  it("returns 401 with wrong bearer", async () => {
    const response = await POST(makeRequest("Bearer wrong"));
    expect(response.status).toBe(401);
    expect(runResetSeedDataMock).not.toHaveBeenCalled();
  });

  it("returns 202 and dispatches the four seed phases in order when enabled", async () => {
    const response = await POST(makeRequest(`Bearer ${RESET_SECRET}`));
    expect(response.status).toBe(202);

    // setImmediate resolves after the current macrotask, draining
    // all pending microtasks regardless of await-chain depth.
    await flushMicrotasks();

    expect(runResetSeedDataMock).toHaveBeenCalledTimes(1);
    expect(runSeedConventionsMock).toHaveBeenCalledTimes(1);
    expect(runSeedArtistsMock).toHaveBeenCalledTimes(1);
    expect(runSeedApplicationsMock).toHaveBeenCalledTimes(1);

    // Verify dispatch order via vitest's invocation call order.
    const order = [
      runResetSeedDataMock.mock.invocationCallOrder[0],
      runSeedConventionsMock.mock.invocationCallOrder[0],
      runSeedArtistsMock.mock.invocationCallOrder[0],
      runSeedApplicationsMock.mock.invocationCallOrder[0],
    ];
    const sorted = [...order].sort((a, b) => a - b);
    expect(order).toEqual(sorted);

    // Verify the route forwards the expected option shapes.
    expect(runSeedConventionsMock).toHaveBeenCalledWith(
      expect.objectContaining({ writeCredentialsFile: false })
    );
    expect(runSeedArtistsMock).toHaveBeenCalledWith(
      expect.objectContaining({ count: 100, withPortfolios: true })
    );
  });

  it("aborts the chain and logs the failing phase when a phase rejects", async () => {
    runSeedConventionsMock.mockRejectedValueOnce(new Error("boom"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await POST(makeRequest(`Bearer ${RESET_SECRET}`));
    expect(response.status).toBe(202);

    await flushMicrotasks();

    // Reset ran first (succeeds), conventions failed, downstream
    // phases must not be invoked.
    expect(runResetSeedDataMock).toHaveBeenCalledTimes(1);
    expect(runSeedConventionsMock).toHaveBeenCalledTimes(1);
    expect(runSeedArtistsMock).not.toHaveBeenCalled();
    expect(runSeedApplicationsMock).not.toHaveBeenCalled();

    const errorMessages = errorSpy.mock.calls.map((args) =>
      args.map(String).join(" ")
    );
    expect(
      errorMessages.some((msg) =>
        msg.includes("phase=conventions failed")
      )
    ).toBe(true);
    expect(
      errorMessages.some((msg) =>
        /\[db-reset\] aborted phase=conventions ms=\d+/.test(msg)
      )
    ).toBe(true);

    errorSpy.mockRestore();
  });
});
