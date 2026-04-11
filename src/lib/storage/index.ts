import { LocalStorageAdapter } from "./local";
import type { StorageAdapter } from "./types";

export type { StorageAdapter };

export const storage: StorageAdapter = new LocalStorageAdapter();
