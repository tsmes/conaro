import fs from "fs/promises";
import path from "path";
import type { StorageAdapter } from "./types";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");

export class LocalStorageAdapter implements StorageAdapter {
  async upload(key: string, data: Buffer): Promise<void> {
    const filePath = path.join(UPLOADS_DIR, key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, data);
  }

  async copy(fromKey: string, toKey: string): Promise<void> {
    const fromPath = path.join(UPLOADS_DIR, fromKey);
    const toPath = path.join(UPLOADS_DIR, toKey);
    await fs.mkdir(path.dirname(toPath), { recursive: true });
    await fs.copyFile(fromPath, toPath);
  }

  async delete(key: string): Promise<void> {
    const filePath = path.join(UPLOADS_DIR, key);
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
