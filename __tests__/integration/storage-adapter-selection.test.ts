import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// The adapter selection runs at module-load time. Each case must
// re-import @/lib/storage with a fresh module registry so the
// selectAdapter() call sees the freshly-stubbed env.
async function loadStorageModule(): Promise<{
  storage: { constructor: { name: string } };
}> {
  vi.resetModules();
  return (await import("@/lib/storage")) as unknown as {
    storage: { constructor: { name: string } };
  };
}

const VALID_R2_ENV = {
  R2_ACCOUNT_ID: "test-account",
  R2_ACCESS_KEY_ID: "test-key-id",
  R2_SECRET_ACCESS_KEY: "test-secret",
  R2_BUCKET: "test-bucket",
  R2_PUBLIC_URL: "https://cdn.test.example",
} as const;

function stubR2Env() {
  for (const [k, v] of Object.entries(VALID_R2_ENV)) {
    vi.stubEnv(k, v);
  }
}

describe("storage adapter selection", () => {
  beforeEach(() => {
    // Default both vars to a clean slate; each case overrides.
    vi.stubEnv("STORAGE_DRIVER", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("defaults to LocalStorageAdapter when STORAGE_DRIVER is unset", async () => {
    vi.stubEnv("STORAGE_DRIVER", "");
    const { storage } = await loadStorageModule();
    expect(storage.constructor.name).toBe("LocalStorageAdapter");
  });

  it("returns LocalStorageAdapter when STORAGE_DRIVER=local", async () => {
    vi.stubEnv("STORAGE_DRIVER", "local");
    const { storage } = await loadStorageModule();
    expect(storage.constructor.name).toBe("LocalStorageAdapter");
  });

  it("returns R2StorageAdapter when STORAGE_DRIVER=r2 and R2 env is configured", async () => {
    vi.stubEnv("STORAGE_DRIVER", "r2");
    stubR2Env();
    const { storage } = await loadStorageModule();
    expect(storage.constructor.name).toBe("R2StorageAdapter");
  });

  it("throws when STORAGE_DRIVER=r2 and an R2 env var is missing", async () => {
    vi.stubEnv("STORAGE_DRIVER", "r2");
    stubR2Env();
    vi.stubEnv("R2_BUCKET", "");
    await expect(loadStorageModule()).rejects.toThrow(/R2_BUCKET/);
  });

  it("throws on an unknown STORAGE_DRIVER value", async () => {
    vi.stubEnv("STORAGE_DRIVER", "s3");
    await expect(loadStorageModule()).rejects.toThrow(
      /Unknown STORAGE_DRIVER: "s3"/
    );
  });
});
