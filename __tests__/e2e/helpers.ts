import crypto from "node:crypto";

export { cleanDatabase } from "../helpers/db";

export function uniqueEmail(prefix: string): string {
  const suffix = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  return `${prefix}-${suffix}@conaro.test`;
}
