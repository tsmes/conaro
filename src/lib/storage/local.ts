import fs from "fs/promises";
import path from "path";
import type { StorageAdapter } from "./types";
import { resolveWithinDir } from "./safe-path";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");

// Resolve a storage key to an absolute path inside UPLOADS_DIR, rejecting
// any key that would escape the directory. Keys are server-generated
// today, so this is defense-in-depth rather than a live exploit fix.
function resolveKey(key: string): string {
  const filePath = resolveWithinDir(UPLOADS_DIR, key);
  if (!filePath) {
    throw new Error(`Invalid storage key: ${key}`);
  }
  return filePath;
}

export class LocalStorageAdapter implements StorageAdapter {
  async upload(key: string, data: Buffer): Promise<void> {
    const filePath = resolveKey(key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, data);
  }

  async copy(fromKey: string, toKey: string): Promise<void> {
    const fromPath = resolveKey(fromKey);
    const toPath = resolveKey(toKey);
    await fs.mkdir(path.dirname(toPath), { recursive: true });
    await fs.copyFile(fromPath, toPath);
  }

  async delete(key: string): Promise<void> {
    const filePath = resolveKey(key);
    try {
      await fs.unlink(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }

  getUrl(key: string): string {
    return `/api/uploads/${key}`;
  }
}
