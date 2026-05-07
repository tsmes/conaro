import { LocalStorageAdapter } from "./local";
import { R2StorageAdapter } from "./r2";
import type { StorageAdapter } from "./types";

export type { StorageAdapter };

function selectAdapter(): StorageAdapter {
  // `||` (not `??`) so an empty-string env var is treated the same
  // as unset. Some hosting platforms surface unset variables as
  // empty strings rather than truly absent.
  const driver = process.env.STORAGE_DRIVER || "local";
  switch (driver) {
    case "local":
      return new LocalStorageAdapter();
    case "r2":
      return new R2StorageAdapter();
    default:
      throw new Error(
        `Unknown STORAGE_DRIVER: "${driver}". Expected "local" or "r2".`
      );
  }
}

export const storage: StorageAdapter = selectAdapter();
