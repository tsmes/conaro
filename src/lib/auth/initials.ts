// Derive a two-character initials token for avatar fallbacks.
// Rules:
//  - If the user has a displayable name, take the first letter of each of the
//    first two whitespace-separated tokens.
//  - Otherwise fall back to the first letter of the email's local part.
//  - If neither is present, return "?" so the avatar still renders something.
export function initialsFor({
  name,
  email,
}: {
  name?: string | null;
  email?: string | null;
}): string {
  if (name && name.trim().length > 0) {
    const parts = name.trim().split(/\s+/).slice(0, 2);
    const letters = parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
    if (letters.length > 0) return letters;
  }
  if (email && email.length > 0) {
    const local = email.split("@")[0];
    if (local && local.length > 0) return local[0].toUpperCase();
  }
  return "?";
}
