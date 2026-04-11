const UNIQUE_VIOLATION = "23505";

export function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;

  // Direct Postgres error (pg driver)
  if ("code" in error && (error as { code: string }).code === UNIQUE_VIOLATION) {
    return true;
  }

  // Drizzle-wrapped error (code is on cause)
  if (
    "cause" in error &&
    typeof (error as { cause: unknown }).cause === "object" &&
    (error as { cause: unknown }).cause !== null
  ) {
    const cause = (error as { cause: { code?: string } }).cause;
    if (cause.code === UNIQUE_VIOLATION) return true;
  }

  return false;
}
